// "use client";

// import { useMemo, useState } from "react";
// import { Input, Select } from "antd";
// import { PackageSearch, Percent, Search } from "lucide-react";
// import { formatPrice } from "@/lib/utils";
// import type { StockistCatalog } from "@/lib/stockist/products-queries";

// // The stockist's product list: search, a category filter, and one card per
// // product with its packs. Each pack shows the retail price (struck through)
// // and the stockist's own price. Data comes from the server page
// // (getStockistCatalog); filtering happens here in the browser, so there is
// // no server round trip while typing. Read-only for now: the "request" step
// // arrives with the Bulk Orders page.

// const ALL = "__all__";

// export function ProductsGrid({ catalog }: { catalog: StockistCatalog }) {
//   const [search, setSearch] = useState("");
//   const [category, setCategory] = useState<string>(ALL);

//   const visible = useMemo(() => {
//     const q = search.trim().toLowerCase();
//     return catalog.products.filter((p) => {
//       if (category !== ALL && p.category !== category) return false;
//       if (!q) return true;
//       return (
//         p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
//       );
//     });
//   }, [catalog.products, search, category]);

//   return (
//     <>
//       {/* Discount reminder */}
//       <div className="flex items-center gap-3 rounded-2xl border border-border bg-cream-soft px-4 py-3">
//         <span className="flex h-9 w-15 shrink-0 items-center justify-center rounded-full bg-copper/10 text-copper">
//           {catalog.discountPercent}{" "}
//           <Percent className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
//         </span>
//         <p className="font-sans text-[14px] leading-relaxed text-espresso">
//           Your discount is off the retail price. All prices are in USD.
//         </p>{" "}
//       </div>

//       {/* Filters */}
//       <div className="mt-4 flex flex-col gap-3 sm:flex-row">
//         <Input.Search
//           size="large"
//           allowClear
//           value={search}
//           onChange={(e) => setSearch(e.target.value)}
//           placeholder="Search products"
//           aria-label="Search products"
//           className="w-full sm:max-w-sm"
//         />
//         <Select<string>
//           size="large"
//           value={category}
//           onChange={setCategory}
//           aria-label="Filter by category"
//           className="sm:w-56"
//           options={[
//             { value: ALL, label: "All categories" },
//             ...catalog.categories.map((c) => ({ value: c, label: c })),
//           ]}
//         />
//       </div>

//       <p className="mt-4 font-sans text-[14px] text-warm-gray">
//         {visible.length} {visible.length === 1 ? "product" : "products"}
//       </p>

//       {/* List */}
//       {visible.length === 0 ? (
//         <div className="mt-4 flex flex-col items-center rounded-2xl border border-border px-6 py-14 text-center">
//           <span className="flex h-11 w-11 items-center justify-center rounded-full bg-copper/10 text-copper">
//             <PackageSearch
//               className="h-5 w-5"
//               strokeWidth={1.8}
//               aria-hidden="true"
//             />
//           </span>
//           <h2 className="mt-4 font-display text-[22px] leading-tight text-espresso">
//             {catalog.products.length === 0
//               ? "No products available yet"
//               : "No products match"}
//           </h2>
//           <p className="mt-2 max-w-sm font-sans text-[14px] leading-relaxed text-warm-gray">
//             {catalog.products.length === 0
//               ? "Products will appear here as soon as Finasto adds them."
//               : "Try a different search or choose another category."}
//           </p>
//         </div>
//       ) : (
//         <ul className="mt-4 grid gap-4 md:grid-cols-2">
//           {visible.map((product) => (
//             <li
//               key={product.id}
//               className="overflow-hidden rounded-2xl border border-border"
//             >
//               <div className="flex items-center gap-3 px-4 py-4">
//                 {/* eslint-disable-next-line @next/next/no-img-element */}
//                 <img
//                   src={product.image}
//                   alt=""
//                   className="h-16 w-16 shrink-0 rounded-md border border-border object-cover"
//                 />
//                 <div className="min-w-0">
//                   <h2 className="truncate font-display text-[20px] leading-tight text-espresso">
//                     {product.name}
//                   </h2>
//                   <p className="font-sans text-[12px] text-warm-gray">
//                     {product.category}
//                   </p>
//                 </div>
//               </div>

//               <ul className="divide-y divide-border border-t border-border">
//                 {product.packs.map((pack) => (
//                   <li
//                     key={pack.id}
//                     className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3"
//                   >
//                     <div className="min-w-0">
//                       <p className="font-sans text-[14px] font-medium text-espresso">
//                         {pack.name}
//                       </p>
//                       <p className="font-sans text-[12px]">
//                         {pack.inStock ? (
//                           <span className="text-green">Available</span>
//                         ) : (
//                           <span className="text-copper">Out of stock</span>
//                         )}
//                         {pack.weight != null && (
//                           <span className="text-warm-gray">
//                             {" · "}
//                             {pack.weight}g
//                           </span>
//                         )}
//                       </p>
//                     </div>
//                     <div className="text-right">
//                       <p className="font-sans text-[16px] font-medium text-espresso">
//                         {formatPrice(pack.yourPriceUsd, "USD")}
//                       </p>
//                       {pack.yourPriceUsd !== pack.retailUsd && (
//                         <p className="font-sans text-[12px] text-warm-gray line-through">
//                           {formatPrice(pack.retailUsd, "USD")}
//                         </p>
//                       )}
//                     </div>
//                   </li>
//                 ))}
//               </ul>
//             </li>
//           ))}
//         </ul>
//       )}
//     </>
//   );
// }
"use client";

import { useMemo, useState } from "react";
import { Input, Select } from "antd";
import { PackageSearch, Percent } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import type { StockistCatalog } from "@/lib/stockist/products-queries";

// The stockist's product list: search, a category filter, and one card per
// product with its packs. Each pack shows the retail price (struck through)
// and the stockist's own price. Data comes from the server page
// (getStockistCatalog); filtering happens here in the browser, so there is
// no server round trip while typing. Read-only for now: the "request" step
// arrives with the Bulk Orders page.

const ALL = "__all__";

const TOP_LINE =
  "pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-aff-gold-600 via-aff-gold-300 to-aff-gold-600 opacity-70";

export function ProductsGrid({ catalog }: { catalog: StockistCatalog }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>(ALL);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return catalog.products.filter((p) => {
      if (category !== ALL && p.category !== category) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
      );
    });
  }, [catalog.products, search, category]);

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      {/* Filters + discount reminder */}
      <div className="relative isolate flex flex-col gap-4 overflow-hidden rounded-2xl border border-aff-border bg-gradient-to-b from-aff-ivory to-white p-4 pt-5 shadow-[0_10px_30px_-22px_rgba(172,131,78,0.45)] sm:p-5">
        <span aria-hidden className={TOP_LINE} />

        <div className="flex items-start gap-3">
          <span className="flex h-9 shrink-0 items-center justify-center gap-0.5 rounded-full bg-aff-green-900 px-3 font-sans text-[13px] font-semibold tabular-nums text-aff-gold-300">
            {catalog.discountPercent}
            <Percent className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
          </span>
          <p className="min-w-0 pt-1.5 font-sans text-[13px] leading-relaxed text-aff-muted">
            Your discount is off the retail price. All prices are in USD.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Input.Search
            size="large"
            allowClear
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products"
            aria-label="Search products"
            className="w-full sm:max-w-sm"
          />
          <Select<string>
            size="large"
            value={category}
            onChange={setCategory}
            aria-label="Filter by category"
            className="w-full sm:w-56"
            options={[
              { value: ALL, label: "All categories" },
              ...catalog.categories.map((c) => ({ value: c, label: c })),
            ]}
          />
          <p
            aria-live="polite"
            className="font-sans text-[13px] text-aff-muted sm:ml-auto"
          >
            <span className="font-semibold text-aff-green-900">
              {visible.length}
            </span>{" "}
            {visible.length === 1 ? "product" : "products"}
          </p>
        </div>
      </div>

      {/* List */}
      {visible.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-aff-gold-500/50 bg-aff-ivory px-6 py-14 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full border border-aff-gold-400/50 bg-aff-green-900 text-aff-gold-300">
            <PackageSearch
              className="h-5 w-5"
              strokeWidth={1.7}
              aria-hidden="true"
            />
          </span>
          <h2 className="mt-4 font-display text-[22px] leading-tight text-aff-green-900">
            {catalog.products.length === 0
              ? "No products available yet"
              : "No products match"}
          </h2>
          <p className="mt-2 max-w-sm font-sans text-[14px] leading-relaxed text-aff-muted">
            {catalog.products.length === 0
              ? "Products will appear here as soon as Finasto adds them."
              : "Try a different search or choose another category."}
          </p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:gap-5 md:grid-cols-2">
          {visible.map((product) => (
            <li
              key={product.id}
              className="group relative isolate touch-manipulation overflow-hidden rounded-2xl border border-aff-border bg-white shadow-[0_6px_16px_-12px_rgba(3,24,7,0.3)] transition-all duration-300 ease-out motion-reduce:transition-none [@media(hover:hover)]:hover:-translate-y-1 [@media(hover:hover)]:hover:shadow-[0_20px_36px_-18px_rgba(172,131,78,0.55)] motion-reduce:[@media(hover:hover)]:hover:translate-y-0"
            >
              <span aria-hidden className={TOP_LINE} />

              <div className="flex items-center gap-3 bg-gradient-to-b from-aff-ivory to-white px-4 pb-4 pt-5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={product.image}
                  alt=""
                  loading="lazy"
                  className="h-16 w-16 shrink-0 rounded-xl border border-aff-border object-cover transition-transform duration-300 motion-reduce:transition-none [@media(hover:hover)]:group-hover:scale-105"
                />
                <div className="min-w-0">
                  <h2 className="truncate font-display text-[20px] font-semibold leading-tight text-aff-green-900">
                    {product.name}
                  </h2>
                  <span className="mt-1 inline-block max-w-full truncate rounded-full border border-aff-gold-600/40 bg-aff-gold-400/25 px-2.5 py-0.5 font-sans text-[11px] font-medium text-[#7A5526]">
                    {product.category}
                  </span>
                </div>
              </div>

              <ul className="divide-y divide-aff-border border-t border-aff-border">
                {product.packs.map((pack) => (
                  <li
                    key={pack.id}
                    className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="font-sans text-[14px] font-medium text-aff-green-900">
                        {pack.name}
                      </p>
                      <p className="flex flex-wrap items-center gap-x-1.5 font-sans text-[12px]">
                        {pack.inStock ? (
                          <span className="inline-flex items-center gap-1.5 font-medium text-[#1F7A52]">
                            <span
                              aria-hidden
                              className="h-1.5 w-1.5 rounded-full bg-[#2F9E6B]"
                            />
                            Available
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 font-medium text-[#A3342B]">
                            <span
                              aria-hidden
                              className="h-1.5 w-1.5 rounded-full bg-[#BE3C32]"
                            />
                            Out of stock
                          </span>
                        )}
                        {pack.weight != null && (
                          <span className="text-aff-muted">· {pack.weight}g</span>
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-display text-[17px] font-semibold tabular-nums text-aff-green-900">
                        {formatPrice(pack.yourPriceUsd, "USD")}
                      </p>
                      {pack.yourPriceUsd !== pack.retailUsd && (
                        <p className="font-sans text-[12px] tabular-nums text-aff-muted line-through">
                          {formatPrice(pack.retailUsd, "USD")}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}