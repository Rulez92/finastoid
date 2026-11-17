// import Link from "next/link";
// import { Search, ShoppingBag } from "lucide-react";
// import { formatPrice } from "@/lib/utils";
// import type { StockistOrderList } from "@/lib/stockist/orders-queries";
// import {
//   OrderStatusBadge,
//   PaymentStatusBadge,
// } from "@/components/affiliate/orders/order-status-badge";
// import { Input } from "antd";

// // Read-only order list for the stockist: search, status filter, table on
// // desktop, cards on mobile, plain-link paging. Everything lives in the URL
// // (?q=&status=&page=), so this is a server component with no client state.
// // Only safe customer fields exist on the rows (first name, masked email).

// const BASE = "/stockist/orders";

// const STATUS_TABS = [
//   { value: "", label: "All" },
//   { value: "pending", label: "Pending" },
//   { value: "paid", label: "Paid" },
//   { value: "shipped", label: "Shipped" },
//   { value: "delivered", label: "Delivered" },
//   { value: "cancelled", label: "Cancelled" },
// ];

// // UTC on purpose, same as the other tables.
// const dateFmt = new Intl.DateTimeFormat("en-GB", {
//   day: "numeric",
//   month: "short",
//   year: "numeric",
//   timeZone: "UTC",
// });

// const itemsLabel = (n: number) => `${n} ${n === 1 ? "item" : "items"}`;

// function href(q: string, status: string, page?: number) {
//   const p = new URLSearchParams();
//   if (q) p.set("q", q);
//   if (status) p.set("status", status);
//   if (page && page > 1) p.set("page", String(page));
//   const qs = p.toString();
//   return qs ? `${BASE}?${qs}` : BASE;
// }

// export function StockistOrdersTable({
//   result,
//   q,
//   status,
// }: {
//   result: StockistOrderList;
//   q: string;
//   status: string;
// }) {
//   const { items, total, page, pageSize } = result;
//   const totalPages = Math.max(1, Math.ceil(total / pageSize));
//   const filtered = Boolean(q || status);

//   return (
//     <div>
//       {/* Search + status filter */}
//       <div className="mb-4 flex flex-col gap-3">
//         <form action={BASE} method="get" className="relative max-w-sm">
//           {status && <input type="hidden" name="status" value={status} />}

   
// <input
//   type="search"
//   name="q"
//   defaultValue={q}
//   placeholder="Search order number or affiliate"
//   className="w-full rounded-lg border border-border-strong bg-white py-2 pl-9 pr-3 font-sans text-[14px] text-espresso outline-none focus:border-copper"
// />       <Search
//   className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-warm-gray"
//   aria-hidden="true"
// />
//         </form>

//         <div className="flex flex-wrap gap-2">
//           {STATUS_TABS.map((t) => {
//             const active = t.value === status;
//             return (
//               <Link
//                 key={t.value || "all"}
//                 href={href(q, t.value)}
//                 className={
//                   "rounded-full border px-3 py-1 font-sans text-[13px] " +
//                   (active
//                     ? "border-espresso bg-espresso text-white"
//                     : "border-border-strong bg-white text-espresso hover:border-copper")
//                 }
//               >
//                 {t.label}
//               </Link>
//             );
//           })}
//         </div>
//       </div>

//       {items.length === 0 ? (
//         <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border-strong bg-white py-16 text-center">
//           <ShoppingBag
//             className="h-6 w-6 text-warm-gray"
//             strokeWidth={1.4}
//             aria-hidden="true"
//           />
//           <p className="mt-3 font-sans text-[14px] text-espresso">
//             No orders found
//           </p>
//           <p className="mt-1 max-w-xs font-sans text-[13px] text-warm-gray">
//             {filtered
//               ? "Try a different search or filter."
//               : "Orders from your affiliates will appear here."}
//           </p>
//         </div>
//       ) : (
//         <>
//           {/* Desktop table */}
//           <div className="hidden overflow-x-auto rounded-2xl border border-border bg-white md:block">
//             <table className="w-full text-left font-sans text-[14px]">
//               <thead>
//                 <tr className="border-b border-border text-[12px] uppercase tracking-wide text-warm-gray">
//                   <th className="px-4 py-3 font-medium">Order</th>
//                   <th className="px-4 py-3 font-medium">Affiliate</th>
//                   <th className="px-4 py-3 font-medium">Customer</th>
//                   <th className="px-4 py-3 text-right font-medium">Total</th>
//                   <th className="px-4 py-3 font-medium">Status</th>
//                   <th className="px-4 py-3 font-medium">Date</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {items.map((o) => (
//                   <tr
//                     key={o.orderNumber}
//                     className="border-b border-border last:border-0"
//                   >
//                     <td className="px-4 py-3">
//                       <p className="font-medium text-espresso">
//                         {o.orderNumber}
//                       </p>
//                       <p className="text-[12px] text-warm-gray">
//                         {itemsLabel(o.itemCount)}
//                       </p>
//                     </td>
//                     <td className="px-4 py-3 text-espresso">
//                       {o.affiliateName}
//                     </td>
//                     <td className="px-4 py-3">
//                       <p className="text-espresso">{o.customerFirstName}</p>
//                       {o.customerEmailMasked && (
//                         <p className="text-[12px] text-warm-gray">
//                           {o.customerEmailMasked}
//                         </p>
//                       )}
//                     </td>
//                     <td className="px-4 py-3 text-right tabular-nums text-espresso">
//                       {formatPrice(o.totalUsd, "USD")}
//                     </td>
//                     <td className="px-4 py-3">
//                       <div className="flex flex-col items-start gap-1">
//                         <OrderStatusBadge status={o.status} />
//                         <PaymentStatusBadge status={o.paymentStatus} />
//                       </div>
//                     </td>
//                     <td className="px-4 py-3 text-espresso/80">
//                       {dateFmt.format(new Date(o.orderedAt))}
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>

//           {/* Mobile cards */}
//           <ul className="flex flex-col gap-3 md:hidden">
//             {items.map((o) => (
//               <li
//                 key={o.orderNumber}
//                 className="rounded-2xl border border-border bg-white p-4"
//               >
//                 <div className="flex items-start justify-between gap-2">
//                   <div className="min-w-0">
//                     <p className="truncate font-sans text-[15px] font-medium text-espresso">
//                       {o.orderNumber}
//                     </p>
//                     <p className="mt-0.5 font-sans text-[12px] text-warm-gray">
//                       {itemsLabel(o.itemCount)} ·{" "}
//                       {dateFmt.format(new Date(o.orderedAt))}
//                     </p>
//                   </div>
//                   <span className="shrink-0 font-sans text-[14px] font-medium tabular-nums text-espresso">
//                     {formatPrice(o.totalUsd, "USD")}
//                   </span>
//                 </div>
//                 <div className="mt-3 flex flex-wrap gap-2">
//                   <OrderStatusBadge status={o.status} />
//                   <PaymentStatusBadge status={o.paymentStatus} />
//                 </div>
//                 <dl className="mt-3 grid grid-cols-2 gap-y-1.5 font-sans text-[13px]">
//                   <dt className="text-warm-gray">Affiliate</dt>
//                   <dd className="truncate text-right text-espresso">
//                     {o.affiliateName}
//                   </dd>
//                   <dt className="text-warm-gray">Customer</dt>
//                   <dd className="min-w-0 text-right text-espresso">
//                     <span className="block truncate">
//                       {o.customerFirstName}
//                     </span>
//                     {o.customerEmailMasked && (
//                       <span className="block truncate text-[12px] text-warm-gray">
//                         {o.customerEmailMasked}
//                       </span>
//                     )}
//                   </dd>
//                 </dl>
//               </li>
//             ))}
//           </ul>

//           {/* Paging */}
//           {totalPages > 1 && (
//             <div className="mt-4 flex items-center justify-between font-sans text-[13px] text-warm-gray">
//               {page > 1 ? (
//                 <Link
//                   href={href(q, status, page - 1)}
//                   className="text-espresso hover:text-copper"
//                 >
//                   ← Previous
//                 </Link>
//               ) : (
//                 <span />
//               )}
//               <span>
//                 Page {page} of {totalPages}
//               </span>
//               {page < totalPages ? (
//                 <Link
//                   href={href(q, status, page + 1)}
//                   className="text-espresso hover:text-copper"
//                 >
//                   Next →
//                 </Link>
//               ) : (
//                 <span />
//               )}
//             </div>
//           )}
//         </>
//       )}
//     </div>
//   );
// }
import Link from "next/link";
import { ChevronLeft, ChevronRight, Search, ShoppingBag } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import type { StockistOrderList } from "@/lib/stockist/orders-queries";
import {
  OrderStatusBadge,
  PaymentStatusBadge,
} from "@/components/affiliate/orders/order-status-badge";

// Read-only order list for the stockist: search, status filter, table on
// desktop, cards on mobile, plain-link paging. Everything lives in the URL
// (?q=&status=&page=), so this is a server component with no client state.
// Only safe customer fields exist on the rows (first name, masked email).

const BASE = "/stockist/orders";

const STATUS_TABS = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

// UTC on purpose, same as the other tables.
const dateFmt = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const itemsLabel = (n: number) => `${n} ${n === 1 ? "item" : "items"}`;

const TOP_LINE =
  "pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-aff-gold-600 via-aff-gold-300 to-aff-gold-600 opacity-70";

const PAGE_BTN =
  "inline-flex h-10 items-center gap-1 rounded-full border border-aff-border bg-white px-4 font-sans text-[14px] font-medium text-aff-green-900 transition-colors [@media(hover:hover)]:hover:border-aff-gold-500 [@media(hover:hover)]:hover:bg-aff-ivory";

function href(q: string, status: string, page?: number) {
  const p = new URLSearchParams();
  if (q) p.set("q", q);
  if (status) p.set("status", status);
  if (page && page > 1) p.set("page", String(page));
  const qs = p.toString();
  return qs ? `${BASE}?${qs}` : BASE;
}

export function StockistOrdersTable({
  result,
  q,
  status,
}: {
  result: StockistOrderList;
  q: string;
  status: string;
}) {
  const { items, total, page, pageSize } = result;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const filtered = Boolean(q || status);

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      {/* Search + status filter */}
      <div className="relative isolate flex flex-col gap-4 overflow-hidden rounded-2xl border border-aff-border bg-gradient-to-b from-aff-ivory to-white p-4 pt-5 shadow-[0_10px_30px_-22px_rgba(172,131,78,0.45)] sm:p-5">
        <span aria-hidden className={TOP_LINE} />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <form
            action={BASE}
            method="get"
            role="search"
            className="relative w-full sm:max-w-sm"
          >
            {status && <input type="hidden" name="status" value={status} />}
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search order number or affiliate"
              aria-label="Search orders"
              className="h-11 w-full rounded-xl border border-aff-border bg-white py-2 pl-10 pr-3 font-sans text-[16px] text-aff-green-900 outline-none transition-all duration-200 placeholder:text-aff-muted/60 hover:border-aff-gold-500 focus:border-aff-gold-600 focus:ring-4 focus:ring-aff-gold-400/20 sm:text-[14px]"
            />
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-aff-muted"
              aria-hidden="true"
            />
          </form>

          <p className="font-sans text-[13px] text-aff-muted">
            <span className="font-semibold text-aff-green-900">{total}</span>{" "}
            {total === 1 ? "order" : "orders"}
          </p>
        </div>

        {/* Status tabs: scroll sideways on narrow screens */}
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
          {STATUS_TABS.map((t) => {
            const active = t.value === status;
            return (
              <Link
                key={t.value || "all"}
                href={href(q, t.value)}
                aria-current={active ? "page" : undefined}
                className={
                  "shrink-0 touch-manipulation rounded-full border px-4 py-1.5 font-sans text-[13px] font-medium transition-all duration-200 active:scale-[0.96] " +
                  (active
                    ? "border-aff-gold-600/40 bg-aff-green-900 text-aff-gold-300 shadow-[0_8px_18px_-10px_rgba(3,24,7,0.6)]"
                    : "border-aff-border bg-white text-aff-green-900 [@media(hover:hover)]:hover:border-aff-gold-500 [@media(hover:hover)]:hover:bg-aff-ivory")
                }
              >
                {t.label}
              </Link>
            );
          })}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-aff-gold-500/50 bg-aff-ivory px-6 py-14 text-center sm:py-16">
          <span className="flex h-12 w-12 items-center justify-center rounded-full border border-aff-gold-400/50 bg-aff-green-900 text-aff-gold-300">
            <ShoppingBag
              className="h-5 w-5"
              strokeWidth={1.7}
              aria-hidden="true"
            />
          </span>
          <p className="mt-4 font-display text-[20px] font-semibold text-aff-green-900">
            No orders found
          </p>
          <p className="mt-1 max-w-xs font-sans text-[13px] leading-relaxed text-aff-muted">
            {filtered
              ? "Try a different search or filter."
              : "Orders from your affiliates will appear here."}
          </p>
          {filtered && (
            <Link
              href={BASE}
              className="mt-5 inline-flex h-10 items-center rounded-full border border-aff-border bg-white px-5 font-sans text-[13px] font-medium text-aff-green-900 transition-colors [@media(hover:hover)]:hover:border-aff-gold-500"
            >
              Clear filters
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="relative hidden overflow-hidden rounded-2xl border border-aff-border bg-white shadow-[0_10px_30px_-22px_rgba(172,131,78,0.45)] md:block">
            <span aria-hidden className={TOP_LINE} />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left font-sans text-[14px]">
                <thead>
                  <tr className="border-b border-aff-border bg-aff-ivory text-[12px] uppercase tracking-[0.04em] text-aff-muted">
                    <th className="px-4 py-3.5 font-semibold">Order</th>
                    <th className="px-4 py-3.5 font-semibold">Affiliate</th>
                    <th className="px-4 py-3.5 font-semibold">Customer</th>
                    <th className="px-4 py-3.5 text-right font-semibold">
                      Total
                    </th>
                    <th className="px-4 py-3.5 font-semibold">Status</th>
                    <th className="px-4 py-3.5 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((o) => (
                    <tr
                      key={o.orderNumber}
                      className="border-b border-aff-border/60 transition-colors last:border-0 [@media(hover:hover)]:hover:bg-aff-ivory"
                    >
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-aff-green-900">
                          {o.orderNumber}
                        </p>
                        <p className="text-[12px] text-aff-muted">
                          {itemsLabel(o.itemCount)}
                        </p>
                      </td>
                      <td className="px-4 py-3.5 text-aff-green-900">
                        {o.affiliateName}
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-aff-green-900">
                          {o.customerFirstName}
                        </p>
                        {o.customerEmailMasked && (
                          <p className="text-[12px] text-aff-muted">
                            {o.customerEmailMasked}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right font-semibold tabular-nums text-aff-green-900">
                        {formatPrice(o.totalUsd, "USD")}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col items-start gap-1">
                          <OrderStatusBadge status={o.status} />
                          <PaymentStatusBadge status={o.paymentStatus} />
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-aff-muted">
                        {dateFmt.format(new Date(o.orderedAt))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <ul className="flex flex-col gap-3 md:hidden">
            {items.map((o) => (
              <li
                key={o.orderNumber}
                className="relative isolate touch-manipulation overflow-hidden rounded-2xl border border-aff-border bg-gradient-to-b from-aff-ivory to-white p-4 pt-5 shadow-[0_10px_30px_-22px_rgba(172,131,78,0.45)] transition-transform duration-200 active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100"
              >
                <span aria-hidden className={TOP_LINE} />
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-sans text-[15px] font-semibold text-aff-green-900">
                      {o.orderNumber}
                    </p>
                    <p className="mt-0.5 font-sans text-[12px] text-aff-muted">
                      {itemsLabel(o.itemCount)} ·{" "}
                      {dateFmt.format(new Date(o.orderedAt))}
                    </p>
                  </div>
                  <span className="shrink-0 font-display text-[17px] font-semibold tabular-nums text-aff-green-900">
                    {formatPrice(o.totalUsd, "USD")}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <OrderStatusBadge status={o.status} />
                  <PaymentStatusBadge status={o.paymentStatus} />
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-y-1.5 rounded-xl border border-aff-border bg-white px-3 py-2.5 font-sans text-[13px]">
                  <dt className="text-aff-muted">Affiliate</dt>
                  <dd className="truncate text-right text-aff-green-900">
                    {o.affiliateName}
                  </dd>
                  <dt className="text-aff-muted">Customer</dt>
                  <dd className="min-w-0 text-right text-aff-green-900">
                    <span className="block truncate">
                      {o.customerFirstName}
                    </span>
                    {o.customerEmailMasked && (
                      <span className="block truncate text-[12px] text-aff-muted">
                        {o.customerEmailMasked}
                      </span>
                    )}
                  </dd>
                </dl>
              </li>
            ))}
          </ul>

          {/* Paging */}
          {totalPages > 1 && (
            <nav
              aria-label="Pagination"
              className="flex items-center justify-between gap-3 rounded-2xl border border-aff-border bg-white px-4 py-3 font-sans text-[13px] text-aff-muted"
            >
              {page > 1 ? (
                <Link href={href(q, status, page - 1)} className={PAGE_BTN}>
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  Previous
                </Link>
              ) : (
                <span />
              )}
              <span>
                Page{" "}
                <span className="font-semibold text-aff-green-900">{page}</span>{" "}
                of {totalPages}
              </span>
              {page < totalPages ? (
                <Link href={href(q, status, page + 1)} className={PAGE_BTN}>
                  Next
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              ) : (
                <span />
              )}
            </nav>
          )}
        </>
      )}
    </div>
  );
}