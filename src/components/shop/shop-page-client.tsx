// "use client";

// import { useEffect, useMemo, useState } from "react";
// import { useSearchParams } from "next/navigation";
// import {
//   type Product,
//   getCategories,
//   getPrice,
//   getPriceRange,
// } from "@/data/products";
// import { useMarket } from "@/components/providers/market-provider";
// import {
//   ShopFilters,
//   type ShopFiltersState,
// } from "@/components/shop/shop-filters";
// import { ShopToolbar, type SortOption } from "@/components/shop/shop-toolbar";
// import { ProductGrid } from "@/components/shop/product-grid";
// import { Pagination } from "@/components/ui/pagination";

// const PAGE_SIZE = 12;

// const initialFilters: ShopFiltersState = {
//   categories: [],
//   maxPrice: null,
//   states: [],
// };

// export function ShopPageClient({ products }: { products: Product[] }) {
//   const [filters, setFilters] = useState<ShopFiltersState>(initialFilters);
//   const [sort, setSort] = useState<SortOption>("featured");
//   const [page, setPage] = useState(1);

//   const { market } = useMarket();
//   const currency = market.currencyCode;
//   const priceRange = useMemo(
//     () => getPriceRange(products, currency),
//     [products, currency],
//   );
//   const categories = useMemo(() => getCategories(products), [products]);

//   // A price limit set in one currency makes no sense in another.
//   useEffect(() => {
//     setFilters((prev) => ({ ...prev, maxPrice: null }));
//   }, [currency]);

//   const searchParams = useSearchParams();
//   const urlQuery = searchParams.get("q") ?? "";
//   const [search, setSearch] = useState(urlQuery);

//   // Header search on /shop changes the URL without remounting this
//   // component, so keep the search box in sync with ?q=.
//   useEffect(() => {
//     setSearch(urlQuery);
//     setPage(1);
//   }, [urlQuery]);

//   const filtered = useMemo(() => {
//     let result = products.filter((product) => {
//       const matchesCategory =
//         filters.categories.length === 0 ||
//         filters.categories.includes(product.category);
//       const matchesPrice =
//         getPrice(product, currency) <= (filters.maxPrice ?? Infinity);
//       const matchesState =
//         filters.states.length === 0 || filters.states.includes(product.state);
//       const matchesSearch =
//         search.trim() === "" ||
//         product.name.toLowerCase().includes(search.trim().toLowerCase()) ||
//         product.category.toLowerCase().includes(search.trim().toLowerCase());

//       return matchesCategory && matchesPrice && matchesState && matchesSearch;
//     });

//     result = [...result].sort((a, b) => {
//       if (sort === "price-asc")
//         return getPrice(a, currency) - getPrice(b, currency);
//       if (sort === "price-desc")
//         return getPrice(b, currency) - getPrice(a, currency);
//       if (sort === "name-asc") return a.name.localeCompare(b.name);
//       return 0; // "featured" — keep catalog order
//     });

//     return result;
//   }, [products, filters, search, sort, currency]);

//   const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
//   const currentPage = Math.min(page, totalPages);
//   const paged = filtered.slice(
//     (currentPage - 1) * PAGE_SIZE,
//     currentPage * PAGE_SIZE,
//   );

//   function updateFilters(next: ShopFiltersState) {
//     setFilters(next);
//     setPage(1);
//   }

//   function updateSearch(value: string) {
//     setSearch(value);
//     setPage(1);
//   }

//   return (
//     <div className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8 lg:py-12">
//       <div className="flex flex-col gap-10 lg:flex-row">
//         <ShopFilters
//           allCategories={categories}
//           priceMin={priceRange.min}
//           priceMax={priceRange.max}
//           currency={currency}
//           value={filters}
//           onChange={updateFilters}
//         />

//         <div className="flex-1">
//           <ShopToolbar
//             search={search}
//             onSearchChange={updateSearch}
//             sort={sort}
//             onSortChange={setSort}
//             resultCount={filtered.length}
//           />

//           <div className="mt-8">
//             <ProductGrid products={paged} />
//           </div>

//           <Pagination
//             page={currentPage}
//             totalPages={totalPages}
//             onChange={setPage}
//           />
//         </div>
//       </div>
//     </div>
//   );
// }

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import {
  type Product,
  getCategories,
  getPrice,
  getPriceRange,
} from "@/data/products";
import { formatPrice } from "@/lib/utils";
import { useMarket } from "@/components/providers/market-provider";
import {
  ShopFilters,
  type ShopFiltersState,
} from "@/components/shop/shop-filters";
import { ShopToolbar, type SortOption } from "@/components/shop/shop-toolbar";
import { ProductGrid } from "@/components/shop/product-grid";
import { Pagination } from "@/components/ui/pagination";

const PAGE_SIZE = 12;

const initialFilters: ShopFiltersState = {
  categories: [],
  maxPrice: null,
  states: [],
};

export function ShopPageClient({ products }: { products: Product[] }) {
  const [filters, setFilters] = useState<ShopFiltersState>(initialFilters);
  const [sort, setSort] = useState<SortOption>("featured");
  const [page, setPage] = useState(1);
  const panelRef = useRef<HTMLDivElement>(null);

  const { market } = useMarket();
  const currency = market.currencyCode;
  const priceRange = useMemo(
    () => getPriceRange(products, currency),
    [products, currency],
  );
  const categories = useMemo(() => getCategories(products), [products]);

  // A price limit set in one currency makes no sense in another.
  useEffect(() => {
    setFilters((prev) => ({ ...prev, maxPrice: null }));
  }, [currency]);

  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") ?? "";
  const [search, setSearch] = useState(urlQuery);

  // Header search on /shop changes the URL without remounting this
  // component, so keep the search box in sync with ?q=.
  useEffect(() => {
    setSearch(urlQuery);
    setPage(1);
  }, [urlQuery]);

  const filtered = useMemo(() => {
    let result = products.filter((product) => {
      const matchesCategory =
        filters.categories.length === 0 ||
        filters.categories.includes(product.category);
      const matchesPrice =
        getPrice(product, currency) <= (filters.maxPrice ?? Infinity);
      const matchesState =
        filters.states.length === 0 || filters.states.includes(product.state);
      const matchesSearch =
        search.trim() === "" ||
        product.name.toLowerCase().includes(search.trim().toLowerCase()) ||
        product.category.toLowerCase().includes(search.trim().toLowerCase());

      return matchesCategory && matchesPrice && matchesState && matchesSearch;
    });

    result = [...result].sort((a, b) => {
      if (sort === "price-asc")
        return getPrice(a, currency) - getPrice(b, currency);
      if (sort === "price-desc")
        return getPrice(b, currency) - getPrice(a, currency);
      if (sort === "name-asc") return a.name.localeCompare(b.name);
      return 0; // "featured" — keep catalog order
    });

    return result;
  }, [products, filters, search, sort, currency]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  function updateFilters(next: ShopFiltersState) {
    setFilters(next);
    setPage(1);
  }

  function updateSearch(value: string) {
    setSearch(value);
    setPage(1);
  }

  // After changing page, bring the top of the product panel into view.
  function changePage(next: number) {
    setPage(next);
    panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // Active filters shown as removable chips above the grid.
  const chips: { key: string; label: string; onRemove: () => void }[] = [
    ...filters.categories.map((category) => ({
      key: `category-${category}`,
      label: category,
      onRemove: () =>
        updateFilters({
          ...filters,
          categories: filters.categories.filter((c) => c !== category),
        }),
    })),
    ...filters.states.map((state) => ({
      key: `state-${state}`,
      label: state.replace("-", " "),
      onRemove: () =>
        updateFilters({
          ...filters,
          states: filters.states.filter((s) => s !== state),
        }),
    })),
    ...(filters.maxPrice !== null && filters.maxPrice < priceRange.max
      ? [
          {
            key: "price",
            label: `Up to ${formatPrice(filters.maxPrice, currency)}`,
            onRemove: () => updateFilters({ ...filters, maxPrice: null }),
          },
        ]
      : []),
  ];

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-8 lg:py-12  bg-pattern">
      <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
        <ShopFilters
          allCategories={categories}
          priceMin={priceRange.min}
          priceMax={priceRange.max}
          currency={currency}
          value={filters}
          onChange={updateFilters}
        />

        {/* Product panel */}
        <div
          ref={panelRef}
          className="relative min-w-0 flex-1 scroll-mt-24 overflow-hidden rounded-3xl border border-[#e4dac8] bg-white/60 p-4 shadow-[0_24px_50px_-34px_rgba(16,38,15,0.35)] backdrop-blur-md sm:p-6"
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-green dark:bg-copper"
          />

          <ShopToolbar
            search={search}
            onSearchChange={updateSearch}
            sort={sort}
            onSortChange={setSort}
            resultCount={filtered.length}
          />

          {chips.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {chips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={chip.onRemove}
                  aria-label={`Remove filter ${chip.label}`}
                  className="inline-flex min-h-[36px] cursor-pointer touch-manipulation items-center gap-1.5 rounded-full bg-green pl-3.5 pr-2.5 font-sans text-[12.5px] font-medium capitalize text-cream transition-colors dark:bg-copper dark:text-espresso-deep active:bg-espresso-deep dark:active:bg-copper-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-copper [@media(hover:hover)]:hover:bg-espresso-deep dark:[@media(hover:hover)]:hover:bg-copper-light"
                >
                  {chip.label}
                  <X className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                </button>
              ))}
              <button
                type="button"
                onClick={() => updateFilters(initialFilters)}
                className="min-h-[36px] cursor-pointer touch-manipulation rounded-full px-3 font-sans text-[12.5px] font-medium text-green underline-offset-4 dark:text-copper active:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-copper [@media(hover:hover)]:hover:underline"
              >
                Clear all
              </button>
            </div>
          )}

          <div className="mt-6">
            <ProductGrid products={paged} />
          </div>

          {totalPages > 1 && (
            <div className="mt-8 border-t border-[#e4dac8] pt-6">
              <Pagination
                page={currentPage}
                totalPages={totalPages}
                onChange={changePage}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}