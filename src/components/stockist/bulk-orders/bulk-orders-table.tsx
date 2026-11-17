// import Link from "next/link";
// import { ChevronLeft, ChevronRight, Plus, ScrollText } from "lucide-react";
// import { formatPrice } from "@/lib/utils";
// import type { BulkOrderListResult } from "@/lib/stockist/bulk-orders-queries";
// import { BulkOrderStatusBadge } from "@/components/stockist/bulk-orders/bulk-order-status-badge";

// // The stockist's list of bulk orders, newest first. A server component:
// // the data comes from the page (listMyBulkOrders) and paging is plain
// // links (?page=2), so there is no client state to keep in sync.

// // UTC on purpose, same as the rest of the app, so every viewer sees the
// // same date.
// const dateFormat = new Intl.DateTimeFormat("en-GB", {
//   day: "numeric",
//   month: "short",
//   year: "numeric",
//   timeZone: "UTC",
// });

// const BASE = "/stockist/bulk-orders";

// export function BulkOrdersTable({ result }: { result: BulkOrderListResult }) {
//   const { items, total, page, pageSize } = result;
//   const totalPages = Math.max(1, Math.ceil(total / pageSize));

//   return (
//     <>
//       <div className="flex flex-wrap items-center justify-between gap-3">
//         <p className="font-sans text-[14px] text-warm-gray">
//           {total === 0
//             ? "No orders yet"
//             : `${total} ${total === 1 ? "order" : "orders"}`}
//         </p>
//         <Link
//           href={`${BASE}/new`}
//           className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-espresso px-5 font-sans text-[14px] font-medium text-cream transition-colors hover:bg-espresso-deep"
//         >
//           <Plus className="h-4 w-4" aria-hidden="true" />
//           New request
//         </Link>
//       </div>

//       {items.length === 0 ? (
//         <div className="mt-4 flex flex-col items-center rounded-2xl border border-border px-6 py-14 text-center">
//           <span className="flex h-11 w-11 items-center justify-center rounded-full bg-copper/10 text-copper">
//             <ScrollText
//               className="h-5 w-5"
//               strokeWidth={1.8}
//               aria-hidden="true"
//             />
//           </span>
//           <h2 className="mt-4 font-display text-[22px] leading-tight text-espresso">
//             Make your first bulk order
//           </h2>
//           <p className="mt-2 max-w-sm font-sans text-[14px] leading-relaxed text-warm-gray">
//             Choose the packs you want at your discounted price. Finasto reviews
//             your request and sends the payment details.
//           </p>
//           <Link
//             href={`${BASE}/new`}
//             className="mt-6 inline-flex h-11 items-center justify-center rounded-full border border-border-strong px-5 font-sans text-[14px] font-medium text-espresso transition-colors hover:border-copper"
//           >
//             New request
//           </Link>
//         </div>
//       ) : (
//         <ul className="mt-4 divide-y divide-border overflow-hidden rounded-2xl border border-border">
//           {items.map((order) => {
//             const showNote =
//               order.adminNote &&
//               (order.status === "awaiting_payment" ||
//                 order.status === "rejected" ||
//                 order.status === "cancelled");

//             return (
//               <li
//                 key={order.id}
//                 className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-4"
//               >
//                 <div className="min-w-0 flex-1 basis-48">
//                   <p className="font-sans text-[14px] font-medium text-espresso">
//                     {order.displayNumber}
//                   </p>
//                   <p className="font-sans text-[12px] text-warm-gray">
//                     {dateFormat.format(new Date(order.createdAt))}
//                     {" · "}
//                     {order.units} {order.units === 1 ? "pack" : "packs"}
//                     {order.itemCount > 1 && ` · ${order.itemCount} products`}
//                   </p>
//                   {showNote && (
//                     <p className="mt-1 line-clamp-2 font-sans text-[12px] leading-relaxed text-copper">
//                       {order.adminNote}
//                     </p>
//                   )}
//                 </div>

//                 <BulkOrderStatusBadge status={order.status} />

//                 <p className="basis-24 text-right font-sans text-[15px] font-medium text-espresso">
//                   {formatPrice(order.totalUsd, "USD")}
//                 </p>

//                 <Link
//                   href={`${BASE}/${order.id}`}
//                   className={
//                     order.status === "awaiting_payment"
//                       ? "inline-flex h-10 items-center justify-center rounded-full bg-espresso px-4 font-sans text-[14px] font-medium text-cream transition-colors hover:bg-espresso-deep"
//                       : "inline-flex h-10 items-center justify-center rounded-full border border-border-strong px-4 font-sans text-[14px] font-medium text-espresso transition-colors hover:border-copper"
//                   }
//                 >
//                   {order.status === "awaiting_payment" ? "Pay now" : "View"}
//                 </Link>
//               </li>
//             );
//           })}
//         </ul>
//       )}

//       {totalPages > 1 && (
//         <nav
//           aria-label="Pages"
//           className="mt-4 flex items-center justify-between"
//         >
//           {page > 1 ? (
//             <Link
//               href={`${BASE}?page=${page - 1}`}
//               className="inline-flex h-10 items-center gap-1 rounded-full border border-border-strong px-4 font-sans text-[14px] text-espresso transition-colors hover:border-copper"
//             >
//               <ChevronLeft className="h-4 w-4" aria-hidden="true" />
//               Newer
//             </Link>
//           ) : (
//             <span />
//           )}
//           <span className="font-sans text-[13px] text-warm-gray">
//             Page {page} of {totalPages}
//           </span>
//           {page < totalPages ? (
//             <Link
//               href={`${BASE}?page=${page + 1}`}
//               className="inline-flex h-10 items-center gap-1 rounded-full border border-border-strong px-4 font-sans text-[14px] text-espresso transition-colors hover:border-copper"
//             >
//               Older
//               <ChevronRight className="h-4 w-4" aria-hidden="true" />
//             </Link>
//           ) : (
//             <span />
//           )}
//         </nav>
//       )}
//     </>
//   );
// }
import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus, ScrollText } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import type { BulkOrderListResult } from "@/lib/stockist/bulk-orders-queries";
import { BulkOrderStatusBadge } from "@/components/stockist/bulk-orders/bulk-order-status-badge";

// The stockist's list of bulk orders, newest first. A server component:
// the data comes from the page (listMyBulkOrders) and paging is plain
// links (?page=2), so there is no client state to keep in sync.

// UTC on purpose, same as the rest of the app, so every viewer sees the
// same date.
const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const BASE = "/stockist/bulk-orders";

const TOP_LINE =
  "pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-aff-gold-600 via-aff-gold-300 to-aff-gold-600 opacity-70";

const GOLD_BTN =
  "inline-flex h-11 touch-manipulation items-center justify-center gap-2 rounded-full bg-gradient-to-r from-aff-gold-600 via-aff-gold-300 to-aff-gold-500 px-5 font-sans text-[14px] font-semibold text-aff-green-950 shadow-[0_10px_26px_-14px_rgba(172,131,78,0.8)] transition-all duration-200 active:scale-[0.97] motion-reduce:transition-none [@media(hover:hover)]:hover:-translate-y-0.5 [@media(hover:hover)]:hover:brightness-105";

const PAGE_BTN =
  "inline-flex h-10 items-center gap-1 rounded-full border border-aff-border bg-white px-4 font-sans text-[14px] font-medium text-aff-green-900 transition-colors [@media(hover:hover)]:hover:border-aff-gold-500 [@media(hover:hover)]:hover:bg-aff-ivory";

export function BulkOrdersTable({ result }: { result: BulkOrderListResult }) {
  const { items, total, page, pageSize } = result;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      {/* Toolbar */}
      <div className="relative isolate flex flex-col gap-3 overflow-hidden rounded-2xl border border-aff-border bg-gradient-to-b from-aff-ivory to-white p-4 pt-5 shadow-[0_10px_30px_-22px_rgba(172,131,78,0.45)] sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <span aria-hidden className={TOP_LINE} />
        <p className="font-sans text-[14px] text-aff-muted">
          {total === 0 ? (
            "No orders yet"
          ) : (
            <>
              <span className="font-semibold text-aff-green-900">{total}</span>{" "}
              {total === 1 ? "order" : "orders"}
            </>
          )}
        </p>
        <Link href={`${BASE}/new`} className={`${GOLD_BTN} w-full sm:w-auto`}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          New request
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-aff-gold-500/50 bg-aff-ivory px-6 py-14 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full border border-aff-gold-400/50 bg-aff-green-900 text-aff-gold-300">
            <ScrollText
              className="h-5 w-5"
              strokeWidth={1.7}
              aria-hidden="true"
            />
          </span>
          <h2 className="mt-4 font-display text-[22px] leading-tight text-aff-green-900">
            Make your first bulk order
          </h2>
          <p className="mt-2 max-w-sm font-sans text-[14px] leading-relaxed text-aff-muted">
            Choose the packs you want at your discounted price. Finasto reviews
            your request and sends the payment details.
          </p>
          <Link href={`${BASE}/new`} className={`${GOLD_BTN} mt-6`}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            New request
          </Link>
        </div>
      ) : (
        <ul className="relative overflow-hidden rounded-2xl border border-aff-border bg-white shadow-[0_10px_30px_-22px_rgba(172,131,78,0.45)]">
          <span aria-hidden className={TOP_LINE} />
          {items.map((order, index) => {
            const showNote =
              order.adminNote &&
              (order.status === "awaiting_payment" ||
                order.status === "rejected" ||
                order.status === "cancelled");
            const needsPayment = order.status === "awaiting_payment";

            return (
              <li
                key={order.id}
                className={`flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-4 transition-colors sm:px-5 [@media(hover:hover)]:hover:bg-aff-ivory ${
                  index > 0 ? "border-t border-aff-border" : "pt-5"
                }`}
              >
                <div className="min-w-0 flex-1 basis-48">
                  <p className="font-sans text-[14px] font-semibold text-aff-green-900">
                    {order.displayNumber}
                  </p>
                  <p className="font-sans text-[12px] text-aff-muted">
                    {dateFormat.format(new Date(order.createdAt))}
                    {" · "}
                    {order.units} {order.units === 1 ? "pack" : "packs"}
                    {order.itemCount > 1 && ` · ${order.itemCount} products`}
                  </p>
                  {showNote && (
                    <p className="mt-1 line-clamp-2 font-sans text-[12px] leading-relaxed text-[#7A5526]">
                      {order.adminNote}
                    </p>
                  )}
                </div>

                <BulkOrderStatusBadge status={order.status} />

                <p className="ml-auto basis-24 text-right font-display text-[17px] font-semibold tabular-nums text-aff-green-900 sm:ml-0">
                  {formatPrice(order.totalUsd, "USD")}
                </p>

                <Link
                  href={`${BASE}/${order.id}`}
                  className={
                    needsPayment
                      ? "inline-flex h-10 touch-manipulation items-center justify-center rounded-full border border-aff-gold-600/40 bg-aff-green-900 px-5 font-sans text-[14px] font-medium text-aff-gold-300 transition-all duration-200 active:scale-[0.97] [@media(hover:hover)]:hover:bg-aff-green-800"
                      : "inline-flex h-10 touch-manipulation items-center justify-center rounded-full border border-aff-border bg-white px-5 font-sans text-[14px] font-medium text-aff-green-900 transition-all duration-200 active:scale-[0.97] [@media(hover:hover)]:hover:border-aff-gold-500"
                  }
                >
                  {needsPayment ? "Pay now" : "View"}
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {totalPages > 1 && (
        <nav
          aria-label="Pages"
          className="flex items-center justify-between gap-3 rounded-2xl border border-aff-border bg-white px-4 py-3"
        >
          {page > 1 ? (
            <Link href={`${BASE}?page=${page - 1}`} className={PAGE_BTN}>
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              Newer
            </Link>
          ) : (
            <span />
          )}
          <span className="font-sans text-[13px] text-aff-muted">
            Page{" "}
            <span className="font-semibold text-aff-green-900">{page}</span> of{" "}
            {totalPages}
          </span>
          {page < totalPages ? (
            <Link href={`${BASE}?page=${page + 1}`} className={PAGE_BTN}>
              Older
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}