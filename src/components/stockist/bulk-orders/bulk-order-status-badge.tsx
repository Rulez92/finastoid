// import type { BulkOrderStatus } from "@/lib/stockist/bulk-orders-queries";

// // The status of a bulk order, as a small coloured pill, plus one plain
// // sentence saying what happens next. Used by the orders list and the order
// // page. No "use client": it has no state, so server and client components
// // can both use it.

// export const BULK_STATUS_LABEL: Record<BulkOrderStatus, string> = {
//   requested: "Waiting for review",
//   awaiting_payment: "Payment needed",
//   payment_submitted: "Checking payment",
//   approved: "Approved",
//   rejected: "Rejected",
//   cancelled: "Cancelled",
// };

// // What the stockist should know or do next, shown on the order page.
// export const BULK_STATUS_HINT: Record<BulkOrderStatus, string> = {
//   requested:
//     "Finasto is reviewing your request. You can still cancel it until the bank details are sent.",
//   awaiting_payment:
//     "Pay the total using the bank details below, then upload your proof of payment.",
//   payment_submitted: "We received your proof of payment and are checking it.",
//   approved: "Payment confirmed. The packs have been added to your stock.",
//   rejected: "This request was declined. See the note below.",
//   cancelled: "This order was cancelled.",
// };

// const TONE: Record<BulkOrderStatus, string> = {
//   requested: "bg-cream-soft text-espresso border border-border",
//   awaiting_payment: "bg-copper/10 text-copper",
//   payment_submitted: "bg-cream-soft text-espresso border border-border-strong",
//   approved: "bg-green-bg text-green",
//   rejected: "bg-copper/10 text-copper",
//   cancelled: "bg-cream-soft text-warm-gray border border-border",
// };

// export function BulkOrderStatusBadge({ status }: { status: BulkOrderStatus }) {
//   return (
//     <span
//       className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 font-sans text-[12px] font-medium ${TONE[status]}`}
//     >
//       {BULK_STATUS_LABEL[status]}
//     </span>
//   );
// }
import type { BulkOrderStatus } from "@/lib/stockist/bulk-orders-queries";

// The status of a bulk order, as a small coloured pill, plus one plain
// sentence saying what happens next. Used by the orders list and the order
// page. No "use client": it has no state, so server and client components
// can both use it. Colors come from the affiliate palette, same as the
// order and payout badges.

export const BULK_STATUS_LABEL: Record<BulkOrderStatus, string> = {
  requested: "Waiting for review",
  awaiting_payment: "Payment needed",
  payment_submitted: "Checking payment",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

// What the stockist should know or do next, shown on the order page.
export const BULK_STATUS_HINT: Record<BulkOrderStatus, string> = {
  requested:
    "Finasto is reviewing your request. You can still cancel it until the bank details are sent.",
  awaiting_payment:
    "Pay the total using the bank details below, then upload your proof of payment.",
  payment_submitted: "We received your proof of payment and are checking it.",
  approved: "Payment confirmed. The packs have been added to your stock.",
  rejected: "This request was declined. See the note below.",
  cancelled: "This order was cancelled.",
};

// Full class names, so Tailwind can see them at build time.
const NEUTRAL =
  "border-aff-border bg-aff-ivory text-aff-muted";
const WARN =
  "border-aff-gold-600/40 bg-aff-gold-400/25 text-[#7A5526]";
const INFO =
  "border-aff-green-900/20 bg-aff-green-900/[0.08] text-aff-green-900";
const SUCCESS =
  "border-[rgba(47,158,107,0.3)] bg-[rgba(47,158,107,0.1)] text-[#1F7A52]";
const DANGER =
  "border-[rgba(190,60,50,0.3)] bg-[rgba(190,60,50,0.08)] text-[#A3342B]";

const TONE: Record<BulkOrderStatus, string> = {
  requested: NEUTRAL,
  awaiting_payment: WARN,
  payment_submitted: INFO,
  approved: SUCCESS,
  rejected: DANGER,
  cancelled: NEUTRAL,
};

export function BulkOrderStatusBadge({ status }: { status: BulkOrderStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 font-sans text-[12px] font-medium leading-5 ${
        TONE[status] ?? NEUTRAL
      }`}
    >
      <span
        aria-hidden="true"
        className="h-1.5 w-1.5 rounded-full bg-current"
      />
      {BULK_STATUS_LABEL[status] ?? String(status)}
    </span>
  );
}