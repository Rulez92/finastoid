// "use client";

// // Stockist Promotions list. Owns the one timer (1 second) that drives every
// // countdown, and groups cards: Live, Coming soon, Past. Phase and dates are
// // worked out only after mount (the server has no viewer time or timezone), so
// // there is no hydration mismatch.

// import { useEffect, useState } from "react";
// import { Gift } from "lucide-react";
// import type { StockistPromotionItem } from "@/lib/stockist/promotion-queries";
// import { PromotionCard } from "./promotion-card";
// import { getPhase } from "./promotion-phase";

// function Section({
//   title,
//   items,
//   now,
// }: {
//   title: string;
//   items: StockistPromotionItem[];
//   now: number;
// }) {
//   if (items.length === 0) return null;
//   return (
//     <section className="flex flex-col gap-3">
//       <div className="flex items-center gap-2.5">
//         <h2 className="font-display text-[18px] font-semibold text-aff-green-900">
//           {title}
//         </h2>
//         <span className="rounded-full border border-aff-gold-500/40 bg-aff-ivory px-2 py-0.5 font-sans text-[11px] font-semibold text-aff-gold-600">
//           {items.length}
//         </span>
//       </div>
//       <div className="grid grid-cols-1 gap-4 sm:gap-5 xl:grid-cols-2">
//         {items.map((item) => (
//           <PromotionCard key={item.id} item={item} now={now} />
//         ))}
//       </div>
//     </section>
//   );
// }

// export function PromotionList({ items }: { items: StockistPromotionItem[] }) {
//   const [now, setNow] = useState<number | null>(null);

//   useEffect(() => {
//     setNow(Date.now());

//     // Tick only while something still counts down.
//     const needsTick = items.some(
//       (i) =>
//         i.status === "published" &&
//         (!i.endsAt || Date.parse(i.endsAt) > Date.now()),
//     );
//     if (!needsTick) return;

//     const id = setInterval(() => setNow(Date.now()), 1000);
//     return () => clearInterval(id);
//   }, [items]);

//   if (items.length === 0) {
//     return (
//       <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-aff-gold-500/50 bg-aff-ivory px-6 py-12 text-center">
//         <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-aff-gold-300 via-aff-gold-400 to-aff-gold-600 text-aff-green-950">
//           <Gift className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
//         </span>
//         <p className="font-display text-[18px] font-semibold text-aff-green-900">
//           No promotions yet
//         </p>
//         <p className="max-w-sm font-sans text-[13px] leading-relaxed text-aff-muted">
//           When Finasto™ runs an offer for stockists, it will show up here.
//         </p>
//       </div>
//     );
//   }

//   if (now === null) {
//     return (
//       <div
//         aria-hidden="true"
//         className="grid grid-cols-1 gap-4 sm:gap-5 xl:grid-cols-2"
//       >
//         {[0, 1].map((i) => (
//           <div
//             key={i}
//             className="h-80 animate-pulse rounded-2xl bg-aff-gold-500/10 motion-reduce:animate-none"
//           />
//         ))}
//       </div>
//     );
//   }

//   const live: StockistPromotionItem[] = [];
//   const upcoming: StockistPromotionItem[] = [];
//   const past: StockistPromotionItem[] = [];

//   for (const item of items) {
//     const phase = getPhase(item, now);
//     if (phase === "live") live.push(item);
//     else if (phase === "scheduled") upcoming.push(item);
//     else past.push(item);
//   }

//   return (
//     <div className="flex flex-col gap-8">
//       <Section title="Live now" items={live} now={now} />
//       <Section title="Coming soon" items={upcoming} now={now} />
//       <Section title="Past promotions" items={past} now={now} />
//     </div>
//   );
// }
"use client";

// Stockist Promotions list. Owns the one timer (1 second) that drives every
// countdown, and groups cards: Live, Coming soon, Past. Phase and dates are
// worked out only after mount (the server has no viewer time or timezone), so
// there is no hydration mismatch.

import { useEffect, useState } from "react";
import { CalendarClock, Gift, History, Flame, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StockistPromotionItem } from "@/lib/stockist/promotion-queries";
import { PromotionCard } from "./promotion-card";
import { getPhase } from "./promotion-phase";

function Section({
  title,
  icon: Icon,
  highlight = false,
  items,
  now,
}: {
  title: string;
  icon: LucideIcon;
  highlight?: boolean;
  items: StockistPromotionItem[];
  now: number;
}) {
  if (items.length === 0) return null;
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
            highlight
              ? "bg-gradient-to-br from-aff-gold-300 via-aff-gold-400 to-aff-gold-600 text-aff-green-950"
              : "border border-aff-gold-500/40 bg-aff-ivory text-aff-gold-600",
          )}
        >
          <Icon className="h-4.5 w-4.5" strokeWidth={1.9} aria-hidden="true" />
        </span>
        <h2 className="font-display text-[20px] font-semibold text-aff-green-900">
          {title}
        </h2>
        <span className="rounded-full border border-aff-gold-500/40 bg-aff-ivory px-2.5 py-0.5 font-sans text-[12px] font-semibold tabular-nums text-aff-gold-600">
          {items.length}
        </span>
        <span
          aria-hidden="true"
          className="h-px flex-1 bg-gradient-to-r from-aff-gold-500/40 to-transparent"
        />
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {items.map((item) => (
          <PromotionCard key={item.id} item={item} now={now} />
        ))}
      </div>
    </section>
  );
}

export function PromotionList({ items }: { items: StockistPromotionItem[] }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());

    // Tick only while something still counts down.
    const needsTick = items.some(
      (i) =>
        i.status === "published" &&
        (!i.endsAt || Date.parse(i.endsAt) > Date.now()),
    );
    if (!needsTick) return;

    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [items]);

  if (items.length === 0) {
    return (
      <div className="relative isolate flex flex-col items-center gap-3 overflow-hidden rounded-3xl border border-dashed border-aff-gold-500/50 bg-aff-ivory px-6 py-16 text-center">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-16 left-1/2 -z-10 h-40 w-40 -translate-x-1/2 rounded-full bg-aff-gold-400/20 blur-3xl"
        />
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-aff-gold-300 via-aff-gold-400 to-aff-gold-600 text-aff-green-950 shadow-md">
          <Gift className="h-7 w-7" strokeWidth={1.8} aria-hidden="true" />
        </span>
        <p className="font-display text-[20px] font-semibold text-aff-green-900">
          No promotions yet
        </p>
        <p className="max-w-sm font-sans text-[14px] leading-relaxed text-aff-muted">
          When Finasto™ runs an offer for stockists, it will show up here.
        </p>
      </div>
    );
  }

  if (now === null) {
    return (
      <div
        aria-hidden="true"
        className="grid grid-cols-1 gap-5 xl:grid-cols-2"
      >
        {[0, 1].map((i) => (
          <div
            key={i}
            className="overflow-hidden rounded-3xl border border-aff-gold-500/20 bg-aff-ivory"
          >
            <div className="aspect-[16/9] animate-pulse bg-aff-gold-500/15 motion-reduce:animate-none" />
            <div className="flex flex-col gap-3 p-5">
              <div className="h-3 w-3/4 animate-pulse rounded-full bg-aff-gold-500/15 motion-reduce:animate-none" />
              <div className="h-3 w-1/2 animate-pulse rounded-full bg-aff-gold-500/15 motion-reduce:animate-none" />
              <div className="mt-2 h-20 animate-pulse rounded-2xl bg-aff-gold-500/10 motion-reduce:animate-none" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const live: StockistPromotionItem[] = [];
  const upcoming: StockistPromotionItem[] = [];
  const past: StockistPromotionItem[] = [];

  for (const item of items) {
    const phase = getPhase(item, now);
    if (phase === "live") live.push(item);
    else if (phase === "scheduled") upcoming.push(item);
    else past.push(item);
  }

  return (
    <div className="flex flex-col gap-10">
      <Section title="Live now" icon={Flame} highlight items={live} now={now} />
      <Section title="Coming soon" icon={CalendarClock} items={upcoming} now={now} />
      <Section title="Past promotions" icon={History} items={past} now={now} />
    </div>
  );
}