// Server-side read for the stockist Dashboard. Import only from server
// components, never from a "use client" file (client files may import the
// TYPES below, which are erased at build).
//
// Nothing is calculated in the browser. It reads one thing that already
// exists in the database and returns it as typed, camelCase data:
//   my_stockist_commission_dashboard()   earnings cards, active affiliates,
//                                        period totals, chart series, top
//                                        affiliates and recent commissions
//
// The four earnings numbers come from stockist_earnings_summary() inside that
// function, so they always match the Payouts page.
//
// Own data only: the stockist is found from the signed-in user, and the
// browser never sends a stockist id. The period list is shared with the
// affiliate dashboard (same ranges, same parseRange for the URL value).
//
// The old my_stockist_dashboard() still exists in the database but is no
// longer called from here.

import { requireRole } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_RANGE,
  type DashboardRange,
} from "@/lib/affiliate/dashboard-ranges";

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

// One point of the chart: commission earned on verified sales that day.
export type StockistDashboardDay = {
  day: string; // "2026-10-08" (a UTC day; the first day of a month for 12m)
  commissionUsd: number;
  orders: number;
};

export type TopAffiliate = {
  name: string;
  orders: number;
  salesUsd: number;
  commissionUsd: number;
};

export type CommissionStatus =
  | "pending" // paid, but not shipped or still inside the refund window
  | "available" // can be put in a payout request now
  | "in_review" // inside a requested or approved payout
  | "paid" // inside a paid payout
  | "refunded"
  | "cancelled";

export type RecentCommission = {
  orderNumber: string;
  affiliateName: string;
  commissionPercent: number; // the rate frozen when the order was paid
  commissionUsd: number;
  orderTotalUsd: number;
  createdAt: string; // ISO timestamp
  status: CommissionStatus;
};

// All amounts are USD.
export type StockistDashboard = {
  range: DashboardRange;
  bucket: "day" | "month"; // one point per day, or per month for 12m
  summary: {
    availableUsd: number;
    pendingUsd: number;
    inReviewUsd: number;
    paidUsd: number;
  };
  activeAffiliates: number;
  period: { commissionUsd: number; orders: number; salesUsd: number };
  daily: StockistDashboardDay[]; // oldest first, zeros included
  topAffiliates: TopAffiliate[]; // up to 5, biggest sales first
  recent: RecentCommission[]; // latest 5, newest first
};

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const STATUSES: readonly CommissionStatus[] = [
  "pending",
  "available",
  "in_review",
  "paid",
  "refunded",
  "cancelled",
];

const toStatus = (v: unknown): CommissionStatus =>
  STATUSES.includes(v as CommissionStatus)
    ? (v as CommissionStatus)
    : "pending";

type RawDashboard = {
  bucket?: string;
  summary?: {
    available_usd?: number | string;
    pending_usd?: number | string;
    in_review_usd?: number | string;
    paid_usd?: number | string;
  };
  active_affiliates?: number | string;
  period?: {
    commission_usd?: number | string;
    orders?: number | string;
    sales_usd?: number | string;
  };
  daily?: {
    day: string;
    commission_usd: number | string;
    orders: number | string;
  }[];
  top_affiliates?: {
    name: string;
    orders: number | string;
    sales_usd: number | string;
    commission_usd: number | string;
  }[];
  recent?: {
    order_number: string;
    affiliate_name: string;
    commission_percent: number | string;
    commission_usd: number | string;
    order_total_usd: number | string;
    created_at: string;
    status: string;
  }[];
};

/* ------------------------------------------------------------------ */
/* Read                                                                 */
/* ------------------------------------------------------------------ */

export async function getMyStockistDashboard(
  range: DashboardRange = DEFAULT_RANGE,
): Promise<StockistDashboard> {
  await requireRole("stockist");
  const supabase = await createClient();

  const { data, error } = await supabase.rpc(
    "my_stockist_commission_dashboard",
    { p_range: range },
  );

  if (error) {
    throw new Error(`Failed to load dashboard: ${error.message}`);
  }

  const s = (data ?? {}) as RawDashboard;

  return {
    range,
    bucket: s.bucket === "month" ? "month" : "day",
    summary: {
      availableUsd: num(s.summary?.available_usd),
      pendingUsd: num(s.summary?.pending_usd),
      inReviewUsd: num(s.summary?.in_review_usd),
      paidUsd: num(s.summary?.paid_usd),
    },
    activeAffiliates: num(s.active_affiliates),
    period: {
      commissionUsd: num(s.period?.commission_usd),
      orders: num(s.period?.orders),
      salesUsd: num(s.period?.sales_usd),
    },
    daily: (s.daily ?? []).map((d) => ({
      day: d.day,
      commissionUsd: num(d.commission_usd),
      orders: num(d.orders),
    })),
    topAffiliates: (s.top_affiliates ?? []).map((a) => ({
      name: a.name,
      orders: num(a.orders),
      salesUsd: num(a.sales_usd),
      commissionUsd: num(a.commission_usd),
    })),
    recent: (s.recent ?? []).map((r) => ({
      orderNumber: r.order_number,
      affiliateName: r.affiliate_name,
      commissionPercent: num(r.commission_percent),
      commissionUsd: num(r.commission_usd),
      orderTotalUsd: num(r.order_total_usd),
      createdAt: r.created_at,
      status: toStatus(r.status),
    })),
  };
}