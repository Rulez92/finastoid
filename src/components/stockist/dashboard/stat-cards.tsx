// // The four headline numbers on the stockist Dashboard, in the same style as
// // the affiliate stat cards: stock remaining, packs sold, sales and active
// // affiliates. A plain server component (no hooks, no currency switching:
// // stockist amounts are USD only). Nothing is calculated here except
// // formatting; every number comes from getMyStockistDashboard().
// //
// // "Packs sold" and "Sales" follow the chart period (?range=); "Stock
// // remaining" and "Active affiliates" are the situation right now.

// import {
//   Boxes,
//   PackageCheck,
//   Users,
//   Wallet,
//   type LucideIcon,
// } from "lucide-react";
// import { cn, formatPrice } from "@/lib/utils";
// import type { StockistDashboard } from "@/lib/stockist/dashboard-queries";
// import { DASHBOARD_RANGES } from "@/lib/affiliate/dashboard-ranges";

// const count = new Intl.NumberFormat("en-US");

// // Static class names, so Tailwind can see them at build time.
// const ACCENTS = {
//   green: "bg-green/10 text-green",
//   copper: "bg-copper/10 text-copper",
//   gray: "bg-espresso/5 text-warm-gray",
// } as const;

// type StatProps = {
//   title: string;
//   value: string;
//   icon: LucideIcon;
//   accent: keyof typeof ACCENTS;
//   hint?: string;
// };

// function StatCard({ title, value, icon: Icon, accent, hint }: StatProps) {
//   return (
//     <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-border-strong bg-white p-4 shadow-[0_1px_2px_rgba(50,30,24,0.06),0_6px_16px_rgba(50,30,24,0.05)] transition-shadow duration-200 hover:shadow-[0_2px_4px_rgba(50,30,24,0.08),0_10px_24px_rgba(50,30,24,0.08)] dark:border-border dark:shadow-none">
//       <span
//         aria-hidden
//         className="absolute inset-x-0 top-0 h-[2px] bg-copper/70 dark:hidden"
//       />
//       <div className="flex items-start justify-between gap-2">
//         <p className="font-sans text-[11px] font-medium uppercase tracking-[0.14em] text-warm-gray">
//           {title}
//         </p>
//         <span
//           className={cn(
//             "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
//             ACCENTS[accent],
//           )}
//         >
//           <Icon className="h-4 w-4" strokeWidth={1.7} />
//         </span>
//       </div>

//       <p className="mt-3 font-display text-[28px] leading-none tabular-nums text-espresso">
//         {value}
//       </p>

//       {hint && (
//         <p className="mt-1.5 font-sans text-[12px] text-warm-gray">{hint}</p>
//       )}
//     </div>
//   );
// }

// export function StatCards({ data }: { data: StockistDashboard }) {
//   const periodLabel =
//     DASHBOARD_RANGES.find((r) => r.value === data.range)?.label ?? "";
//   const lowCount = data.lowStock.length;

//   return (
//     <section aria-label="Summary">
//       {/* 2 per row on phones, 4 on desktop. */}
//       <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
//         <StatCard
//           title="Stock remaining"
//           value={count.format(data.stockRemaining)}
//           icon={Boxes}
//           accent="green"
//           hint={
//             lowCount > 0
//               ? `${lowCount} ${lowCount === 1 ? "pack is" : "packs are"} running low`
//               : "All packs well stocked"
//           }
//         />
//         <StatCard
//           title="Packs sold"
//           value={count.format(data.period.units)}
//           icon={PackageCheck}
//           accent="gray"
//           hint={periodLabel}
//         />
//         <StatCard
//           title="Sales"
//           value={formatPrice(data.period.salesUsd, "USD")}
//           icon={Wallet}
//           accent="copper"
//           hint={periodLabel}
//         />
//         <StatCard
//           title="Active affiliates"
//           value={count.format(data.activeAffiliates)}
//           icon={Users}
//           accent="green"
//           hint="Assigned to you"
//         />
//       </div>
//     </section>
//   );
// }
// The four headline numbers on the stockist Dashboard, in the same style as
// the affiliate stat cards: stock remaining, packs sold, sales and active
// affiliates. A plain server component (no hooks, no currency switching:
// stockist amounts are USD only). Nothing is calculated here except
// formatting; every number comes from getMyStockistDashboard().
//
// "Packs sold" and "Sales" follow the chart period (?range=); "Stock
// remaining" and "Active affiliates" are the situation right now.

import {
  Boxes,
  PackageCheck,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";
import type { StockistDashboard } from "@/lib/stockist/dashboard-queries";
import { DASHBOARD_RANGES } from "@/lib/affiliate/dashboard-ranges";

const count = new Intl.NumberFormat("en-US");

// One look per card. "hero" is the dark main card; the rest are light
// tinted cards with a colored top line and icon chip. Full class names,
// so Tailwind can see them at build time.
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
  teal: {
    card: "border-[#D6E4EA] bg-[#F5F9FB]",
    line: "from-[#2E6F86] via-[#6FA8BD] to-[#2E6F86]",
    chip: "bg-[#1F4E5F] text-[#CFE8F1]",
    title: "text-aff-muted",
    value: "text-aff-green-900",
    hint: "text-aff-muted",
    glow: false,
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
          "mt-3 break-words font-display text-[24px] font-semibold leading-tight [font-variant-numeric:tabular-nums] sm:text-[28px]",
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

export function StatCards({ data }: { data: StockistDashboard }) {
  const periodLabel =
    DASHBOARD_RANGES.find((r) => r.value === data.range)?.label ?? "";
  const lowCount = data.lowStock.length;

  return (
    <section aria-label="Summary">
      {/* 2 per row on phones, 4 on desktop. */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          title="Stock remaining"
          value={count.format(data.stockRemaining)}
          icon={Boxes}
          tone="hero"
          hint={
            lowCount > 0
              ? `${lowCount} ${lowCount === 1 ? "pack is" : "packs are"} running low`
              : "All packs well stocked"
          }
        />
        <StatCard
          title="Packs sold"
          value={count.format(data.period.units)}
          icon={PackageCheck}
          tone="teal"
          hint={periodLabel}
        />
        <StatCard
          title="Sales"
          value={formatPrice(data.period.salesUsd, "USD")}
          icon={Wallet}
          tone="gold"
          hint={periodLabel}
        />
        <StatCard
          title="Active affiliates"
          value={count.format(data.activeAffiliates)}
          icon={Users}
          tone="emerald"
          hint="Assigned to you"
        />
      </div>
    </section>
  );
}