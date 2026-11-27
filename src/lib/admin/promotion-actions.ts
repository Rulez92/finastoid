"use server";

// Server Actions for admin Promotions (stockists only). Every action
// re-checks requireRole("admin"), validates input with zod, and writes
// through the cookie-based client so RLS and the storage policies still
// apply (never the service-role key).
//
// Flow: create/update save the text; the banner is uploaded in a separate
// call (uploadPromotionBanner) so a failed upload never loses the text.
// Status: a new promotion is always a draft. Publishing is a separate
// action (setPromotionStatus) and the database refuses it without dates.

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "promotion-banners";
const MAX_BANNER_BYTES = 5 * 1024 * 1024; // matches the bucket

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

const idSchema = z.string().uuid();

const statusSchema = z.enum(["draft", "published", "rewarded"]);

const promotionSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(150),
    description: z.string().trim().max(5000),
    offerType: z.enum([
      "free_tour",
      "cash_prize",
      "bonus",
      "discount",
      "other",
    ]),
    rewardDetails: z.string().trim().max(1000),
    targetValue: z.number().positive("Must be more than 0").nullable(),
    targetUnit: z.enum(["units", "amount"]),
    terms: z.string().trim().max(5000),
    startsAt: z.string().datetime({ offset: true }).nullable(),
    endsAt: z.string().datetime({ offset: true }).nullable(),
  })
  .superRefine((v, ctx) => {
    if (
      v.startsAt &&
      v.endsAt &&
      Date.parse(v.endsAt) <= Date.parse(v.startsAt)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["endsAt"],
        message: "End must be after start",
      });
    }
  });

export type PromotionInput = z.infer<typeof promotionSchema>;

export type ActionResult =
  | { success: true; promotionId?: string }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

function refresh() {
  revalidatePath("/admin/promotions");
  revalidatePath("/stockist/promotions");
}

function toRow(d: PromotionInput) {
  return {
    title: d.title,
    description: d.description,
    offer_type: d.offerType,
    reward_details: d.rewardDetails,
    target_value: d.targetValue,
    target_unit: d.targetUnit,
    terms: d.terms,
    starts_at: d.startsAt,
    ends_at: d.endsAt,
  };
}

// Never trust the browser's file name or MIME type. Keep only safe chars.
function safeName(name: string): string {
  const cleaned = name
    .normalize("NFKD")
    .replace(/[^\w.\- ]+/g, "")
    .replace(/\s+/g, "_")
    .replace(/\.{2,}/g, ".")
    .slice(-100);
  return cleaned || "banner";
}

// Check the real file signature, not just the declared type.
function detectImageType(
  bytes: Uint8Array,
): (typeof ALLOWED_TYPES)[number] | null {
  const startsWith = (sig: number[], offset = 0) =>
    sig.every((b, i) => bytes[offset + i] === b);

  if (startsWith([0x89, 0x50, 0x4e, 0x47])) return "image/png";
  if (startsWith([0xff, 0xd8, 0xff])) return "image/jpeg";
  if (
    startsWith([0x52, 0x49, 0x46, 0x46]) && // RIFF
    startsWith([0x57, 0x45, 0x42, 0x50], 8) // WEBP
  ) {
    return "image/webp";
  }
  return null;
}

// Postgres check-constraint violation (e.g. publishing without dates).
function friendlyDbError(
  error: { code?: string; message: string },
  fallback: string,
): string {
  if (error.code === "23514") {
    return "Set both start and end dates before publishing.";
  }
  return `${fallback}: ${error.message}`;
}

/* ------------------------------------------------------------------ */
/* Create / update                                                      */
/* ------------------------------------------------------------------ */

export async function createPromotion(
  input: PromotionInput,
): Promise<ActionResult> {
  await requireRole("admin");

  const parsed = promotionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<
        string,
        string[]
      >,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("promotions")
    .insert({ ...toRow(parsed.data), status: "draft" })
    .select("id")
    .single();

  if (error || !data) {
    return {
      success: false,
      error: `Could not create promotion: ${error?.message}`,
    };
  }

  refresh();
  return { success: true, promotionId: data.id };
}

export async function updatePromotion(
  id: string,
  input: PromotionInput,
): Promise<ActionResult> {
  await requireRole("admin");

  if (!idSchema.safeParse(id).success) {
    return { success: false, error: "Invalid promotion id." };
  }

  const parsed = promotionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<
        string,
        string[]
      >,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("promotions")
    .update(toRow(parsed.data))
    .eq("id", id);

  if (error) {
    return {
      success: false,
      error: friendlyDbError(error, "Could not update promotion"),
    };
  }

  refresh();
  return { success: true, promotionId: id };
}

/* ------------------------------------------------------------------ */
/* Status: draft <-> published -> rewarded                              */
/* ------------------------------------------------------------------ */

export async function setPromotionStatus(
  id: string,
  status: "draft" | "published" | "rewarded",
): Promise<ActionResult> {
  await requireRole("admin");

  if (!idSchema.safeParse(id).success) {
    return { success: false, error: "Invalid promotion id." };
  }
  if (!statusSchema.safeParse(status).success) {
    return { success: false, error: "Invalid status." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("promotions")
    .update({ status })
    .eq("id", id)
    .select("id");

  if (error) {
    return {
      success: false,
      error: friendlyDbError(error, "Could not change status"),
    };
  }
  if (!data || data.length === 0) {
    return { success: false, error: "Promotion not found." };
  }

  refresh();
  return { success: true };
}

/* ------------------------------------------------------------------ */
/* Delete (promotion + its banner)                                      */
/* ------------------------------------------------------------------ */

export async function deletePromotion(id: string): Promise<ActionResult> {
  await requireRole("admin");

  if (!idSchema.safeParse(id).success) {
    return { success: false, error: "Invalid promotion id." };
  }

  const supabase = await createClient();

  // Read the banner path first; deleting the row does NOT remove the
  // object from Storage.
  const { data: row } = await supabase
    .from("promotions")
    .select("banner_path")
    .eq("id", id)
    .maybeSingle();

  const { data, error } = await supabase
    .from("promotions")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) return { success: false, error: error.message };
  if (!data || data.length === 0) {
    return {
      success: false,
      error: "Nothing was deleted (not found or not allowed).",
    };
  }

  if (row?.banner_path) {
    await supabase.storage.from(BUCKET).remove([row.banner_path as string]); // best effort
  }

  refresh();
  return { success: true };
}

/* ------------------------------------------------------------------ */
/* Banner                                                               */
/* ------------------------------------------------------------------ */

// FormData must contain one entry named "banner". Uploading a new banner
// replaces the old one.
export async function uploadPromotionBanner(
  promotionId: string,
  formData: FormData,
): Promise<ActionResult> {
  await requireRole("admin");

  if (!idSchema.safeParse(promotionId).success) {
    return { success: false, error: "Invalid promotion id." };
  }

  const file = formData.get("banner");
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: "No image selected." };
  }
  if (file.size > MAX_BANNER_BYTES) {
    return { success: false, error: "Banner is larger than 5 MB." };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = detectImageType(bytes);
  if (!mime) {
    return { success: false, error: "Only PNG, JPG or WebP images." };
  }

  const supabase = await createClient();

  const { data: existing, error: loadError } = await supabase
    .from("promotions")
    .select("banner_path")
    .eq("id", promotionId)
    .maybeSingle();

  if (loadError || !existing) {
    return { success: false, error: "Promotion not found." };
  }

  const path = `${promotionId}/${crypto.randomUUID()}-${safeName(file.name)}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: mime, upsert: false });

  if (uploadError) {
    return {
      success: false,
      error: `Could not upload banner: ${uploadError.message}`,
    };
  }

  const { error: updateError } = await supabase
    .from("promotions")
    .update({ banner_path: path })
    .eq("id", promotionId);

  if (updateError) {
    await supabase.storage.from(BUCKET).remove([path]); // roll back
    return {
      success: false,
      error: `Could not save banner: ${updateError.message}`,
    };
  }

  // New banner is saved, now remove the old object (best effort).
  if (existing.banner_path) {
    await supabase.storage.from(BUCKET).remove([existing.banner_path as string]);
  }

  refresh();
  return { success: true, promotionId };
}

export async function removePromotionBanner(
  promotionId: string,
): Promise<ActionResult> {
  await requireRole("admin");

  if (!idSchema.safeParse(promotionId).success) {
    return { success: false, error: "Invalid promotion id." };
  }

  const supabase = await createClient();

  const { data: row, error: loadError } = await supabase
    .from("promotions")
    .select("banner_path")
    .eq("id", promotionId)
    .maybeSingle();

  if (loadError || !row) return { success: false, error: "Promotion not found." };
  if (!row.banner_path) return { success: true, promotionId };

  const { error } = await supabase
    .from("promotions")
    .update({ banner_path: null })
    .eq("id", promotionId);

  if (error) return { success: false, error: error.message };

  await supabase.storage.from(BUCKET).remove([row.banner_path as string]);

  refresh();
  return { success: true, promotionId };
}