// Server-side reads for the admin Partner Announcements section. Import only
// from server components and server actions, never from a "use client" file.
//
// Separate from announcement-queries.ts (the storefront bar), which is
// untouched. Re-checks requireRole("admin"), same pattern as
// affiliate-queries.ts.

import { requireRole } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";

const MISSING_CODES = new Set(["PGRST205", "PGRST204", "42P01", "42703"]);

function isMissingTableOrColumn(error: { code?: string } | null): boolean {
  return !!error?.code && MISSING_CODES.has(error.code);
}

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

export type PartnerAudience = "affiliates" | "stockists" | "both";

export type PartnerAnnouncementFile = {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

export type PartnerAnnouncementItem = {
  id: string;
  title: string;
  body: string;
  audience: PartnerAudience;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  files: PartnerAnnouncementFile[];
};

/* ------------------------------------------------------------------ */
/* Admin list                                                           */
/* ------------------------------------------------------------------ */

export async function listPartnerAnnouncements(): Promise<
  PartnerAnnouncementItem[]
> {
  await requireRole("admin");
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("partner_announcements")
    .select(
      "id, title, body, audience, is_active, starts_at, ends_at, created_at, partner_announcement_files ( id, file_name, mime_type, size_bytes )",
    )
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingTableOrColumn(error)) return [];
    throw new Error(`Failed to load partner announcements: ${error.message}`);
  }

  return (data ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    body: r.body ?? "",
    audience: r.audience as PartnerAudience,
    isActive: !!r.is_active,
    startsAt: r.starts_at,
    endsAt: r.ends_at,
    createdAt: r.created_at,
    files: (r.partner_announcement_files ?? []).map(
      (f: {
        id: string;
        file_name: string;
        mime_type: string;
        size_bytes: number;
      }) => ({
        id: f.id,
        fileName: f.file_name,
        mimeType: f.mime_type,
        sizeBytes: f.size_bytes,
      }),
    ),
  }));
}