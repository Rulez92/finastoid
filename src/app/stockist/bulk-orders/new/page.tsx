// import type { Metadata } from "next";
// import Link from "next/link";
// import { ChevronLeft } from "lucide-react";
// import { getStockistCatalog } from "@/lib/stockist/products-queries";
// import { NewOrderForm } from "@/components/stockist/bulk-orders/new-order-form";

// // Server component: reads the catalog with the signed-in stockist's own
// // discount applied, then hands it to the request form.
// // getStockistCatalog() calls requireRole("stockist") itself, so the page is
// // protected even if the layout check were ever removed.

// export const metadata: Metadata = {
//   title: "New bulk order",
// };

// export default async function StockistNewBulkOrderPage() {
//   const catalog = await getStockistCatalog();

//   return (
//     <div>
//       <Link
//         href="/stockist/bulk-orders"
//         className="mb-3 inline-flex items-center gap-1 font-sans text-[13px] text-warm-gray transition-colors hover:text-copper"
//       >
//         <ChevronLeft className="h-4 w-4" aria-hidden="true" />
//         Bulk orders
//       </Link>

//       <h1 className="font-display text-[28px] leading-tight text-espresso">
//         New bulk order
//       </h1>
//       <p className="mt-2 mb-6 max-w-xl font-sans text-[14px] leading-relaxed text-warm-gray">
//         Enter the quantity you want next to each pack. Finasto reviews your
//         request and sends the payment details.
//       </p>

//       {catalog ? (
//         <NewOrderForm catalog={catalog} />
//       ) : (
//         <div className="rounded-2xl border border-border px-6 py-10 text-center font-sans text-[14px] text-warm-gray">
//           Your account isn&apos;t ready yet. Please contact support.
//         </div>
//       )}
//     </div>
//   );
// }
import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getStockistCatalog } from "@/lib/stockist/products-queries";
import { NewOrderForm } from "@/components/stockist/bulk-orders/new-order-form";
import { Reveal } from "@/components/affiliate/dashboard/reveal";

// Server component: reads the catalog with the signed-in stockist's own
// discount applied, then hands it to the request form.
// getStockistCatalog() calls requireRole("stockist") itself, so the page is
// protected even if the layout check were ever removed.

export const metadata: Metadata = {
  title: "New bulk order",
};

export default async function StockistNewBulkOrderPage() {
  const catalog = await getStockistCatalog();

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <Link
        href="/stockist/bulk-orders"
        className="inline-flex w-fit items-center gap-1 font-sans text-[13px] font-medium text-aff-muted transition-colors hover:text-aff-green-900"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Bulk orders
      </Link>

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
                New{" "}
                <span className="bg-gradient-to-r from-aff-gold-600 via-aff-gold-300 to-aff-gold-500 bg-clip-text text-transparent">
                  bulk order
                </span>
              </h1>
              <p className="mt-1.5 max-w-xl font-sans text-[13px] leading-relaxed text-aff-cream-50/75 sm:text-[14px]">
                Enter the quantity you want next to each pack. Finasto reviews
                your request and sends the payment details.
              </p>
            </div>
          </div>
        </header>
      </Reveal>

      {catalog ? (
        <NewOrderForm catalog={catalog} />
      ) : (
        <div className="rounded-2xl border border-dashed border-aff-gold-500/50 bg-aff-ivory px-6 py-10 text-center font-sans text-[14px] text-aff-muted">
          Your account isn&apos;t ready yet. Please contact support.
        </div>
      )}
    </div>
  );
}