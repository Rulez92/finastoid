// components/stockist/dashboard/dashboard-lists.tsx
//
// The two list cards under the chart on the stockist Dashboard:
// "Top affiliates" (up to 5, biggest sales first) and "Recent commissions"
// (latest 5, newest first). Plain server components in the same card style
// as the rest of the dashboard. Read-only; every row comes from
// getMyStockistDashboard() (topAffiliates and recent).

import Link from "next/link";
import { ArrowRight, Trophy, Wallet } from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";
import type {
  CommissionStatus,
  StockistDashboard,
} from "@/lib/stockist/dashboard-queries";

// UTC on purpose, same as the other tables.
const dateFmt = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

const CARD =
  "relative isolate flex h-full flex-col overflow-hidden rounded-2xl border border-aff-border bg-gradient-to-b from-aff-ivory to-white p-4 pt-5 shadow-[0_10px_30px_-22px_rgba(172,131,78,0.45)] sm:p-5 sm:pt-6";

function CardHeader({
  title,
  href,
  linkLabel,
}: {
  title: string;
  href: string;
  linkLabel: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <p className="font-sans text-[13px] font-semibold text-aff-green-900">
        {title}
      </p>
      <Link
        href={href}
        className="group inline-flex shrink-0 items-center gap-1 rounded-full border border-aff-border bg-white px-3 py-1 font-sans text-[12px] font-medium text-aff-green-900 transition-colors [@media(hover:hover)]:hover:border-aff-gold-500 [@media(hover:hover)]:hover:bg-aff-ivory"
      >
        {linkLabel}
        <ArrowRight
          className="h-3.5 w-3.5 transition-transform duration-200 [@media(hover:hover)]:group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </Link>
    </div>
  );
}

function TopLine() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-aff-gold-600 via-aff-gold-300 to-aff-gold-600 opacity-70"
    />
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 flex flex-1 items-center justify-center rounded-xl border border-dashed border-aff-gold-500/40 bg-aff-ivory px-4 py-8 text-center">
      <p className="font-sans text-[14px] text-aff-muted">{children}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Commission status badge                                              */
/* ------------------------------------------------------------------ */

// Static class names so Tailwind can see them at build time.
const STATUS: Record<CommissionStatus, { label: string; cls: string }> = {
  pending: {
    label: "Pending",
    cls: "border-aff-gold-600/40 bg-aff-gold-400/25 text-[#7A5526]",
  },
  available: {
    label: "Available",
    cls: "border-[#2F9E6B]/40 bg-[rgba(47,158,107,0.12)] text-[#1F7A52]",
  },
  in_review: {
    label: "In review",
    cls: "border-[#2E6F86]/40 bg-[rgba(46,111,134,0.10)] text-[#1F4E5F]",
  },
  paid: {
    label: "Paid",
    cls: "border-aff-green-900/30 bg-aff-green-900 text-aff-gold-300",
  },
  refunded: {
    label: "Refunded",
    cls: "border-[rgba(190,60,50,0.3)] bg-[rgba(190,60,50,0.08)] text-[#A3342B]",
  },
  cancelled: {
    label: "Cancelled",
    cls: "border-aff-border bg-white text-aff-muted",
  },
};

function StatusBadge({ status }: { status: CommissionStatus }) {
  const s = STATUS[status];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 font-sans text-[11px] font-medium",
        s.cls,
      )}
    >
      {s.label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Top affiliates                                                       */
/* ------------------------------------------------------------------ */

export function TopAffiliatesCard({
  affiliates,
}: {
  affiliates: StockistDashboard["topAffiliates"];
}) {
  return (
    <div className={CARD}>
      <TopLine />
      <CardHeader
        title="Top affiliates"
        href="/stockist/affiliates"
        linkLabel="View all"
      />

      {affiliates.length === 0 ? (
        <EmptyState>
          No affiliate sales in this period yet. Your top affiliates will
          appear here.
        </EmptyState>
      ) : (
        <ul className="mt-3 divide-y divide-aff-border">
          {affiliates.map((a, i) => (
            <li
              key={`${a.name}-${i}`}
              className="flex items-center justify-between gap-3 py-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  aria-hidden
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-sans text-[12px] font-semibold",
                    i === 0
                      ? "bg-gradient-to-br from-aff-gold-300 via-aff-gold-400 to-aff-gold-600 text-aff-green-950"
                      : "bg-aff-green-900 text-aff-gold-300",
                  )}
                >
                  {i === 0 ? (
                    <Trophy className="h-4 w-4" strokeWidth={1.8} />
                  ) : (
                    i + 1
                  )}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-sans text-[14px] font-semibold text-aff-green-900">
                    {a.name}
                  </p>
                  <p className="truncate font-sans text-[12px] text-aff-muted">
                    {a.orders} {a.orders === 1 ? "order" : "orders"} ·{" "}
                    {formatPrice(a.salesUsd, "USD")} sales
                  </p>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-sans text-[14px] font-semibold tabular-nums text-aff-green-900">
                  {formatPrice(a.commissionUsd, "USD")}
                </p>
                <p className="font-sans text-[11px] text-aff-muted">
                  commission
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Recent commissions                                                   */
/* ------------------------------------------------------------------ */

export function RecentCommissionsCard({
  items,
}: {
  items: StockistDashboard["recent"];
}) {
  return (
    <div className={CARD}>
      <TopLine />
      <CardHeader
        title="Recent commissions"
        href="/stockist/payouts"
        linkLabel="Payouts"
      />

      {items.length === 0 ? (
        <EmptyState>
          No commissions yet. They appear here when an affiliate order is paid.
        </EmptyState>
      ) : (
        <ul className="mt-3 divide-y divide-aff-border">
          {items.map((r) => (
            <li
              key={r.orderNumber}
              className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 py-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  aria-hidden
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-aff-green-900 font-sans text-[12px] font-semibold text-aff-gold-300"
                >
                  {(r.affiliateName || "?").trim().slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-sans text-[14px] font-semibold text-aff-green-900">
                    {r.orderNumber}
                  </p>
                  <p className="truncate font-sans text-[12px] text-aff-muted">
                    {r.affiliateName} · {dateFmt.format(new Date(r.createdAt))}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="inline-flex items-center gap-1 font-sans text-[14px] font-semibold tabular-nums text-aff-green-900">
                    <Wallet
                      className="h-3.5 w-3.5 text-aff-gold-600"
                      strokeWidth={1.8}
                      aria-hidden="true"
                    />
                    {formatPrice(r.commissionUsd, "USD")}
                  </p>
                  <p className="font-sans text-[11px] tabular-nums text-aff-muted">
                    {r.commissionPercent}% of{" "}
                    {formatPrice(r.orderTotalUsd, "USD")}
                  </p>
                </div>
                <StatusBadge status={r.status} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}