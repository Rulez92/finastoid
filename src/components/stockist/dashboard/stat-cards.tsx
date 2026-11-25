// components/stockist/dashboard/stat-cards.tsx
//
// Headline numbers on the stockist Dashboard, driven by
// my_stockist_commission_dashboard() via getMyStockistDashboard().
//
// Row 1, "right now" (not affected by ?range=): the four earnings buckets
// that always match the Payouts page: available, pending, in review, paid.
// Row 2, "this period" (follows ?range=): commission, orders, sales and
// active affiliates.
//
// A plain server component. Nothing is calculated here except formatting.

import {
  BadgeCheck,
  Clock,
  Coins,
  Hourglass,
  ShoppingBag,
  TrendingUp,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";
import type { StockistDashboard } from "@/lib/stockist/dashboard-queries";
import { DASHBOARD_RANGES } from "@/lib/affiliate/dashboard-ranges";

const count = new Intl.NumberFormat("en-US");

// One look per card. "hero" is the dark main card; the rest are light
// tinted cards. Full class names so Tailwind can see them at build time.
const TONES = {
  hero: {
    card: "border-aff-gold-400/30 bg-gradient-to-br from-aff-green-950 via-aff-green-900 to-aff-green-800",
    line: "from-transparent via-aff-gold-300 to-transparent",
    chip: "border border-aff-gold-400/40 bg-aff-green-950/60 text-aff-gold-300",
    title: "text-aff-cream-50/80",
    value: "text-aff-gold-300",
    hint: "text-aff-cream-50/70",
    glow: true,
  },
  gold: {
    card: "border-[#EBDDC3] bg-[#FBF6EC]",
    line: "from-[#AC834E] via-[#F1CC9C] to-[#AC834E]",
    chip: "bg-[#7A5526] text-[#F6E3C4]",
    title: "text-aff-muted",
    value: "text-aff-green-900",
    hint: "text-aff-muted",
    glow: false,
  },
  teal: {
    card: "border-[#D6E4EA] bg-[#F5F9FB]",
    line: "from-[#2E6F86] via-[#6FA8BD] to-[#2E6F86]",
    chip: "bg-[#1F4E5F] text-[#CFE8F1]",
    title: "text-aff-muted",
    value: "text-aff-green-900",
    hint: "text-aff-muted",
    glow: false,
  },
  emerald: {
    card: "border-[#CFE6DA] bg-[#F4FAF7]",
    line: "from-[#2F9E6B] via-[#7CCBA1] to-[#2F9E6B]",
    chip: "bg-[#14573A] text-[#C6EFD7]",
    title: "text-aff-muted",
    value: "text-aff-green-900",
    hint: "text-aff-muted",
    glow: false,
  },
} as const;

type StatProps = {
  title: string;
  value: string;
  icon: LucideIcon;
  tone: keyof typeof TONES;
  hint?: string;
};

function StatCard({ title, value, icon: Icon, tone, hint }: StatProps) {
  const t = TONES[tone];

  return (
    <div
      className={cn(
        "group relative isolate flex h-full touch-manipulation flex-col overflow-hidden rounded-2xl border p-4 pt-5 shadow-[0_6px_16px_-12px_rgba(3,24,7,0.3)] transition-all duration-300 ease-out active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100 [@media(hover:hover)]:hover:-translate-y-1 [@media(hover:hover)]:hover:shadow-[0_20px_36px_-18px_rgba(172,131,78,0.6)] motion-reduce:[@media(hover:hover)]:hover:translate-y-0",
        t.card,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r",
          t.line,
        )}
      />
      {t.glow && (
        <span
          aria-hidden
          className="pointer-events-none absolute -right-10 -top-10 -z-10 h-36 w-36 rounded-full bg-aff-gold-400/15 blur-3xl"
        />
      )}

      <div className="flex items-start justify-between gap-2">
        <p
          className={cn(
            "font-sans text-[11px] font-medium uppercase tracking-[0.14em]",
            t.title,
          )}
        >
          {title}
        </p>
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 motion-reduce:transition-none group-active:scale-90 [@media(hover:hover)]:group-hover:-rotate-6 [@media(hover:hover)]:group-hover:scale-110",
            t.chip,
          )}
        >
          <Icon className="h-[18px] w-[18px]" strokeWidth={1.7} />
        </span>
      </div>

      <p
        className={cn(
          "mt-3 break-words font-display text-[22px] font-semibold leading-tight [font-variant-numeric:tabular-nums] min-[400px]:text-[24px] sm:text-[28px]",
          t.value,
        )}
      >
        {value}
      </p>

      {hint && (
        <p className={cn("mt-1.5 break-words font-sans text-[12px]", t.hint)}>
          {hint}
        </p>
      )}
    </div>
  );
}

// Small stat inside the "this period" strip.
function PeriodStat({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: string;
  icon: LucideIcon;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-aff-green-900 text-aff-gold-300">
        <Icon className="h-[18px] w-[18px]" strokeWidth={1.7} aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="truncate font-sans text-[11px] font-medium uppercase tracking-[0.12em] text-aff-muted">
          {title}
        </p>
        <p className="break-words font-display text-[18px] font-semibold leading-tight text-aff-green-900 [font-variant-numeric:tabular-nums] sm:text-[20px]">
          {value}
        </p>
      </div>
    </div>
  );
}

export function StatCards({ data }: { data: StockistDashboard }) {
  const periodLabel =
    DASHBOARD_RANGES.find((r) => r.value === data.range)?.label ?? "";
  const { summary, period } = data;

  return (
    <section aria-label="Summary" className="flex flex-col gap-3 sm:gap-4">
      {/* Earnings now: 2 per row on phones, 4 on desktop. */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          title="Available"
          value={formatPrice(summary.availableUsd, "USD")}
          icon={Wallet}
          tone="hero"
          hint="Ready for a payout request"
        />
        <StatCard
          title="Pending"
          value={formatPrice(summary.pendingUsd, "USD")}
          icon={Clock}
          tone="gold"
          hint="Not shipped or in refund window"
        />
        <StatCard
          title="In review"
          value={formatPrice(summary.inReviewUsd, "USD")}
          icon={Hourglass}
          tone="teal"
          hint="Inside a requested payout"
        />
        <StatCard
          title="Paid"
          value={formatPrice(summary.paidUsd, "USD")}
          icon={BadgeCheck}
          tone="emerald"
          hint="Already paid to you"
        />
      </div>

      {/* Selected period */}
      <div className="relative isolate overflow-hidden rounded-2xl border border-aff-border bg-gradient-to-b from-aff-ivory to-white p-4 pt-5 shadow-[0_6px_16px_-12px_rgba(3,24,7,0.3)] sm:p-5 sm:pt-6">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-aff-gold-600 via-aff-gold-300 to-aff-gold-600 opacity-70"
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-sans text-[13px] font-semibold text-aff-green-900">
            Performance
          </p>
          {periodLabel && (
            <span className="rounded-full border border-aff-gold-500/40 bg-aff-ivory px-3 py-0.5 font-sans text-[12px] font-medium text-aff-green-900">
              {periodLabel}
            </span>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <PeriodStat
            title="Commission"
            value={formatPrice(period.commissionUsd, "USD")}
            icon={Coins}
          />
          <PeriodStat
            title="Orders"
            value={count.format(period.orders)}
            icon={ShoppingBag}
          />
         
          <PeriodStat
            title="Active affiliates"
            value={count.format(data.activeAffiliates)}
            icon={Users}
          />
        </div>
      </div>
    </section>
  );
}