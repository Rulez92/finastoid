// import { Percent } from "lucide-react";

// // Read-only card: the rate is calculated automatically from monthly
// // sales (or a custom override set by the admin). The affiliate can only
// // see it. No client code needed, so this stays a server component.

// export function CommissionCard({
//   commissionPercent,
//   commissionTier,
// }: {
//   commissionPercent: number;
//   commissionTier: string;
// }) {
//   const isSet = commissionPercent > 0;

//    return (
//     <section className="rounded-2xl bg-gradient-to-br from-aff-gold-600 via-aff-gold-300 to-aff-gold-500 p-[1.5px] shadow-[0_18px_44px_-20px_rgba(172,131,78,0.55)]">
//       <div className="relative isolate overflow-hidden rounded-[15px] bg-gradient-to-br from-aff-green-950 via-aff-green-900 to-aff-green-800 p-5 sm:p-6">
//         {/* thin gold line on top */}
//         <span
//           aria-hidden="true"
//           className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-aff-gold-300 to-transparent"
//         />

//         <div className="flex items-start justify-between gap-4">
//           <div className="min-w-0">
//             <h1 className="font-display text-[25px] leading-tight text-aff-gold-300">
//   Commission rate
// </h1>
//             <p className="mt-1 max-w-md font-sans text-[13px] leading-relaxed text-aff-cream-50/75">
//               {isSet
//                 ? "Your earnings share per eligible sale, based on your monthly sales tier."
//                 : "Your commission rate is not available yet. Please contact the Finasto team."}
//             </p>
//           </div>

//           <div className="flex shrink-0 items-center gap-3 rounded-xl border border-aff-gold-400/40 bg-aff-green-950/60 px-4 py-3">
//             <div className="text-right">
//               <span className="font-display text-[26px] leading-none tabular-nums text-aff-gold-300">
//                 {isSet ? `${commissionPercent}%` : "Not set"}
//               </span>
//               {isSet && (
//                 <p className="mt-1 font-sans text-[12px] text-aff-cream-50/75">
//                   {commissionTier} tier
//                 </p>
//               )}
//             </div>
//           </div>
//         </div>
//       </div>
//     </section>
//   );
// }
// Read-only card: the rate is calculated automatically from monthly
// sales (or a custom override set by the admin). The affiliate can only
// see it. No client code needed, so this stays a server component.
//
// Left: a progress ring (sales progress toward the next tier).
// Right: tier steps, a month timer line, and one summary sentence.
// Monthly sales is in USD. The month is a UTC calendar month.

const TIERS = [
  { name: "Basic", minSales: 0, percent: 15 },
  { name: "Plus", minSales: 100, percent: 18 },
  { name: "Superior", minSales: 300, percent: 21 },
  { name: "Champion", minSales: 500, percent: 24 },
] as const;

const DAY = 24 * 60 * 60 * 1000;
const R = 52;
const CIRC = 2 * Math.PI * R;

const clamp = (n: number) => Math.min(1, Math.max(0, n));

export function CommissionCard({
  commissionPercent,
  commissionTier,
  monthlySales = 0,
}: {
  commissionPercent: number;
  commissionTier: string;
  monthlySales?: number;
}) {
  const isSet = commissionPercent > 0;
  const isCustom = commissionTier === "Custom";

  const idx = Math.max(
    0,
    TIERS.findIndex((t) => t.name === commissionTier),
  );
  const current = TIERS[idx];
  const next = !isCustom ? TIERS[idx + 1] : undefined;

  const rawProgress = isCustom
    ? 1
    : next
      ? clamp(
          (monthlySales - current.minSales) / (next.minSales - current.minSales),
        )
      : 1;
  // Always show a small visible arc so the ring never looks empty.
  const ringProgress = Math.max(rawProgress, 0.04);
  const remaining = next
    ? Math.max(0, Math.ceil(next.minSales - monthlySales))
    : 0;

  // UTC calendar month, so server and viewer always agree.
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const monthStart = Date.UTC(y, m, 1);
  const monthEnd = Date.UTC(y, m + 1, 1);
  const monthProgress = clamp(
    (now.getTime() - monthStart) / (monthEnd - monthStart),
  );
  const daysLeft = Math.max(1, Math.ceil((monthEnd - now.getTime()) / DAY));
  const resetLabel = new Date(monthEnd).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });

  const summary = isCustom
    ? "A custom rate was set for you by the Finasto team."
    : next
      ? `$${remaining} more in ${daysLeft} day${daysLeft === 1 ? "" : "s"} to reach ${next.name} (${next.percent}%).`
      : "You are on the top tier. Keep it up this month.";

  return (
    <section className="rounded-2xl bg-gradient-to-br from-aff-gold-600 via-aff-gold-300 to-aff-gold-500 p-[1.5px] shadow-[0_18px_44px_-20px_rgba(172,131,78,0.55)]">
      <style>{`@keyframes aff-ring-draw{from{stroke-dashoffset:${CIRC}}}`}</style>

      <div className="relative isolate overflow-hidden rounded-[15px] bg-gradient-to-br from-aff-green-950 via-aff-green-900 to-aff-green-800 p-5 sm:p-6">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-aff-gold-300 to-transparent"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-aff-gold-300/10 blur-3xl"
        />

        {!isSet ? (
          <p className="font-sans text-[13px] leading-relaxed text-aff-cream-50/75">
            Your commission rate is not available yet. Please contact the
            Finasto team.
          </p>
        ) : (
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-8">
            {/* Ring */}
            {/* <div className="relative h-36 w-36 shrink-0 sm:h-40 sm:w-40">
              <svg
                viewBox="0 0 120 120"
                className="h-full w-full -rotate-90"
                role="img"
                aria-label={
                  isCustom
                    ? "Custom commission rate"
                    : next
                      ? `${Math.round(rawProgress * 100)}% of the way to ${next.name}`
                      : "Top tier reached"
                }
              >
                <circle
                  cx="60"
                  cy="60"
                  r={R}
                  fill="none"
                  strokeWidth="9"
                  className="stroke-aff-cream-50/10"
                />
                <circle
                  cx="60"
                  cy="60"
                  r={R}
                  fill="none"
                  strokeWidth="9"
                  strokeLinecap="round"
                  strokeDasharray={CIRC}
                  strokeDashoffset={CIRC * (1 - ringProgress)}
                  className="stroke-aff-gold-300 drop-shadow-[0_0_6px_rgba(241,204,156,0.6)] motion-safe:[animation:aff-ring-draw_1.1s_ease-out]"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="font-display text-[30px] leading-none tabular-nums text-aff-gold-300 sm:text-[34px]">
                  {commissionPercent}%
                </span>
                <span className="mt-1 font-sans text-[11px] uppercase tracking-[0.14em] text-aff-cream-50/75">
                  {isCustom ? "Custom rate" : `${commissionTier} tier`}
                </span>
              </div>
            </div> */}

            {/* Steps + timer + summary */}
            <div className="flex w-full min-w-0 flex-1 flex-col gap-5">
              {/* Tier steps */}
              {!isCustom && (
                <ol className="grid grid-cols-4 gap-1.5 sm:gap-3">
                  {TIERS.map((t, i) => {
                    const reached = i <= idx;
                    const isCurrent = i === idx;
                    return (
                      <li
                        key={t.name}
                        className="flex min-w-0 flex-col items-center text-center"
                      >
                        <span
                          className={
                            isCurrent
                              ? "h-3.5 w-3.5 rounded-full bg-aff-gold-300 shadow-[0_0_12px_3px_rgba(241,204,156,0.7)]"
                              : reached
                                ? "h-3 w-3 rounded-full bg-aff-gold-500"
                                : "h-3 w-3 rounded-full border border-aff-cream-50/30"
                          }
                        />
                        <span
                          className={
                            "mt-1.5 max-w-full truncate font-sans  " +
                            (isCurrent
                              ? "font-semibold text-aff-gold-300"
                              : "text-aff-cream-50/65")
                          }
                        >
                          {t.name}
                        </span>
                        <span className="font-sans text-[10px] tabular-nums text-aff-cream-50/50 sm:text-[11px]">
                          {t.percent}%
                        </span>
                      </li>
                    );
                  })}
                </ol>
              )}

              {/* Timer line */}
              <div>
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 font-sans text-[12px] text-aff-cream-50/75">
                  <span>
                    {daysLeft} day{daysLeft === 1 ? "" : "s"} left this month
                  </span>
                  <span className="text-aff-cream-50/55">
                    Resets on {resetLabel}
                  </span>
                </div>
                <div
                  className="relative mt-2 h-1.5 w-full rounded-full bg-aff-cream-50/10"
                  role="progressbar"
                  aria-label="Month progress"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(monthProgress * 100)}
                >
                  <span
                    className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-aff-gold-600 via-aff-gold-300 to-aff-gold-500"
                    style={{ width: `${monthProgress * 100}%` }}
                  />
                  <span
                    aria-hidden="true"
                    className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-aff-gold-300 shadow-[0_0_10px_2px_rgba(241,204,156,0.7)]"
                    style={{ left: `${monthProgress * 100}%` }}
                  />
                </div>
              </div>

              {/* Summary */}
              <p className="rounded-xl border border-aff-gold-400/30 bg-aff-green-950/50 px-3 py-2.5 font-sans text-[13px] leading-relaxed text-aff-cream-50/85">
                {summary}
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}