// import { Card } from "antd";
// import { BadgePercent, Lock } from "lucide-react";

// // Read-only card. The tier is set by the Finasto admin, so the stockist can
// // see it but never change it. No "use client" needed: nothing interactive.

// export function StockistTierCard({
//   tierName,
//   purchaseAmount,
//   commissionPercent,
// }: {
//   tierName: string;
//   purchaseAmount: number;
//   commissionPercent: number;
// }) {
//   return (
//     <Card
//       className="aff-card aff-antd-card"
//       bordered={false}
//       title={
//         <div className="flex items-center gap-3">
//           <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-aff-gold-300 via-aff-gold-400 to-aff-gold-600 text-aff-green-950">
//             <BadgePercent
//               className="h-5 w-5"
//               strokeWidth={1.8}
//               aria-hidden="true"
//             />
//           </span>
//           <div className="min-w-0 whitespace-normal leading-tight">
//             <div className="font-display text-[18px] font-semibold text-aff-green-900">
//               Your associate tier
//             </div>
//             <div className="font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-aff-gold-600">
//               Set by Finasto™
//             </div>
//           </div>
//         </div>
//       }
//       extra={
//         <span className="inline-flex items-center gap-1.5 font-sans text-[12px] text-aff-muted">
//           <Lock className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" />
//           Read only
//         </span>
//       }
//     >
//       <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
//         <div>
//           <dt className="font-sans text-[12px] text-aff-muted">Tier</dt>
//           <dd className="mt-1 font-display text-[20px] leading-tight text-aff-green-900">
//             {tierName}
//           </dd>
//         </div>
//         <div>
//           <dt className="font-sans text-[12px] text-aff-muted">Package</dt>
//           <dd className="mt-1 font-display text-[20px] leading-tight tabular-nums text-aff-green-900">
//             ${purchaseAmount.toLocaleString("en-US")}
//           </dd>
//         </div>
//         <div>
//           <dt className="font-sans text-[12px] text-aff-muted">Commission</dt>
//           <dd className="mt-1 font-display text-[20px] leading-tight tabular-nums text-aff-green-900">
//             {commissionPercent}%
//           </dd>
//         </div>
//       </dl>

//       <p className="mt-4 font-sans text-[13px] leading-relaxed text-aff-muted">
//         You earn this commission on verified sales of the affiliates assigned
//         to you. Only verified sales count, and each sale keeps the rate that
//         applied when it was verified. To change your tier, contact the Finasto
//         team.
//       </p>
//     </Card>
//   );
// }


import { Card } from "antd";
import { BadgePercent, Lock, Package, TrendingUp } from "lucide-react";

// Read-only card. The tier is set by the Finasto admin, so the stockist can
// see it but never change it. No "use client" needed: nothing interactive.

const tileFx =
  "transition-all duration-300 ease-out cursor-default " +
  "[@media(hover:hover)]:hover:-translate-y-0.5 " +
  "[@media(hover:hover)]:hover:shadow-[0_10px_28px_-8px_rgba(201,162,39,0.5)] " +
  "active:translate-y-0 active:scale-[0.98] " +
  "active:shadow-[0_6px_18px_-8px_rgba(201,162,39,0.45)] " +
  "motion-reduce:transition-none motion-reduce:transform-none";
export function StockistTierCard({
  tierName,
  purchaseAmount,
  commissionPercent,
}: {
  tierName: string;
  purchaseAmount: number;
  commissionPercent: number;
}) {
  return (
    <Card
      className="aff-card aff-antd-card overflow-hidden"
      bordered={false}
      title={
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-aff-gold-300 via-aff-gold-400 to-aff-gold-600 text-aff-green-950">
            <BadgePercent
              className="h-5 w-5"
              strokeWidth={1.8}
              aria-hidden="true"
            />
          </span>
          <div className="min-w-0 whitespace-normal leading-tight">
            <div className="font-display text-[18px] font-semibold text-aff-green-900">
              Your Associate Program
            </div>
            <div className="font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-aff-gold-600">
              Set by Finasto™
            </div>
          </div>
        </div>
      }
     
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {/* Tier: dark hero tile, same look as the dashboard banner */}
        <div className={`relative isolate overflow-hidden rounded-xl bg-gradient-to-br from-aff-green-950 via-aff-green-900 to-aff-green-800 p-4 ${tileFx}`}>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-aff-gold-300 to-transparent"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -right-10 -top-10 -z-10 h-32 w-32 rounded-full bg-aff-gold-400/15 blur-2xl"
          />
          <p className="font-sans text-[11px] font-medium uppercase tracking-[0.16em] text-aff-cream-50/65">
         Associate Program
          </p>
          <p className="mt-2 break-words bg-gradient-to-r from-aff-gold-600 via-aff-gold-300 to-aff-gold-500 bg-clip-text font-display text-[24px] font-semibold leading-tight text-transparent">
            {tierName}
          </p>
        </div>

       {/* Package: mid green, premium but quieter than the hero */}
<div className={`relative isolate overflow-hidden rounded-xl border border-aff-gold-400/50 bg-gradient-to-br from-aff-gold-300 via-aff-gold-400 to-aff-gold-600 p-4 ${tileFx}`}>
  <span
    aria-hidden="true"
    className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-aff-gold-400/70 to-transparent"
  />
  <p className="flex items-center gap-1.5 font-sans text-[11px] font-medium uppercase tracking-[0.16em] text-aff-green-950">
    <Package className="h-3.5 w-3.5 text-aff-green-950" strokeWidth={1.8} aria-hidden="true" />
    Package
  </p>
  <p className="mt-2 font-display text-[24px] font-semibold leading-tight tabular-nums text-aff-green-950">
    ${purchaseAmount.toLocaleString("en-US")}
  </p>
</div>

{/* Commission: gold reward tile */}
<div className={`relative isolate overflow-hidden rounded-xl bg-gradient-to-br from-aff-green-950 via-aff-green-900 to-aff-green-800 p-4 ${tileFx}`}>
   <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-aff-gold-300 to-transparent"
          />
  <span
    aria-hidden="true"
    className="pointer-events-none absolute -right-8 -top-8 -z-10 h-28 w-28 rounded-full bg-white/25 blur-2xl"
  />
   <span
            aria-hidden="true"
            className="pointer-events-none absolute -right-10 -top-10 -z-10 h-32 w-32 rounded-full bg-aff-gold-400/15 blur-2xl"
          />
  <p className="flex items-center gap-1.5 font-sans text-[11px] font-medium uppercase tracking-[0.16em] text-aff-cream-50/65">
    <TrendingUp className="h-3.5 w-3.5 font-sans text-[11px] font-medium uppercase tracking-[0.16em] text-aff-cream-50/65" strokeWidth={1.8} aria-hidden="true" />
    Commission
  </p>
  <p className="mt-2 bg-gradient-to-r from-aff-gold-600 via-aff-gold-300 to-aff-gold-500 bg-clip-text font-display text-[24px] font-semibold leading-tight text-transparent">
    {commissionPercent}%
  </p>
</div>
      </div>

      <p className="mt-4 font-sans text-[13px] leading-relaxed text-aff-muted">
        You earn this commission on verified sales of the affiliates assigned
        to you. Only verified sales count, and each sale keeps the rate that
        applied when it was verified. To change your tier, contact the Finasto™
        team.
      </p>
    </Card>
  );
}