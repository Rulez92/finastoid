"use server";

// Server Actions for admin Partner Announcements. Every action re-checks
// requireRole("admin"), validates input with zod, and writes through the
// cookie-based client so RLS and the storage policies still apply (never
// the service-role key). The storefront announcement-actions.ts is untouched.
//
// Flow: create/update save the text; files are uploaded in a separate
// call (uploadPartnerAnnouncementFiles) so a failed upload never loses
// the announcement text.

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "partner-announcements";
const MAX_FILE_BYTES = 10 * 1024 * 1024; // matches the bucket and SQL check
const MAX_FILES_PER_ANNOUNCEMENT = 5;

const ALLOWED_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

const idSchema = z.string().uuid();

const announcementSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(150),
    body: z.string().trim().max(5000),
    audience: z.enum(["affiliates", "stockists", "both"]),
    isActive: z.boolean(),
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

export type PartnerAnnouncementInput = z.infer<typeof announcementSchema>;

export type ActionResult =
  | { success: true; announcementId?: string }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

function refresh() {
  revalidatePath("/admin/announcement");
  revalidatePath("/affiliate/announcements");
  revalidatePath("/stockist/announcements");
}

function toRow(d: PartnerAnnouncementInput) {
  return {
    title: d.title,
    body: d.body,
    audience: d.audience,
    is_active: d.isActive,
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
  return cleaned || "file";
}

// Check the real file signature, not just the declared type.
function detectType(bytes: Uint8Array): (typeof ALLOWED_TYPES)[number] | null {
  const startsWith = (sig: number[], offset = 0) =>
    sig.every((b, i) => bytes[offset + i] === b);

  if (startsWith([0x25, 0x50, 0x44, 0x46])) return "application/pdf"; // %PDF
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

/* ------------------------------------------------------------------ */
/* Create / update                                                      */
/* ------------------------------------------------------------------ */

export async function createPartnerAnnouncement(
  input: PartnerAnnouncementInput,
): Promise<ActionResult> {
  await requireRole("admin");

  const parsed = announcementSchema.safeParse(input);
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
    .from("partner_announcements")
    .insert(toRow(parsed.data))
    .select("id")
    .single();

  if (error || !data) {
    return {
      success: false,
      error: `Could not create announcement: ${error?.message}`,
    };
  }

  refresh();
  return { success: true, announcementId: data.id };
}

export async function updatePartnerAnnouncement(
  id: string,
  input: PartnerAnnouncementInput,
): Promise<ActionResult> {
  await requireRole("admin");

  if (!idSchema.safeParse(id).success) {
    return { success: false, error: "Invalid announcement id." };
  }

  const parsed = announcementSchema.safeParse(input);
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
    .from("partner_announcements")
    .update(toRow(parsed.data))
    .eq("id", id);

  if (error) {
    return {
      success: false,
      error: `Could not update announcement: ${error.message}`,
    };
  }

  refresh();
  return { success: true, announcementId: id };
}

/* ------------------------------------------------------------------ */
/* On / off switch                                                      */
/* ------------------------------------------------------------------ */

export async function setPartnerAnnouncementActive(
  id: string,
  isActive: boolean,
): Promise<ActionResult> {
  await requireRole("admin");

  if (!idSchema.safeParse(id).success) {
    return { success: false, error: "Invalid announcement id." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("partner_announcements")
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) return { success: false, error: error.message };

  refresh();
  return { success: true };
}

/* ------------------------------------------------------------------ */
/* Delete (announcement + its stored files)                             */
/* ------------------------------------------------------------------ */

export async function deletePartnerAnnouncement(
  id: string,
): Promise<ActionResult> {
  await requireRole("admin");

  if (!idSchema.safeParse(id).success) {
    return { success: false, error: "Invalid announcement id." };
  }

  const supabase = await createClient();

  // Collect the stored paths first; the DB cascade removes the file rows
  // but does NOT remove the objects from Storage.
  const { data: files } = await supabase
    .from("partner_announcement_files")
    .select("storage_path")
    .eq("announcement_id", id);

  const { data, error } = await supabase
    .from("partner_announcements")
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

  const paths = (files ?? []).map((f) => f.storage_path as string);
  if (paths.length > 0) {
    await supabase.storage.from(BUCKET).remove(paths); // best effort
  }

  refresh();
  return { success: true };
}

/* ------------------------------------------------------------------ */
/* Files                                                                */
/* ------------------------------------------------------------------ */

// FormData must contain one or more entries named "files".
export async function uploadPartnerAnnouncementFiles(
  announcementId: string,
  formData: FormData,
): Promise<ActionResult> {
  await requireRole("admin");

  if (!idSchema.safeParse(announcementId).success) {
    return { success: false, error: "Invalid announcement id." };
  }

  const files = formData
    .getAll("files")
    .filter((f): f is File => f instanceof File && f.size > 0);

  if (files.length === 0) {
    return { success: false, error: "No files selected." };
  }

  const supabase = await createClient();

  const { count, error: countError } = await supabase
    .from("partner_announcement_files")
    .select("id", { count: "exact", head: true })
    .eq("announcement_id", announcementId);

  if (countError) return { success: false, error: countError.message };

  if ((count ?? 0) + files.length > MAX_FILES_PER_ANNOUNCEMENT) {
    return {
      success: false,
      error: `Maximum ${MAX_FILES_PER_ANNOUNCEMENT} files per announcement.`,
    };
  }

  // Validate everything before uploading anything.
  const prepared: {
    file: File;
    bytes: Uint8Array;
    mime: (typeof ALLOWED_TYPES)[number];
  }[] = [];

  for (const file of files) {
    if (file.size > MAX_FILE_BYTES) {
      return { success: false, error: `${file.name} is larger than 10 MB.` };
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const mime = detectType(bytes);
    if (!mime) {
      return {
        success: false,
        error: `${file.name}: only PDF, PNG, JPG or WebP files are allowed.`,
      };
    }
    prepared.push({ file, bytes, mime });
  }

  const uploadedPaths: string[] = [];

  for (const { file, bytes, mime } of prepared) {
    const path = `${announcementId}/${crypto.randomUUID()}-${safeName(file.name)}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType: mime, upsert: false });

    if (uploadError) {
      await supabase.storage.from(BUCKET).remove(uploadedPaths); // roll back
      return {
        success: false,
        error: `Could not upload ${file.name}: ${uploadError.message}`,
      };
    }
    uploadedPaths.push(path);

    const { error: rowError } = await supabase
      .from("partner_announcement_files")
      .insert({
        announcement_id: announcementId,
        storage_path: path,
        file_name: safeName(file.name),
        mime_type: mime,
        size_bytes: file.size,
      });

    if (rowError) {
      await supabase.storage.from(BUCKET).remove(uploadedPaths); // roll back
      await supabase
        .from("partner_announcement_files")
        .delete()
        .in("storage_path", uploadedPaths);
      return {
        success: false,
        error: `Could not save ${file.name}: ${rowError.message}`,
      };
    }
  }

  refresh();
  return { success: true, announcementId };
}

export async function removePartnerAnnouncementFile(
  fileId: string,
): Promise<ActionResult> {
  await requireRole("admin");

  if (!idSchema.safeParse(fileId).success) {
    return { success: false, error: "Invalid file id." };
  }

  const supabase = await createClient();

  const { data: row, error: loadError } = await supabase
    .from("partner_announcement_files")
    .select("storage_path")
    .eq("id", fileId)
    .maybeSingle();

  if (loadError || !row) return { success: false, error: "File not found." };

  const { error } = await supabase
    .from("partner_announcement_files")
    .delete()
    .eq("id", fileId);

  if (error) return { success: false, error: error.message };

  await supabase.storage.from(BUCKET).remove([row.storage_path as string]);

  refresh();
  return { success: true };
}