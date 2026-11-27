// Server-side reads for the stockist Promotions page. Import only from server
// components and server actions, never from a "use client" file (client files
// may use `import type` only).
//
// Re-checks requireRole("stockist"). Reads through the cookie-based client so
// RLS applies: a stockist can only see published / rewarded promotions that
// have started, and can only sign banners of promotions they can see.
//
// Scheduled / Live / Ended are NOT stored. The card component works them out
// from the dates after mount.

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

export type StockistPromotionOfferType =
  | "free_tour"
  | "cash_prize"
  | "bonus"
  | "discount"
  | "other";

export type StockistPromotionItem = {
  id: string;
  title: string;
  description: string;
  offerType: StockistPromotionOfferType;
  rewardDetails: string;
  targetValue: number | null;
  targetUnit: "units" | "amount";
  terms: string;
  bannerUrl: string | null; // short-lived signed URL, null if no banner
  status: "published" | "rewarded";
  startsAt: string;
  endsAt: string | null;
};

/* ------------------------------------------------------------------ */
/* Stockist list                                                        */
/* ------------------------------------------------------------------ */

export async function listStockistPromotions(): Promise<
  StockistPromotionItem[]
> {
  await requireRole("stockist");
  const supabase = await createClient();

  // RLS already hides drafts and not-yet-started promotions. The filters
  // below repeat that on purpose, so the query is correct even if a policy
  // is loosened later.
  const { data, error } = await supabase
    .from("promotions")
    .select(
      "id, title, description, offer_type, reward_details, target_value, target_unit, terms, banner_path, status, starts_at, ends_at",
    )
    .in("status", ["published", "rewarded"])
    .not("starts_at", "is", null)
    .lte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: false });

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
    offerType: r.offer_type as StockistPromotionOfferType,
    rewardDetails: r.reward_details ?? "",
    targetValue: r.target_value === null ? null : Number(r.target_value),
    targetUnit: r.target_unit as "units" | "amount",
    terms: r.terms ?? "",
    bannerUrl: r.banner_path ? (urlByPath.get(r.banner_path) ?? null) : null,
    status: r.status as "published" | "rewarded",
    startsAt: r.starts_at as string,
    endsAt: r.ends_at,
  }));
}