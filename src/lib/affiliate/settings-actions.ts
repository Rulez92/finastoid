"use server";

// Server Actions for the affiliate Settings page. Each one:
//   1. re-checks requireRole("affiliate"),
//   2. finds the affiliate by the signed-in user (profile_id = user.id),
//      never by an id sent from the browser,
//   3. validates every input with zod,
//   4. writes through the regular cookie-based client, so RLS and the
//      protect-fields trigger still apply as a second line of defense.
//
// What an affiliate may change: name, phone, country, region and their
// own bank details. Email, status, stockist, notes and commission rate
// are admin-only and are never written here.

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import {
  bankDetailsSchema,
  normalizeAccount,
  normalizeCurrency,
  normalizeSwift,
} from "@/lib/affiliate/bank-validation";

const AVATAR_BUCKET = "affiliate-avatars";
const AVATAR_MAX_BYTES = 2 * 1024 * 1024; // matches the bucket limit

// Check the real file signature, not the type the browser claims.
function detectImageType(
  bytes: Uint8Array,
): { mime: string; ext: string } | null {
  const starts = (sig: number[], offset = 0) =>
    sig.every((b, i) => bytes[offset + i] === b);

  if (starts([0x89, 0x50, 0x4e, 0x47])) return { mime: "image/png", ext: "png" };
  if (starts([0xff, 0xd8, 0xff])) return { mime: "image/jpeg", ext: "jpg" };
  if (starts([0x52, 0x49, 0x46, 0x46]) && starts([0x57, 0x45, 0x42, 0x50], 8)) {
    return { mime: "image/webp", ext: "webp" };
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Types and schemas                                                    */
/* ------------------------------------------------------------------ */

export type ActionResult =
  | { success: true }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

const emptyToNull = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? null : v;

// After the one-time completion, only name and region stay editable.
const profileSchema = z.object({
  region: z.preprocess(emptyToNull, z.string().trim().max(60).nullable()),
});

// The one-time, locked part. SQL validates the same rules again.
const completeProfileSchema = z.object({
  name: z
    .string()
    .transform((v) => v.replace(/\s+/g, " ").trim())
    .pipe(
      z
        .string()
        .min(2, "Enter your full name (2 to 60 characters)")
        .max(60, "Enter your full name (2 to 60 characters)"),
    ),
  phone: z
    .string()
    .trim()
    .regex(/^\+[1-9][0-9]{6,14}$/, "Enter a valid phone number"),
  countryCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, "Select your country"),
  countryName: z.string().trim().min(1, "Select your country").max(60),
});

export type ProfileInput = z.input<typeof profileSchema>;

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

function flatten(error: z.ZodError): Record<string, string[]> {
  return error.flatten().fieldErrors as Record<string, string[]>;
}

// The signed-in affiliate's own row. Only an active affiliate may save.
async function getOwnActiveAffiliate(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("affiliates")
    .select("id, status")
    .eq("profile_id", userId)
    .maybeSingle();

  if (error || !data) return null;
  if (data.status !== "active") return null;
  return data.id as string;
}

/* ------------------------------------------------------------------ */
/* Update profile                                                       */
/* ------------------------------------------------------------------ */

export async function updateMyProfile(input: unknown): Promise<ActionResult> {
  const { user } = await requireRole("affiliate");

  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: flatten(parsed.error),
    };
  }
  const data = parsed.data;

  const affiliateId = await getOwnActiveAffiliate(user.id);
  if (!affiliateId) {
    return { success: false, error: "Your account is not active." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("affiliates")
    .update({
      region: data.region,
    })
    .eq("id", affiliateId);

  if (error) {
    return {
      success: false,
      error: `Could not save your profile: ${error.message}`,
    };
  }

  revalidatePath("/affiliate/settings");
  revalidatePath("/affiliate");
  return { success: true };
}

/* ------------------------------------------------------------------ */
/* Save bank details                                                    */
/* ------------------------------------------------------------------ */

export async function completeMyProfile(input: unknown): Promise<ActionResult> {
  const { user } = await requireRole("affiliate");

  const parsed = completeProfileSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: flatten(parsed.error),
    };
  }
  const d = parsed.data;

  // The database function saves username, phone and country, sets the
  // display currency from the country, and locks them. One call, once.
  const supabase = await createClient();
  const { error } = await supabase.rpc("complete_affiliate_profile", {
    p_name: d.name,
    p_phone: d.phone,
    p_country_code: d.countryCode,
    p_country_name: d.countryName,
  });

  if (error) {
    // P0001 = a message the SQL function raised on purpose (for example
    // "That username is already taken"). Anything else is a real fault.
    return {
      success: false,
      error:
        error.code === "P0001"
          ? error.message
          : "Could not save your profile. Please try again.",
    };
  }

  // Keep the profiles mirror (name in the top bar) in sync. Best effort.
  await supabase.from("profiles").update({ name: d.name }).eq("id", user.id);

  // The currency changes every affiliate page, so refresh the whole area.
  revalidatePath("/affiliate", "layout");
  return { success: true };
}

export async function saveMyBankDetails(input: unknown): Promise<ActionResult> {
  const { user } = await requireRole("affiliate");

  const parsed = bankDetailsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: flatten(parsed.error),
    };
  }
  const data = parsed.data;

  const affiliateId = await getOwnActiveAffiliate(user.id);
  if (!affiliateId) {
    return { success: false, error: "Your account is not active." };
  }

  const supabase = await createClient();

  const { data: existing, error: existingError } = await supabase
    .from("affiliate_bank_details")
    .select("affiliate_id")
    .eq("affiliate_id", affiliateId)
    .maybeSingle();

  if (existingError) {
    return {
      success: false,
      error: `Could not load your bank details: ${existingError.message}`,
    };
  }

  const account = normalizeAccount(data.accountNumberOrIban);

  // A blank account number means "keep the saved one". That is only
  // possible when something is already saved.
  if (!account && !existing) {
    return {
      success: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: {
        accountNumberOrIban: ["Enter an account number or IBAN"],
      },
    };
  }

  const fields = {
    account_holder_name: data.accountHolderName,
    bank_name: data.bankName,
    bank_country: data.bankCountry,
    swift_bic: data.swiftBic ? normalizeSwift(data.swiftBic) : null,
    routing_code: data.routingCode,
    payout_currency: normalizeCurrency(data.payoutCurrency),
  };

  if (existing) {
    const { error } = await supabase
      .from("affiliate_bank_details")
      .update(account ? { ...fields, account_number_or_iban: account } : fields)
      .eq("affiliate_id", affiliateId);

    if (error) {
      return {
        success: false,
        error: `Could not save your bank details: ${error.message}`,
      };
    }
  } else {
    const { error } = await supabase.from("affiliate_bank_details").insert({
      affiliate_id: affiliateId,
      account_number_or_iban: account,
      ...fields,
    });

    if (error) {
      return {
        success: false,
        error: `Could not save your bank details: ${error.message}`,
      };
    }
  }

  revalidatePath("/affiliate/settings");
  return { success: true };
}
/* ------------------------------------------------------------------ */
/* Profile photo                                                        */
/* ------------------------------------------------------------------ */

// FormData must contain one entry named "avatar".
export async function uploadMyAvatar(formData: FormData): Promise<ActionResult> {
  const { user } = await requireRole("affiliate");

  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: "No image selected." };
  }
  if (file.size > AVATAR_MAX_BYTES) {
    return { success: false, error: "The image must be 2 MB or smaller." };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = detectImageType(bytes);
  if (!type) {
    return { success: false, error: "Only PNG, JPG or WebP images are allowed." };
  }

  const supabase = await createClient();

  // Only an active affiliate may change the photo. Read the old path so
  // it can be deleted after the new one is saved.
  const { data: row, error: rowError } = await supabase
    .from("affiliates")
    .select("id, status, avatar_path")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (rowError || !row || row.status !== "active") {
    return { success: false, error: "Your account is not active." };
  }

  // The folder name must be the user's own id: the storage policy checks it.
  const path = `${user.id}/avatar-${crypto.randomUUID()}.${type.ext}`;

  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, bytes, { contentType: type.mime, upsert: false });

  if (uploadError) {
    return {
      success: false,
      error: `Could not upload your photo: ${uploadError.message}`,
    };
  }

  const { error: updateError } = await supabase
    .from("affiliates")
    .update({ avatar_path: path })
    .eq("id", row.id);

  if (updateError) {
    await supabase.storage.from(AVATAR_BUCKET).remove([path]); // roll back
    return {
      success: false,
      error: `Could not save your photo: ${updateError.message}`,
    };
  }

  if (row.avatar_path) {
    await supabase.storage.from(AVATAR_BUCKET).remove([row.avatar_path as string]);
  }

  revalidatePath("/affiliate", "layout");
  return { success: true };
}

export async function removeMyAvatar(): Promise<ActionResult> {
  const { user } = await requireRole("affiliate");
  const supabase = await createClient();

  const { data: row, error: rowError } = await supabase
    .from("affiliates")
    .select("id, avatar_path")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (rowError || !row) return { success: false, error: "Affiliate not found." };
  if (!row.avatar_path) return { success: true };

  const { error } = await supabase
    .from("affiliates")
    .update({ avatar_path: null })
    .eq("id", row.id);

  if (error) {
    return { success: false, error: `Could not remove your photo: ${error.message}` };
  }

  await supabase.storage.from(AVATAR_BUCKET).remove([row.avatar_path as string]);

  revalidatePath("/affiliate", "layout");
  return { success: true };
}