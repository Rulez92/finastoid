// import type { Metadata } from "next";
// import Link from "next/link";
// import { notFound } from "next/navigation";
// import { ChevronLeft, ExternalLink } from "lucide-react";
// import { formatPrice } from "@/lib/utils";
// import { getMyBulkOrder } from "@/lib/stockist/bulk-orders-queries";
// import {
//   BULK_STATUS_HINT,
//   BulkOrderStatusBadge,
// } from "@/components/stockist/bulk-orders/bulk-order-status-badge";
// import { PaymentProofForm } from "@/components/stockist/bulk-orders/payment-proof-form";
// import { CancelOrderButton } from "@/components/stockist/bulk-orders/cancel-order-button";

// // One bulk order: what was asked for, what it costs, what to do next.
// // A server component. getMyBulkOrder() calls requireRole("stockist") itself
// // and returns nothing for an order that is not the signed-in stockist's, so
// // someone else's order id shows a normal "not found" page.

// export const metadata: Metadata = {
//   title: "Bulk order",
// };

// // UTC on purpose, same as the rest of the app. The label says so.
// const dateTimeFormat = new Intl.DateTimeFormat("en-GB", {
//   day: "numeric",
//   month: "short",
//   year: "numeric",
//   hour: "2-digit",
//   minute: "2-digit",
//   hour12: false,
//   timeZone: "UTC",
// });
// const stamp = (iso: string) => `${dateTimeFormat.format(new Date(iso))} UTC`;

// export default async function StockistBulkOrderPage({
//   params,
// }: {
//   params: Promise<{ id: string }>;
// }) {
//   const { id } = await params;
//   const order = await getMyBulkOrder(id);
//   if (!order) notFound();

//   const unitsTotal = order.items.reduce((sum, i) => sum + i.quantity, 0);

//   // Dates the stockist cares about, in the order they happened.
//   const timeline: { label: string; at: string }[] = [
//     { label: "Requested", at: order.createdAt },
//   ];
//   if (order.quotedAt) {
//     timeline.push({ label: "Payment details sent", at: order.quotedAt });
//   }
//   if (order.proofSubmittedAt) {
//     timeline.push({
//       label: "Proof of payment sent",
//       at: order.proofSubmittedAt,
//     });
//   }
//   if (order.decidedAt) {
//     const label =
//       order.status === "approved"
//         ? "Approved"
//         : order.status === "rejected"
//           ? "Rejected"
//           : "Cancelled";
//     timeline.push({ label, at: order.decidedAt });
//   }

//   const showAdminNote =
//     !!order.adminNote &&
//     (order.status === "awaiting_payment" ||
//       order.status === "rejected" ||
//       order.status === "cancelled" ||
//       order.status === "approved");

//   return (
//     <div className="max-w-3xl">
//       <Link
//         href="/stockist/bulk-orders"
//         className="mb-3 inline-flex items-center gap-1 font-sans text-[13px] text-warm-gray transition-colors hover:text-copper"
//       >
//         <ChevronLeft className="h-4 w-4" aria-hidden="true" />
//         Bulk orders
//       </Link>

//       <div className="flex flex-wrap items-center gap-3">
//         <h1 className="font-display text-[28px] leading-tight text-espresso">
//           {order.displayNumber}
//         </h1>
//         <BulkOrderStatusBadge status={order.status} />
//       </div>
//       <p className="mt-2 max-w-xl font-sans text-[14px] leading-relaxed text-warm-gray">
//         {BULK_STATUS_HINT[order.status]}
//       </p>

//       {showAdminNote && (
//         <div className="mt-4 rounded-xl bg-copper/10 px-4 py-3 font-sans text-[13px] leading-relaxed text-copper">
//           <span className="font-medium">Note from Finasto: </span>
//           {order.adminNote}
//         </div>
//       )}

//       {/* Payment: the one thing to do while the order is awaiting payment */}
//       {order.status === "awaiting_payment" && (
//         <section className="mt-6 rounded-2xl border border-border-strong p-5 sm:p-6">
//           <h2 className="font-display text-[22px] leading-tight text-espresso">
//             Pay {formatPrice(order.totalUsd, "USD")}
//           </h2>
//           <p className="mt-2 font-sans text-[14px] leading-relaxed text-warm-gray">
//             Send the payment using these details, then upload your proof of
//             payment below.
//           </p>

//           <div className="mt-4 whitespace-pre-wrap break-words rounded-xl bg-cream-soft px-4 py-3 font-sans text-[14px] leading-relaxed text-espresso">
//             {order.bankDetails}
//           </div>

//           <div className="mt-6 border-t border-border pt-6">
//             <PaymentProofForm orderId={order.id} />
//           </div>
//         </section>
//       )}

//       {/* Proof already sent (or the order is done): show what was sent */}
//       {(order.status === "payment_submitted" ||
//         order.status === "approved") && (
//         <section className="mt-6 rounded-2xl border border-border p-5 sm:p-6">
//           <h2 className="font-display text-[20px] leading-tight text-espresso">
//             Payment
//           </h2>
//           <dl className="mt-3 grid gap-x-6 gap-y-3 font-sans text-[14px] sm:grid-cols-2">
//             <div>
//               <dt className="text-[12px] text-warm-gray">Amount</dt>
//               <dd className="text-espresso">
//                 {formatPrice(order.totalUsd, "USD")}
//               </dd>
//             </div>
//             {order.paymentReference && (
//               <div>
//                 <dt className="text-[12px] text-warm-gray">Reference</dt>
//                 <dd className="break-words text-espresso">
//                   {order.paymentReference}
//                 </dd>
//               </div>
//             )}
//             {order.proofUrl && (
//               <div>
//                 <dt className="text-[12px] text-warm-gray">Proof</dt>
//                 <dd>
//                   <a
//                     href={order.proofUrl}
//                     target="_blank"
//                     rel="noopener noreferrer"
//                     className="inline-flex items-center gap-1 text-copper underline underline-offset-2"
//                   >
//                     View uploaded file
//                     <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
//                   </a>
//                 </dd>
//               </div>
//             )}
//           </dl>
//         </section>
//       )}

//       {/* Items */}
//       <section className="mt-6 overflow-hidden rounded-2xl border border-border">
//         <h2 className="px-4 py-3 font-display text-[20px] leading-tight text-espresso">
//           Items
//         </h2>
//         <ul className="divide-y divide-border border-t border-border">
//           {order.items.map((item) => (
//             <li
//               key={item.id}
//               className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3"
//             >
//               <div className="min-w-0">
//                 <p className="font-sans text-[14px] font-medium text-espresso">
//                   {item.productName}
//                 </p>
//                 <p className="font-sans text-[12px] text-warm-gray">
//                   {item.packName} · {item.quantity} ×{" "}
//                   {formatPrice(item.unitPriceUsd, "USD")}
//                 </p>
//               </div>
//               <p className="font-sans text-[14px] text-espresso">
//                 {formatPrice(item.lineTotalUsd, "USD")}
//               </p>
//             </li>
//           ))}
//         </ul>
//         <div className="flex items-center justify-between gap-4 border-t border-border bg-cream-soft px-4 py-3">
//           <div>
//             <p className="font-sans text-[12px] text-warm-gray">
//               {unitsTotal} {unitsTotal === 1 ? "pack" : "packs"} · your{" "}
//               {order.discountPercent}% discount applied
//             </p>
//             <p className="font-sans text-[13px] text-espresso">Total</p>
//           </div>
//           <p className="font-display text-[24px] leading-tight text-espresso">
//             {formatPrice(order.totalUsd, "USD")}
//           </p>
//         </div>
//       </section>

//       {order.stockistNote && (
//         <section className="mt-6 rounded-2xl border border-border p-5">
//           <h2 className="font-sans text-[12px] text-warm-gray">Your note</h2>
//           <p className="mt-1 whitespace-pre-wrap break-words font-sans text-[14px] leading-relaxed text-espresso">
//             {order.stockistNote}
//           </p>
//         </section>
//       )}

//       {/* Dates */}
//       <section className="mt-6">
//         <h2 className="font-sans text-[12px] text-warm-gray">History</h2>
//         <ul className="mt-2 flex flex-col gap-1 font-sans text-[13px] text-espresso">
//           {timeline.map((t) => (
//             <li
//               key={t.label}
//               className="flex flex-wrap justify-between gap-x-4"
//             >
//               <span>{t.label}</span>
//               <span className="text-warm-gray">{stamp(t.at)}</span>
//             </li>
//           ))}
//         </ul>
//       </section>

//       {order.status === "requested" && (
//         <div className="mt-6">
//           <CancelOrderButton
//             orderId={order.id}
//             displayNumber={order.displayNumber}
//           />
//         </div>
//       )}
//     </div>
//   );
// }
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ExternalLink } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { getMyBulkOrder } from "@/lib/stockist/bulk-orders-queries";
import {
  BULK_STATUS_HINT,
  BulkOrderStatusBadge,
} from "@/components/stockist/bulk-orders/bulk-order-status-badge";
import { PaymentProofForm } from "@/components/stockist/bulk-orders/payment-proof-form";
import { CancelOrderButton } from "@/components/stockist/bulk-orders/cancel-order-button";
import { Reveal } from "@/components/affiliate/dashboard/reveal";

// One bulk order: what was asked for, what it costs, what to do next.
// A server component. getMyBulkOrder() calls requireRole("stockist") itself
// and returns nothing for an order that is not the signed-in stockist's, so
// someone else's order id shows a normal "not found" page.

export const metadata: Metadata = {
  title: "Bulk order",
};

// UTC on purpose, same as the rest of the app. The label says so.
const dateTimeFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "UTC",
});
const stamp = (iso: string) => `${dateTimeFormat.format(new Date(iso))} UTC`;

const CARD =
  "relative isolate overflow-hidden rounded-2xl border border-aff-border bg-gradient-to-b from-aff-ivory to-white shadow-[0_10px_30px_-22px_rgba(172,131,78,0.45)]";
const TOP_LINE =
  "pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-aff-gold-600 via-aff-gold-300 to-aff-gold-600 opacity-70";

export default async function StockistBulkOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getMyBulkOrder(id);
  if (!order) notFound();

  const unitsTotal = order.items.reduce((sum, i) => sum + i.quantity, 0);

  // Dates the stockist cares about, in the order they happened.
  const timeline: { label: string; at: string }[] = [
    { label: "Requested", at: order.createdAt },
  ];
  if (order.quotedAt) {
    timeline.push({ label: "Payment details sent", at: order.quotedAt });
  }
  if (order.proofSubmittedAt) {
    timeline.push({
      label: "Proof of payment sent",
      at: order.proofSubmittedAt,
    });
  }
  if (order.decidedAt) {
    const label =
      order.status === "approved"
        ? "Approved"
        : order.status === "rejected"
          ? "Rejected"
          : "Cancelled";
    timeline.push({ label, at: order.decidedAt });
  }

  const showAdminNote =
    !!order.adminNote &&
    (order.status === "awaiting_payment" ||
      order.status === "rejected" ||
      order.status === "cancelled" ||
      order.status === "approved");

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 sm:gap-6">
      <Link
        href="/stockist/bulk-orders"
        className="inline-flex w-fit items-center gap-1 font-sans text-[13px] font-medium text-aff-muted transition-colors hover:text-aff-green-900"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Bulk orders
      </Link>

      {/* Banner */}
      <Reveal>
        <header className="rounded-2xl bg-gradient-to-br from-aff-gold-600 via-aff-gold-300 to-aff-gold-500 p-[1.5px] shadow-[0_18px_44px_-20px_rgba(172,131,78,0.55)]">
          <div className="relative isolate overflow-hidden rounded-[15px] bg-gradient-to-br from-aff-green-950 via-aff-green-900 to-aff-green-800">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -left-16 -top-16 -z-10 h-48 w-48 rounded-full bg-aff-gold-400/15 blur-3xl"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-aff-gold-300 to-transparent"
            />
            <div className="relative z-10 flex flex-col gap-3 px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-8 sm:py-6">
              <div className="min-w-0">
                <h1 className="break-all font-display text-[22px] font-semibold leading-tight text-aff-gold-300 sm:text-[30px]">
                  {order.displayNumber}
                </h1>
                <p className="mt-1.5 max-w-xl font-sans text-[13px] leading-relaxed text-aff-cream-50/75 sm:text-[14px]">
                  {BULK_STATUS_HINT[order.status]}
                </p>
              </div>
              {/* Light chip: the badge colors are made for light backgrounds */}
              <div className="w-fit max-w-full shrink-0 rounded-2xl bg-aff-ivory p-1.5">
                <BulkOrderStatusBadge status={order.status} />
              </div>
            </div>
          </div>
        </header>
      </Reveal>

      {showAdminNote && (
        <div className="rounded-xl border border-aff-gold-600/40 border-l-[3px] border-l-aff-gold-600 bg-aff-gold-400/20 px-4 py-3 font-sans text-[13px] leading-relaxed text-[#7A5526]">
          <span className="font-semibold">Note from Finasto: </span>
          {order.adminNote}
        </div>
      )}

      {/* Payment: the one thing to do while the order is awaiting payment */}
      {order.status === "awaiting_payment" && (
        <section className={`${CARD} p-4 pt-5 sm:p-6 sm:pt-7`}>
          <span aria-hidden className={TOP_LINE} />
          <h2 className="font-display text-[22px] font-semibold leading-tight text-aff-green-900">
            Pay{" "}
            <span className="tabular-nums">
              {formatPrice(order.totalUsd, "USD")}
            </span>
          </h2>
          <p className="mt-2 font-sans text-[14px] leading-relaxed text-aff-muted">
            Send the payment using these details, then upload your proof of
            payment below.
          </p>

          <div className="mt-4 whitespace-pre-wrap break-words rounded-xl border border-aff-border border-l-[3px] border-l-aff-gold-500 bg-white px-4 py-3 font-sans text-[14px] leading-relaxed text-aff-green-900">
            {order.bankDetails}
          </div>

          <div className="mt-6 border-t border-aff-border pt-6">
            <PaymentProofForm orderId={order.id} />
          </div>
        </section>
      )}

      {/* Proof already sent (or the order is done): show what was sent */}
      {(order.status === "payment_submitted" ||
        order.status === "approved") && (
        <section className={`${CARD} p-4 pt-5 sm:p-6 sm:pt-7`}>
          <span aria-hidden className={TOP_LINE} />
          <h2 className="font-display text-[20px] font-semibold leading-tight text-aff-green-900">
            Payment
          </h2>
          <dl className="mt-3 grid gap-x-6 gap-y-3 font-sans text-[14px] sm:grid-cols-2">
            <div>
              <dt className="text-[12px] text-aff-muted">Amount</dt>
              <dd className="font-semibold tabular-nums text-aff-green-900">
                {formatPrice(order.totalUsd, "USD")}
              </dd>
            </div>
            {order.paymentReference && (
              <div className="min-w-0">
                <dt className="text-[12px] text-aff-muted">Reference</dt>
                <dd className="break-words text-aff-green-900">
                  {order.paymentReference}
                </dd>
              </div>
            )}
            {order.proofUrl && (
              <div>
                <dt className="text-[12px] text-aff-muted">Proof</dt>
                <dd>
                  <a
                    href={order.proofUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-0.5 inline-flex h-8 items-center gap-1.5 rounded-full border border-[rgba(47,158,107,0.3)] bg-[rgba(47,158,107,0.1)] px-3 text-[13px] font-medium text-[#1F7A52] transition-colors hover:border-aff-gold-500 hover:text-aff-green-900"
                  >
                    View uploaded file
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                </dd>
              </div>
            )}
          </dl>
        </section>
      )}

      {/* Items */}
      <section className={CARD}>
        <span aria-hidden className={TOP_LINE} />
        <h2 className="px-4 pb-3 pt-5 font-display text-[20px] font-semibold leading-tight text-aff-green-900 sm:px-6 sm:pt-6">
          Items
        </h2>
        <ul className="divide-y divide-aff-border border-t border-aff-border bg-white">
          {order.items.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 sm:px-6"
            >
              <div className="min-w-0">
                <p className="font-sans text-[14px] font-medium text-aff-green-900">
                  {item.productName}
                </p>
                <p className="font-sans text-[12px] text-aff-muted">
                  {item.packName} · {item.quantity} ×{" "}
                  {formatPrice(item.unitPriceUsd, "USD")}
                </p>
              </div>
              <p className="font-sans text-[14px] font-medium tabular-nums text-aff-green-900">
                {formatPrice(item.lineTotalUsd, "USD")}
              </p>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between gap-4 border-t border-aff-border bg-aff-gold-400/15 px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="font-sans text-[12px] text-aff-muted">
              {unitsTotal} {unitsTotal === 1 ? "pack" : "packs"} · your{" "}
              {order.discountPercent}% discount applied
            </p>
            <p className="font-sans text-[13px] font-medium text-aff-green-900">
              Total
            </p>
          </div>
          <p className="break-words font-display text-[24px] font-semibold leading-tight tabular-nums text-aff-green-900">
            {formatPrice(order.totalUsd, "USD")}
          </p>
        </div>
      </section>

      {order.stockistNote && (
        <section className={`${CARD} p-4 pt-5 sm:p-6 sm:pt-7`}>
          <span aria-hidden className={TOP_LINE} />
          <h2 className="font-sans text-[12px] font-medium text-aff-muted">
            Your note
          </h2>
          <p className="mt-1 whitespace-pre-wrap break-words font-sans text-[14px] leading-relaxed text-aff-green-900">
            {order.stockistNote}
          </p>
        </section>
      )}

      {/* Dates */}
      <section className={`${CARD} p-4 pt-5 sm:p-6 sm:pt-7`}>
        <span aria-hidden className={TOP_LINE} />
        <h2 className="font-display text-[18px] font-semibold leading-tight text-aff-green-900">
          History
        </h2>
        <ol className="mt-4 flex flex-col gap-4">
          {timeline.map((t) => (
            <li key={t.label} className="flex items-start gap-3">
              <span
                aria-hidden
                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-aff-green-900"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-aff-gold-300" />
              </span>
              <div className="min-w-0">
                <p className="font-sans text-[14px] text-aff-green-900">
                  {t.label}
                </p>
                <p className="font-sans text-[12px] text-aff-muted">
                  {stamp(t.at)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {order.status === "requested" && (
        <div>
          <CancelOrderButton
            orderId={order.id}
            displayNumber={order.displayNumber}
          />
        </div>
      )}
    </div>
  );
}