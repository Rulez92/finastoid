// Server-side reads for the admin Promotions section. Import only from
// server components and server actions, never from a "use client" file.
//
// Same pattern as partner-announcement-queries.ts. Re-checks
// requireRole("admin"). Reads through the cookie-based client so RLS applies.
//
// Live / Ended are NOT stored. The table component works them out from the
// dates (this file is server-only, so it cannot hold client helpers).

import { requireRole } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "promotion-banners";
const SIGNED_URL_SECONDS = 60 * 60; // 1 hour

const MISSING_CODES = new Set(["PGRST205", "PGRST204", "42P01", "42703"]);

function isMissingTableOrColumn(error: { code?: string } | null): boolean {
  return !!error?.code && MISSING_CODES.has(error.code);
}

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

export type PromotionOfferType =
  | "free_tour"
  | "cash_prize"
  | "bonus"
  | "discount"
  | "other";

export type PromotionStatus = "draft" | "published" | "rewarded";

export type PromotionTargetUnit = "units" | "amount";

export type PromotionItem = {
  id: string;
  title: string;
  description: string;
  offerType: PromotionOfferType;
  rewardDetails: string;
  targetValue: number | null;
  targetUnit: PromotionTargetUnit;
  terms: string;
  bannerPath: string | null;
  bannerUrl: string | null; // short-lived signed URL, null if no banner
  status: PromotionStatus;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
};

/* ------------------------------------------------------------------ */
/* Admin list                                                           */
/* ------------------------------------------------------------------ */

export async function listPromotions(): Promise<PromotionItem[]> {
  await requireRole("admin");
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("promotions")
    .select(
      "id, title, description, offer_type, reward_details, target_value, target_unit, terms, banner_path, status, starts_at, ends_at, created_at",
    )
    .order("created_at", { ascending: false });

  if (error) {
    if (isMissingTableOrColumn(error)) return [];
    throw new Error(`Failed to load promotions: ${error.message}`);
  }

  const rows = data ?? [];

  // One batch call for all banners (instead of one call per row).
  const paths = rows
    .map((r) => r.banner_path as string | null)
    .filter((p): p is string => !!p);

  const urlByPath = new Map<string, string>();
  if (paths.length > 0) {
    const { data: signed } = await supabase.storage
      .from(BUCKET)
      .createSignedUrls(paths, SIGNED_URL_SECONDS);

    for (const s of signed ?? []) {
      if (s.path && s.signedUrl) urlByPath.set(s.path, s.signedUrl);
    }
  }

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description ?? "",
    offerType: r.offer_type as PromotionOfferType,
    rewardDetails: r.reward_details ?? "",
    targetValue: r.target_value === null ? null : Number(r.target_value),
    targetUnit: r.target_unit as PromotionTargetUnit,
    terms: r.terms ?? "",
    bannerPath: r.banner_path,
    bannerUrl: r.banner_path ? (urlByPath.get(r.banner_path) ?? null) : null,
    status: r.status as PromotionStatus,
    startsAt: r.starts_at,
    endsAt: r.ends_at,
    createdAt: r.created_at,
  }));
}