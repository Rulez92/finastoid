// import type { Metadata } from "next";
// import { listMyStockistOrders } from "@/lib/stockist/orders-queries";
// import { StockistOrdersTable } from "@/components/stockist/orders/orders-table";

// // Server component: reads the stockist's own orders for the URL filters
// // (?q=&status=&page=) and hands them to the read-only table.
// // listMyStockistOrders() calls requireRole("stockist") itself, and unknown
// // filter values are ignored there.

// export const metadata: Metadata = {
//   title: "Orders",
// };

// export default async function StockistOrdersPage({
//   searchParams,
// }: {
//   searchParams: Promise<{ q?: string; status?: string; page?: string }>;
// }) {
//   const { q, status, page } = await searchParams;

//   const parsed = Number.parseInt(page ?? "1", 10);
//   const pageNumber = Number.isFinite(parsed) && parsed >= 1 ? parsed : 1;

//   const result = await listMyStockistOrders({
//     search: q,
//     status,
//     page: pageNumber,
//   });

//   return (
//     <div>
//       <h1 className="font-display text-[28px] leading-tight text-espresso">
//         Order History
//       </h1>
//       <p className="mt-2 mb-6 max-w-xl font-sans text-[14px] leading-relaxed text-warm-gray">
//         Orders your affiliates have placed with your stock, and where each one
//         stands.
//       </p>

//       <StockistOrdersTable
//         result={result}
//         q={q?.trim() ?? ""}
//         status={status ?? ""}
//       />
//     </div>
//   );
// }
import type { Metadata } from "next";
import { listMyStockistOrders } from "@/lib/stockist/orders-queries";
import { StockistOrdersTable } from "@/components/stockist/orders/orders-table";
import { Reveal } from "@/components/affiliate/dashboard/reveal";

// Server component: reads the stockist's own orders for the URL filters
// (?q=&status=&page=) and hands them to the read-only table.
// listMyStockistOrders() calls requireRole("stockist") itself, and unknown
// filter values are ignored there.

export const metadata: Metadata = {
  title: "Orders",
};

export default async function StockistOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const { q, status, page } = await searchParams;

  const parsed = Number.parseInt(page ?? "1", 10);
  const pageNumber = Number.isFinite(parsed) && parsed >= 1 ? parsed : 1;

  const result = await listMyStockistOrders({
    search: q,
    status,
    page: pageNumber,
  });

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
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
            <div className="relative z-10 px-5 py-5 sm:px-8 sm:py-6">
              <h1 className="break-words font-display text-[24px] font-semibold leading-tight text-aff-cream-50 sm:text-[30px]">
                Order{" "}
                <span className="bg-gradient-to-r from-aff-gold-600 via-aff-gold-300 to-aff-gold-500 bg-clip-text text-transparent">
                  History
                </span>
              </h1>
              <p className="mt-1.5 max-w-xl font-sans text-[13px] leading-relaxed text-aff-cream-50/75 sm:text-[14px]">
                Orders your affiliates have placed with your stock, and where
                each one stands.
              </p>
            </div>
          </div>
        </header>
      </Reveal>

      <StockistOrdersTable
        result={result}
        q={q?.trim() ?? ""}
        status={status ?? ""}
      />
    </div>
  );
}