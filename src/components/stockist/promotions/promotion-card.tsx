// import {
//   BadgePercent,
//   Banknote,
//   CalendarClock,
//   ChevronDown,
//   Gift,
//   Plane,
//   ScrollText,
//   Sparkles,
//   Target,
//   Trophy,
//   type LucideIcon,
// } from "lucide-react";
// import dayjs from "dayjs";
// import { cn } from "@/lib/utils";
// import type { StockistPromotionItem } from "@/lib/stockist/promotion-queries";
// import {
//   OFFER_LABEL,
//   formatTarget,
//   getPhase,
//   pad,
//   splitCountdown,
//   type Phase,
// } from "./promotion-phase";

// // One promotion card. No hooks: the list passes `now` in (it owns the single
// // 1-second timer), so this renders only after mount and never mismatches.

// const DATE_FORMAT = "DD MMM YYYY, HH:mm";

// const OFFER_ICON: Record<StockistPromotionItem["offerType"], LucideIcon> = {
//   free_tour: Plane,
//   cash_prize: Banknote,
//   bonus: Sparkles,
//   discount: BadgePercent,
//   other: Gift,
// };

// const PHASE_TAG: Record<Phase, { label: string; className: string }> = {
//   live: {
//     label: "Live now",
//     className:
//       "border-aff-gold-400/50 bg-aff-green-950 text-aff-gold-300",
//   },
//   scheduled: {
//     label: "Coming soon",
//     className: "border-aff-gold-500/50 bg-aff-cream-50 text-aff-green-900",
//   },
//   ended: {
//     label: "Ended",
//     className: "border-aff-cream-50/20 bg-aff-green-950/85 text-aff-cream-50/80",
//   },
//   rewarded: {
//     label: "Rewarded",
//     className:
//       "border-transparent bg-gradient-to-r from-aff-gold-300 via-aff-gold-400 to-aff-gold-600 text-aff-green-950",
//   },
// };

// // Same hover (mouse) and press (touch) feel as the tier tiles.
// const cardFx =
//   "transition-all duration-300 ease-out " +
//   "[@media(hover:hover)]:hover:-translate-y-0.5 " +
//   "[@media(hover:hover)]:hover:shadow-[0_10px_28px_-8px_rgba(201,162,39,0.5)] " +
//   "active:scale-[0.99] motion-reduce:transition-none motion-reduce:transform-none";

// export function PromotionCard({
//   item,
//   now,
// }: {
//   item: StockistPromotionItem;
//   now: number;
// }) {
//   const phase = getPhase(item, now);
//   const tag = PHASE_TAG[phase];
//   const OfferIcon = OFFER_ICON[item.offerType];
//   const target = formatTarget(item);

//   // Scheduled counts down to the start, Live counts down to the end.
//   const countdownTo =
//     phase === "scheduled"
//       ? Date.parse(item.startsAt)
//       : phase === "live" && item.endsAt
//         ? Date.parse(item.endsAt)
//         : null;
//   const cd = countdownTo !== null ? splitCountdown(countdownTo - now) : null;

//   return (
//     <article
//       className={cn(
//         "relative isolate flex min-w-0 flex-col overflow-hidden rounded-2xl border border-aff-gold-500/40 bg-aff-ivory shadow-sm",
//         cardFx,
//       )}
//     >
//       {/* Banner (or a green hero when there is no image) */}
//       <div className="relative aspect-[16/8] w-full overflow-hidden bg-gradient-to-br from-aff-green-950 via-aff-green-900 to-aff-green-800 sm:aspect-[16/7]">
//         {item.bannerUrl ? (
//           // eslint-disable-next-line @next/next/no-img-element
//           <img
//             src={item.bannerUrl}
//             alt=""
//             loading="lazy"
//             className="h-full w-full object-cover"
//           />
//         ) : (
//           <div className="flex h-full w-full items-center justify-center">
//             <OfferIcon
//               className="h-14 w-14 text-aff-gold-300/80"
//               strokeWidth={1.4}
//               aria-hidden="true"
//             />
//           </div>
//         )}
//         <span
//           aria-hidden="true"
//           className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-aff-gold-300 to-transparent"
//         />
//         <span
//           aria-hidden="true"
//           className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-aff-green-950/60 to-transparent"
//         />

//         <span
//           className={cn(
//             "absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-sans text-[11px] font-semibold uppercase tracking-[0.14em] shadow-sm",
//             tag.className,
//           )}
//         >
//           {phase === "live" && (
//             <span
//               aria-hidden="true"
//               className="h-1.5 w-1.5 animate-pulse rounded-full bg-aff-gold-300 motion-reduce:animate-none"
//             />
//           )}
//           {tag.label}
//         </span>
//       </div>

//       <div className="flex flex-1 flex-col gap-4 p-4 sm:p-5">
//         <div className="min-w-0">
//           <h3 className="break-words font-display text-[20px] font-semibold leading-tight text-aff-green-900 sm:text-[22px]">
//             {item.title}
//           </h3>
//           {item.description && (
//             <p className="mt-2 whitespace-pre-line break-words font-sans text-[13px] leading-relaxed text-aff-muted">
//               {item.description}
//             </p>
//           )}
//         </div>

//         {/* Reward + target */}
//         <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
//           <div
//             className={cn(
//               "relative isolate overflow-hidden rounded-xl bg-gradient-to-br from-aff-green-950 via-aff-green-900 to-aff-green-800 p-4",
//               !target && "min-[420px]:col-span-2",
//             )}
//           >
//             <span
//               aria-hidden="true"
//               className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-aff-gold-300 to-transparent"
//             />
//             <p className="flex items-center gap-1.5 font-sans text-[11px] font-medium uppercase tracking-[0.16em] text-aff-cream-50/65">
//               <OfferIcon
//                 className="h-3.5 w-3.5 text-aff-gold-300"
//                 strokeWidth={1.8}
//                 aria-hidden="true"
//               />
//               {OFFER_LABEL[item.offerType]}
//             </p>
//             <p className="mt-2 break-words bg-gradient-to-r from-aff-gold-600 via-aff-gold-300 to-aff-gold-500 bg-clip-text font-display text-[20px] font-semibold leading-tight text-transparent sm:text-[22px]">
//               {item.rewardDetails || OFFER_LABEL[item.offerType]}
//             </p>
//           </div>

//           {target && (
//             <div className="rounded-xl border border-aff-gold-500/40 bg-aff-ivory p-4">
//               <p className="flex items-center gap-1.5 font-sans text-[11px] font-medium uppercase tracking-[0.16em] text-aff-muted">
//                 <Target
//                   className="h-3.5 w-3.5 text-aff-gold-600"
//                   strokeWidth={1.8}
//                   aria-hidden="true"
//                 />
//                 Target
//               </p>
//               <p className="mt-2 break-words font-display text-[20px] font-semibold leading-tight tabular-nums text-aff-green-900 sm:text-[22px]">
//                 {target}
//               </p>
//             </div>
//           )}
//         </div>

//         {/* Countdown (scheduled / live) */}
//         {cd && (
//           <div
//             role="timer"
//             aria-label={phase === "scheduled" ? "Time until start" : "Time left"}
//             className="relative isolate overflow-hidden rounded-xl bg-gradient-to-br from-aff-green-950 via-aff-green-900 to-aff-green-800 p-3 sm:p-4"
//           >
//             <span
//               aria-hidden="true"
//               className="pointer-events-none absolute -right-10 -top-10 -z-10 h-32 w-32 rounded-full bg-aff-gold-400/15 blur-2xl"
//             />
//             <p className="mb-2 font-sans text-[11px] font-medium uppercase tracking-[0.16em] text-aff-cream-50/65">
//               {phase === "scheduled" ? "Starts in" : "Ends in"}
//             </p>
//             <div className="grid grid-cols-4 gap-2">
//               {(
//                 [
//                   ["Days", cd.days],
//                   ["Hrs", cd.hours],
//                   ["Min", cd.minutes],
//                   ["Sec", cd.seconds],
//                 ] as const
//               ).map(([label, value]) => (
//                 <div
//                   key={label}
//                   className="rounded-lg border border-aff-gold-400/30 bg-aff-cream-50/5 px-1 py-2 text-center"
//                 >
//                   <div className="font-display text-[20px] font-semibold leading-none tabular-nums text-aff-gold-300 sm:text-[26px]">
//                     {label === "Days" ? value : pad(value)}
//                   </div>
//                   <div className="mt-1 font-sans text-[10px] uppercase tracking-[0.14em] text-aff-cream-50/65">
//                     {label}
//                   </div>
//                 </div>
//               ))}
//             </div>
//           </div>
//         )}

//         {phase === "ended" && (
//           <div className="flex items-start gap-2.5 rounded-xl border border-aff-gold-500/30 bg-aff-cream-50 p-3.5 font-sans text-[13px] leading-relaxed text-aff-green-900">
//             <Trophy
//               className="mt-0.5 h-4 w-4 shrink-0 text-aff-gold-600"
//               strokeWidth={1.8}
//               aria-hidden="true"
//             />
//             This promotion has ended. The Finasto™ team will contact the
//             winners.
//           </div>
//         )}

//         {phase === "rewarded" && (
//           <div className="flex items-start gap-2.5 rounded-xl border border-aff-gold-500/40 bg-gradient-to-r from-aff-gold-300/30 to-aff-gold-500/20 p-3.5 font-sans text-[13px] leading-relaxed text-aff-green-900">
//             <Trophy
//               className="mt-0.5 h-4 w-4 shrink-0 text-aff-gold-600"
//               strokeWidth={1.8}
//               aria-hidden="true"
//             />
//             Rewards for this promotion have been given out.
//           </div>
//         )}

//         {/* Dates */}
//         <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-sans text-[12px] text-aff-muted">
//           <CalendarClock
//             className="h-3.5 w-3.5 shrink-0 text-aff-gold-600"
//             strokeWidth={1.8}
//             aria-hidden="true"
//           />
//           <span>From {dayjs(item.startsAt).format(DATE_FORMAT)}</span>
//           {item.endsAt && (
//             <span>· Until {dayjs(item.endsAt).format(DATE_FORMAT)}</span>
//           )}
//         </p>

//         {/* Terms (native details: works on touch, no JS) */}
//         {item.terms && (
//           <details className="group mt-auto rounded-xl border border-aff-gold-500/30 bg-white/60 px-3.5 py-2.5">
//             <summary className="flex cursor-pointer list-none items-center gap-2 font-sans text-[13px] font-semibold text-aff-green-900 [&::-webkit-details-marker]:hidden">
//               <ScrollText
//                 className="h-4 w-4 text-aff-gold-600"
//                 strokeWidth={1.8}
//                 aria-hidden="true"
//               />
//               Terms &amp; conditions
//               <ChevronDown
//                 className="ml-auto h-4 w-4 text-aff-gold-600 transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
//                 strokeWidth={2}
//                 aria-hidden="true"
//               />
//             </summary>
//             <p className="mt-2 whitespace-pre-line break-words font-sans text-[12.5px] leading-relaxed text-aff-muted">
//               {item.terms}
//             </p>
//           </details>
//         )}
//       </div>
//     </article>
//   );
// }
import {
  BadgePercent,
  Banknote,
  CalendarClock,
  ChevronDown,
  Gift,
  Plane,
  ScrollText,
  Sparkles,
  Target,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import dayjs from "dayjs";
import { cn } from "@/lib/utils";
import type { StockistPromotionItem } from "@/lib/stockist/promotion-queries";
import {
  OFFER_LABEL,
  formatTarget,
  getPhase,
  pad,
  splitCountdown,
  type Phase,
} from "./promotion-phase";

// One promotion card. No hooks: the list passes `now` in (it owns the single
// 1-second timer), so this renders only after mount and never mismatches.

const DATE_FORMAT = "DD MMM YYYY, HH:mm";

const OFFER_ICON: Record<StockistPromotionItem["offerType"], LucideIcon> = {
  free_tour: Plane,
  cash_prize: Banknote,
  bonus: Sparkles,
  discount: BadgePercent,
  other: Gift,
};

const PHASE_TAG: Record<Phase, { label: string; className: string }> = {
  live: {
    label: "Live now",
    className: "border-aff-gold-300/60 bg-aff-green-950/80 text-aff-gold-300",
  },
  scheduled: {
    label: "Coming soon",
    className: "border-aff-gold-500/50 bg-aff-cream-50/90 text-aff-green-900",
  },
  ended: {
    label: "Ended",
    className: "border-white/20 bg-aff-green-950/80 text-aff-cream-50/80",
  },
  rewarded: {
    label: "Rewarded",
    className:
      "border-transparent bg-gradient-to-r from-aff-gold-300 via-aff-gold-400 to-aff-gold-600 text-aff-green-950",
  },
};

// Hover (mouse) and press (touch) feel.
const cardFx =
  "transition-all duration-300 ease-out " +
  "[@media(hover:hover)]:hover:-translate-y-1 " +
  "[@media(hover:hover)]:hover:shadow-[0_18px_40px_-14px_rgba(201,162,39,0.55)] " +
  "active:scale-[0.99] motion-reduce:transition-none motion-reduce:transform-none";

export function PromotionCard({
  item,
  now,
}: {
  item: StockistPromotionItem;
  now: number;
}) {
  const phase = getPhase(item, now);
  const tag = PHASE_TAG[phase];
  const OfferIcon = OFFER_ICON[item.offerType];
  const target = formatTarget(item);
  const isPast = phase === "ended" || phase === "rewarded";

  const start = Date.parse(item.startsAt);
  const end = item.endsAt ? Date.parse(item.endsAt) : null;

  // Scheduled counts down to the start, Live counts down to the end.
  const countdownTo =
    phase === "scheduled" ? start : phase === "live" && end ? end : null;
  const cd = countdownTo !== null ? splitCountdown(countdownTo - now) : null;

  // How far through a live promotion we are (0-100).
  const progress =
    phase === "live" && end && end > start
      ? Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100))
      : null;

  return (
    <article
      className={cn(
        "group relative isolate flex min-w-0 flex-col overflow-hidden rounded-3xl border bg-aff-ivory shadow-sm",
        phase === "live"
          ? "border-aff-gold-400/70 ring-1 ring-aff-gold-300/40"
          : "border-aff-gold-500/30",
        cardFx,
      )}
    >
      {/* Banner: image (or green hero), status, offer type and title */}
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-gradient-to-br from-aff-green-950 via-aff-green-900 to-aff-green-800">
        {item.bannerUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.bannerUrl}
            alt=""
            loading="lazy"
            className={cn(
              "h-full w-full object-cover transition-transform duration-700 ease-out motion-reduce:transition-none",
              "[@media(hover:hover)]:group-hover:scale-105",
              isPast && "saturate-50",
            )}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <OfferIcon
              className="h-16 w-16 text-aff-gold-300/70"
              strokeWidth={1.2}
              aria-hidden="true"
            />
          </div>
        )}

        {/* Legibility layer for the text on the image */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-aff-green-950/90 via-aff-green-950/30 to-transparent"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-aff-gold-300 to-transparent"
        />

        <span
          className={cn(
            "absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-sans text-[12px] font-semibold backdrop-blur-md",
            tag.className,
          )}
        >
          {phase === "live" && (
            <span className="relative flex h-2 w-2">
              <span
                aria-hidden="true"
                className="absolute inline-flex h-full w-full animate-ping rounded-full bg-aff-gold-300 opacity-70 motion-reduce:animate-none"
              />
              <span
                aria-hidden="true"
                className="relative inline-flex h-2 w-2 rounded-full bg-aff-gold-300"
              />
            </span>
          )}
          {tag.label}
        </span>

        <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-aff-green-950/60 px-3 py-1 font-sans text-[12px] font-medium text-aff-cream-50 backdrop-blur-md">
          <OfferIcon
            className="h-3.5 w-3.5 text-aff-gold-300"
            strokeWidth={1.8}
            aria-hidden="true"
          />
          {OFFER_LABEL[item.offerType]}
        </span>

        <h3 className="absolute inset-x-0 bottom-0 line-clamp-2 break-words px-4 pb-4 font-display text-[22px] font-semibold leading-tight text-aff-cream-50 drop-shadow-sm sm:px-5 sm:text-[26px]">
          {item.title}
        </h3>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-4 sm:p-5">
        {item.description && (
          <p className="whitespace-pre-line break-words font-sans text-[14px] leading-relaxed text-aff-muted">
            {item.description}
          </p>
        )}

        {/* The prize: the one thing the card is about */}
        <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-5">
          <div
            className={cn(
              "relative isolate flex items-center gap-3.5 overflow-hidden rounded-2xl bg-gradient-to-br from-aff-green-950 via-aff-green-900 to-aff-green-800 p-4",
              target ? "min-[420px]:col-span-3" : "min-[420px]:col-span-5",
            )}
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -right-8 -top-8 -z-10 h-28 w-28 rounded-full bg-aff-gold-400/20 blur-2xl"
            />
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-aff-gold-300 via-aff-gold-400 to-aff-gold-600 text-aff-green-950 shadow-md">
              <OfferIcon className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="font-sans text-[12px] font-medium text-aff-cream-50/70">
                Reward
              </p>
              <p className="mt-0.5 break-words bg-gradient-to-r from-aff-gold-500 via-aff-gold-300 to-aff-gold-400 bg-clip-text font-display text-[19px] font-semibold leading-tight text-transparent sm:text-[21px]">
                {item.rewardDetails || OFFER_LABEL[item.offerType]}
              </p>
            </div>
          </div>

          {target && (
            <div className="flex flex-col justify-center rounded-2xl border border-aff-gold-500/40 bg-aff-cream-50 p-4 min-[420px]:col-span-2">
              <p className="flex items-center gap-1.5 font-sans text-[12px] font-medium text-aff-muted">
                <Target
                  className="h-3.5 w-3.5 text-aff-gold-600"
                  strokeWidth={1.8}
                  aria-hidden="true"
                />
                Your target
              </p>
              <p className="mt-1 break-words font-display text-[19px] font-semibold leading-tight tabular-nums text-aff-green-900 sm:text-[21px]">
                {target}
              </p>
            </div>
          )}
        </div>

        {/* Countdown (scheduled / live) */}
        {cd && (
          <div
            role="timer"
            aria-label={phase === "scheduled" ? "Time until start" : "Time left"}
            className="rounded-2xl border border-aff-gold-500/30 bg-aff-cream-50 p-3 sm:p-4"
          >
            <p className="mb-2.5 font-sans text-[13px] font-semibold text-aff-green-900">
              {phase === "scheduled" ? "Starts in" : "Ends in"}
            </p>
            <div className="grid grid-cols-4 gap-2">
              {(
                [
                  ["Days", cd.days],
                  ["Hours", cd.hours],
                  ["Min", cd.minutes],
                  ["Sec", cd.seconds],
                ] as const
              ).map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-xl bg-aff-green-950 px-1 py-2.5 text-center shadow-inner"
                >
                  <div className="font-display text-[22px] font-semibold leading-none tabular-nums text-aff-gold-300 sm:text-[28px]">
                    {label === "Days" ? value : pad(value)}
                  </div>
                  <div className="mt-1.5 font-sans text-[11px] text-aff-cream-50/65">
                    {label}
                  </div>
                </div>
              ))}
            </div>

            {progress !== null && (
              <div
                className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-aff-gold-500/20"
                role="progressbar"
                aria-label="Promotion progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progress)}
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-aff-gold-600 via-aff-gold-400 to-aff-gold-300 transition-[width] duration-1000 ease-linear motion-reduce:transition-none"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </div>
        )}

        {phase === "ended" && (
          <div className="flex items-start gap-2.5 rounded-2xl border border-aff-gold-500/30 bg-aff-cream-50 p-3.5 font-sans text-[13px] leading-relaxed text-aff-green-900">
            <Trophy
              className="mt-0.5 h-4 w-4 shrink-0 text-aff-gold-600"
              strokeWidth={1.8}
              aria-hidden="true"
            />
            This promotion has ended. The Finasto™ team will contact the
            winners.
          </div>
        )}

        {phase === "rewarded" && (
          <div className="flex items-start gap-2.5 rounded-2xl border border-aff-gold-500/40 bg-gradient-to-r from-aff-gold-300/30 to-aff-gold-500/20 p-3.5 font-sans text-[13px] leading-relaxed text-aff-green-900">
            <Trophy
              className="mt-0.5 h-4 w-4 shrink-0 text-aff-gold-600"
              strokeWidth={1.8}
              aria-hidden="true"
            />
            Rewards for this promotion have been given out.
          </div>
        )}

        {/* Dates */}
        <div className="flex items-start gap-3 font-sans text-[13px] text-aff-muted">
          <CalendarClock
            className="mt-0.5 h-4 w-4 shrink-0 text-aff-gold-600"
            strokeWidth={1.8}
            aria-hidden="true"
          />
          <dl className="grid flex-1 grid-cols-1 gap-x-6 gap-y-1 min-[420px]:grid-cols-2">
            <div>
              <dt className="text-[12px]">Starts</dt>
              <dd className="font-medium text-aff-green-900">
                {dayjs(item.startsAt).format(DATE_FORMAT)}
              </dd>
            </div>
            <div>
              <dt className="text-[12px]">Ends</dt>
              <dd className="font-medium text-aff-green-900">
                {item.endsAt
                  ? dayjs(item.endsAt).format(DATE_FORMAT)
                  : "No end date"}
              </dd>
            </div>
          </dl>
        </div>

        {/* Terms (native details: works on touch, no JS) */}
        {item.terms && (
          <details className="group/terms mt-auto rounded-2xl border border-aff-gold-500/30 bg-white/60 px-4 py-3 open:bg-white">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg font-sans text-[14px] font-semibold text-aff-green-900 outline-none focus-visible:ring-2 focus-visible:ring-aff-gold-500 [&::-webkit-details-marker]:hidden">
              <ScrollText
                className="h-4 w-4 text-aff-gold-600"
                strokeWidth={1.8}
                aria-hidden="true"
              />
              Terms &amp; conditions
              <ChevronDown
                className="ml-auto h-4 w-4 text-aff-gold-600 transition-transform duration-200 group-open/terms:rotate-180 motion-reduce:transition-none"
                strokeWidth={2}
                aria-hidden="true"
              />
            </summary>
            <p className="mt-3 whitespace-pre-line break-words border-t border-aff-gold-500/20 pt-3 font-sans text-[13px] leading-relaxed text-aff-muted">
              {item.terms}
            </p>
          </details>
        )}
      </div>
    </article>
  );
}