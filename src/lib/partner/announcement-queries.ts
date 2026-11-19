// Server-side reads for the affiliate and stockist Announcements pages.
// Import only from server components and server actions, never from a
// "use client" file.
//
// "Own data only": the user comes from the signed-in session, never from
// the browser. RLS already limits rows to live announcements meant for
// this role, and the storage policy limits file access the same way.
// Files are returned as short-lived signed URLs; storage paths never
// leave the server.

import { requireRole } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "partner-announcements";
const SIGNED_URL_SECONDS = 60 * 60; // 1 hour
const MISSING_CODES = new Set(["PGRST205", "PGRST204", "42P01", "42703"]);

function isMissingTableOrColumn(error: { code?: string } | null): boolean {
  return !!error?.code && MISSING_CODES.has(error.code);
}

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

export type PartnerRole = "affiliate" | "stockist";

export type PartnerFileView = {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  url: string | null; // null if the signed link could not be created
};

export type PartnerAnnouncementView = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  isRead: boolean;
  files: PartnerFileView[];
};

export type PartnerAnnouncementsResult = {
  items: PartnerAnnouncementView[];
  unreadCount: number;
};

type FileRow = {
  id: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
};

/* ------------------------------------------------------------------ */
/* Read                                                                 */
/* ------------------------------------------------------------------ */

export async function getMyPartnerAnnouncements(
  role: PartnerRole,
): Promise<PartnerAnnouncementsResult> {
  const { user } = await requireRole(role);
  const supabase = await createClient();

  const [annResult, readsResult] = await Promise.all([
    supabase
      .from("partner_announcements")
      .select(
        "id, title, body, created_at, partner_announcement_files ( id, storage_path, file_name, mime_type, size_bytes )",
      )
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("partner_announcement_reads")
      .select("announcement_id")
      .eq("user_id", user.id),
  ]);

  const { data, error } = annResult;
  if (error) {
    if (isMissingTableOrColumn(error)) return { items: [], unreadCount: 0 };
    throw new Error(`Failed to load announcements: ${error.message}`);
  }

  // If the reads table can't be read, everything simply shows as "New".
  const readIds = new Set(
    (readsResult.data ?? []).map((r) => r.announcement_id as string),
  );

  const rows = data ?? [];

  // One batched call for every file's signed URL.
  const allFiles: FileRow[] = rows.flatMap(
    (r) => (r.partner_announcement_files ?? []) as FileRow[],
  );
  const urlByPath = new Map<string, string>();

  if (allFiles.length > 0) {
    const { data: signed } = await supabase.storage
      .from(BUCKET)
      .createSignedUrls(
        allFiles.map((f) => f.storage_path),
        SIGNED_URL_SECONDS,
      );
    for (const s of signed ?? []) {
      if (s.path && s.signedUrl) urlByPath.set(s.path, s.signedUrl);
    }
  }

  const items: PartnerAnnouncementView[] = rows.map((r) => ({
    id: r.id,
    title: r.title,
    body: r.body ?? "",
    createdAt: r.created_at,
    isRead: readIds.has(r.id),
    files: ((r.partner_announcement_files ?? []) as FileRow[]).map((f) => ({
      id: f.id,
      fileName: f.file_name,
      mimeType: f.mime_type,
      sizeBytes: f.size_bytes,
      url: urlByPath.get(f.storage_path) ?? null,
    })),
  }));

  return { items, unreadCount: items.filter((i) => !i.isRead).length };
}