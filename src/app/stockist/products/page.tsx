// import type { Metadata } from "next";
// import { getStockistCatalog } from "@/lib/stockist/products-queries";
// import { ProductsGrid } from "@/components/stockist/products/products-grid";

// // Server component: reads the catalog with the signed-in stockist's own
// // discount applied, then hands it to the client grid.
// // getStockistCatalog() calls requireRole("stockist") itself, so the page is
// // protected even if the layout check were ever removed.

// export const metadata: Metadata = {
//   title: "Products",
// };

// export default async function StockistProductsPage() {
//   const catalog = await getStockistCatalog();

//   return (
//     <div>
//       <h1 className="font-display text-[28px] leading-tight text-espresso">
//         Our Collection
//       </h1>
//       <p className="mt-2 mb-6 max-w-xl font-sans text-[14px] leading-relaxed text-warm-gray">
//         Browse every product and pack at your own price.
//       </p>

//       {catalog ? (
//         <ProductsGrid catalog={catalog} />
//       ) : (
//         <div className="rounded-2xl border border-border px-6 py-10 text-center font-sans text-[14px] text-warm-gray">
//           Your account isn&apos;t ready yet. Please contact support.
//         </div>
//       )}
//     </div>
//   );
// }
import type { Metadata } from "next";
import { getStockistCatalog } from "@/lib/stockist/products-queries";
import { ProductsGrid } from "@/components/stockist/products/products-grid";
import { Reveal } from "@/components/affiliate/dashboard/reveal";

// Server component: reads the catalog with the signed-in stockist's own
// discount applied, then hands it to the client grid.
// getStockistCatalog() calls requireRole("stockist") itself, so the page is
// protected even if the layout check were ever removed.

export const metadata: Metadata = {
  title: "Products",
};

export default async function StockistProductsPage() {
  const catalog = await getStockistCatalog();

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
            <div className="relative z-10 flex flex-col justify-center gap-3 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-6">
              <div className="min-w-0">
                <h1 className="break-words font-display text-[24px] font-semibold leading-tight text-aff-cream-50 sm:text-[30px]">
                  Our{" "}
                  <span className="bg-gradient-to-r from-aff-gold-600 via-aff-gold-300 to-aff-gold-500 bg-clip-text text-transparent">
                    Collection
                  </span>
                </h1>
                <p className="mt-1.5 max-w-xl font-sans text-[13px] leading-relaxed text-aff-cream-50/75 sm:text-[14px]">
                  Browse every product and pack at your own price.
                </p>
              </div>

              {catalog && (
                <p className="inline-flex w-fit max-w-full items-center gap-2 rounded-full border border-aff-gold-400/40 bg-aff-green-950/60 px-3.5 py-1.5 font-sans text-[12px] font-medium text-aff-gold-300">
                  <span
                    aria-hidden="true"
                    className="h-1.5 w-1.5 shrink-0 rounded-full bg-aff-gold-300 shadow-[0_0_8px_2px_rgba(241,204,156,0.6)]"
                  />
                  <span className="truncate">
                    Your discount: {catalog.discountPercent}% off retail
                  </span>
                </p>
              )}
            </div>
          </div>
        </header>
      </Reveal>

      {catalog ? (
        <ProductsGrid catalog={catalog} />
      ) : (
        <div className="rounded-2xl border border-dashed border-aff-gold-500/50 bg-aff-ivory px-6 py-10 text-center font-sans text-[14px] text-aff-muted">
          Your account isn&apos;t ready yet. Please contact support.
        </div>
      )}
    </div>
  );
}