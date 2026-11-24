// // "use client";

// // import { useCallback, useEffect, useState, useTransition } from "react";
// // import { usePathname, useRouter, useSearchParams } from "next/navigation";
// // import { Input, Select } from "antd";
// // import { X } from "lucide-react";
// // import type {
// //   CommissionState,
// //   OrderStatus,
// //   PaymentStatus,
// // } from "@/lib/affiliate/orders-queries";
// // import {
// //   COMMISSION_STATE_OPTIONS,
// //   ORDER_STATUS_OPTIONS,
// //   PAYMENT_STATUS_OPTIONS,
// // } from "./order-status-badge";

// // // Search + filter bar for the affiliate Orders list. All state lives in
// // // the URL (?q=&status=&payment=&commission=), same pattern as
// // // affiliate-filters.tsx, so the list is shareable and bookmarkable and
// // // the server page re-queries on every change.
// // //
// // // An empty Select (cleared, or never chosen) means "all": its param is
// // // simply removed from the URL.

// // function useDebouncedValue<T>(value: T, delayMs: number): T {
// //   const [debounced, setDebounced] = useState(value);
// //   useEffect(() => {
// //     const id = setTimeout(() => setDebounced(value), delayMs);
// //     return () => clearTimeout(id);
// //   }, [value, delayMs]);
// //   return debounced;
// // }

// // export function OrdersFilters({
// //   search,
// //   status,
// //   paymentStatus,
// //   commissionState,
// //   resultCount,
// // }: {
// //   search: string;
// //   status: OrderStatus | undefined;
// //   paymentStatus: PaymentStatus | undefined;
// //   commissionState: CommissionState | undefined;
// //   resultCount: number;
// // }) {
// //   const router = useRouter();
// //   const pathname = usePathname();
// //   const searchParams = useSearchParams();
// //   const [isPending, startTransition] = useTransition();

// //   const [query, setQuery] = useState(search);
// //   const debouncedQuery = useDebouncedValue(query, 350);

// //   const updateParams = useCallback(
// //     (next: {
// //       q?: string;
// //       status?: string;
// //       payment?: string;
// //       commission?: string;
// //     }) => {
// //       const params = new URLSearchParams(searchParams.toString());

// //       // Set a param, or remove it when the value is empty.
// //       const apply = (key: string, value: string | undefined) => {
// //         if (value === undefined) return;
// //         if (value) params.set(key, value);
// //         else params.delete(key);
// //       };

// //       apply("q", next.q);
// //       apply("status", next.status);
// //       apply("payment", next.payment);
// //       apply("commission", next.commission);
// //       params.delete("page"); // a new filter always starts at page 1

// //       const qs = params.toString();
// //       startTransition(() => {
// //         router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
// //       });
// //     },
// //     [pathname, router, searchParams],
// //   );

// //   useEffect(() => {
// //     if (debouncedQuery !== search) updateParams({ q: debouncedQuery });
// //     // eslint-disable-next-line react-hooks/exhaustive-deps
// //   }, [debouncedQuery]);

// //   const hasFilters = Boolean(
// //     search || status || paymentStatus || commissionState,
// //   );

// //   function clearAll() {
// //     setQuery("");
// //     startTransition(() => {
// //       router.push(pathname, { scroll: false });
// //     });
// //   }

// //    return (
    
// //     <div className="relative isolate flex flex-col gap-4 overflow-hidden rounded-2xl border border-aff-gold-400/30 bg-gradient-to-br from-aff-green-950 via-aff-green-900 to-aff-green-800 p-4 shadow-[0_18px_44px_-22px_rgba(172,131,78,0.6)] sm:p-5">
// //       <span
// //         aria-hidden="true"
// //         className="pointer-events-none absolute -right-12 -top-12 -z-10 h-44 w-44 rounded-full bg-aff-gold-400/15 blur-3xl" 
// //       />
// //       <span
// //         aria-hidden="true"
// //         className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-aff-gold-300 to-transparent"
// //       />
      
// //       <Input.Search
// //         size="large"
// //         allowClear
// //         value={query}
// //         onChange={(e) => setQuery(e.target.value)}
// //         placeholder="Search by order number..."
// //         className="w-full sm:max-w-sm"
// //         aria-label="Search orders by order number"
// //       /> 

// //       <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center">
// //         <Select
// //           value={status}
// //           onChange={(value) => updateParams({ status: value ?? "" })}
// //           allowClear
// //           placeholder="All order statuses"
// //           className="w-full lg:w-[190px]"
// //           aria-label="Filter by order status"
// //           options={ORDER_STATUS_OPTIONS}
// //         />

// //         <Select
// //           value={paymentStatus}
// //           onChange={(value) => updateParams({ payment: value ?? "" })}
// //           allowClear
// //           placeholder="All payment statuses"
// //           className="w-full lg:w-[200px]"
// //           aria-label="Filter by payment status"
// //           options={PAYMENT_STATUS_OPTIONS}
// //         />

// //         <Select
// //           value={commissionState}
// //           onChange={(value) => updateParams({ commission: value ?? "" })}
// //           allowClear
// //           placeholder="All commission states"
// //           className="w-full sm:col-span-2 lg:col-span-1 lg:w-[210px]"
// //           aria-label="Filter by commission state"
// //           options={COMMISSION_STATE_OPTIONS}
// //         />

// //         {hasFilters && (
// //           <button
// //             type="button"
// //             onClick={clearAll}
// //             className="inline-flex h-8 w-fit cursor-pointer items-center gap-1 rounded-full border border-aff-border bg-aff-ivory px-3 font-sans text-[13px] font-medium text-aff-muted transition-colors hover:border-aff-gold-500 hover:text-aff-green-900"
// //           >
// //             <X className="h-3.5 w-3.5" aria-hidden="true" />
// //             Clear filters
// //           </button>
// //         )}
// //       </div>

     
// //     </div>
// //   );
// // }
// "use client";

// import { useCallback, useEffect, useState, useTransition } from "react";
// import { usePathname, useRouter, useSearchParams } from "next/navigation";
// import { Input, Select } from "antd";
// import { X } from "lucide-react";
// import type {
//   CommissionState,
//   OrderStatus,
//   PaymentStatus,
// } from "@/lib/affiliate/orders-queries";
// import {
//   COMMISSION_STATE_OPTIONS,
//   ORDER_STATUS_OPTIONS,
//   PAYMENT_STATUS_OPTIONS,
// } from "./order-status-badge";

// // Search + filter bar for the affiliate Orders list. All state lives in
// // the URL (?q=&status=&payment=&commission=), same pattern as
// // affiliate-filters.tsx, so the list is shareable and bookmarkable and
// // the server page re-queries on every change.
// //
// // An empty Select (cleared, or never chosen) means "all": its param is
// // simply removed from the URL.

// function useDebouncedValue<T>(value: T, delayMs: number): T {
//   const [debounced, setDebounced] = useState(value);
//   useEffect(() => {
//     const id = setTimeout(() => setDebounced(value), delayMs);
//     return () => clearTimeout(id);
//   }, [value, delayMs]);
//   return debounced;
// }

// export function OrdersFilters({
//   search,
//   status,
//   paymentStatus,
//   commissionState,
//   resultCount,
// }: {
//   search: string;
//   status: OrderStatus | undefined;
//   paymentStatus: PaymentStatus | undefined;
//   commissionState: CommissionState | undefined;
//   resultCount: number;
// }) {
//   const router = useRouter();
//   const pathname = usePathname();
//   const searchParams = useSearchParams();
//   const [isPending, startTransition] = useTransition();

//   const [query, setQuery] = useState(search);
//   const debouncedQuery = useDebouncedValue(query, 350);

//   const updateParams = useCallback(
//     (next: {
//       q?: string;
//       status?: string;
//       payment?: string;
//       commission?: string;
//     }) => {
//       const params = new URLSearchParams(searchParams.toString());

//       // Set a param, or remove it when the value is empty.
//       const apply = (key: string, value: string | undefined) => {
//         if (value === undefined) return;
//         if (value) params.set(key, value);
//         else params.delete(key);
//       };

//       apply("q", next.q);
//       apply("status", next.status);
//       apply("payment", next.payment);
//       apply("commission", next.commission);
//       params.delete("page"); // a new filter always starts at page 1

//       const qs = params.toString();
//       startTransition(() => {
//         router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
//       });
//     },
//     [pathname, router, searchParams],
//   );

//   useEffect(() => {
//     if (debouncedQuery !== search) updateParams({ q: debouncedQuery });
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [debouncedQuery]);

//   const hasFilters = Boolean(
//     search || status || paymentStatus || commissionState,
//   );

//   function clearAll() {
//     setQuery("");
//     startTransition(() => {
//       router.push(pathname, { scroll: false });
//     });
//   }

//   return (
//     <div className="relative isolate flex flex-col gap-4 overflow-hidden rounded-2xl border border-aff-border bg-gradient-to-b from-aff-ivory to-white p-4 shadow-[0_10px_30px_-22px_rgba(172,131,78,0.45)] sm:p-5">
//       <span
//         aria-hidden="true"
//         className="pointer-events-none absolute -right-12 -top-12 -z-10 h-44 w-44 rounded-full bg-aff-gold-400/25 blur-3xl"
//       />
//       <span
//         aria-hidden="true"
//         className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-aff-gold-500 to-transparent"
//       />

//       <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
//         <Input.Search
//           size="large"
//           allowClear
//           value={query}
//           onChange={(e) => setQuery(e.target.value)}
//           placeholder="Search by order number..."
//           className="w-full sm:max-w-sm"
//           aria-label="Search orders by order number"
//         />
//         <p
//           aria-live="polite"
//           className="font-sans text-[13px] text-aff-muted transition-opacity"
//           style={{ opacity: isPending ? 0.6 : 1 }}
//         >
//           <span className="font-semibold text-aff-green-900">
//             {resultCount}
//           </span>{" "}
//           {resultCount === 1 ? "order" : "orders"}
//         </p>
//       </div>

//       <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center">
//         <Select
//           value={status}
//           onChange={(value) => updateParams({ status: value ?? "" })}
//           allowClear
//           placeholder="All order statuses"
//           className="w-full lg:w-[190px]"
//           aria-label="Filter by order status"
//           options={ORDER_STATUS_OPTIONS}
//         />

//         <Select
//           value={paymentStatus}
//           onChange={(value) => updateParams({ payment: value ?? "" })}
//           allowClear
//           placeholder="All payment statuses"
//           className="w-full lg:w-[200px]"
//           aria-label="Filter by payment status"
//           options={PAYMENT_STATUS_OPTIONS}
//         />

//         <Select
//           value={commissionState}
//           onChange={(value) => updateParams({ commission: value ?? "" })}
//           allowClear
//           placeholder="All commission states"
//           className="w-full sm:col-span-2 lg:col-span-1 lg:w-[210px]"
//           aria-label="Filter by commission state"
//           options={COMMISSION_STATE_OPTIONS}
//         />

//         {hasFilters && (
//           <button
//             type="button"
//             onClick={clearAll}
//             className="inline-flex h-8 w-fit cursor-pointer items-center gap-1 rounded-full border border-aff-border bg-white px-3 font-sans text-[13px] font-medium text-aff-muted transition-colors hover:border-aff-gold-500 hover:text-aff-green-900"
//           >
//             <X className="h-3.5 w-3.5" aria-hidden="true" />
//             Clear filters
//           </button>
//         )}
//       </div>
//     </div>
//   );
// }

"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ConfigProvider, Input, Select } from "antd";
import { SlidersHorizontal, X } from "lucide-react";
import type {
  CommissionState,
  OrderStatus,
  PaymentStatus,
} from "@/lib/affiliate/orders-queries";
import {
  COMMISSION_STATE_OPTIONS,
  ORDER_STATUS_OPTIONS,
  PAYMENT_STATUS_OPTIONS,
} from "./order-status-badge";

// Search + filter bar for the affiliate Orders list. All state lives in
// the URL (?q=&status=&payment=&commission=), so the list is shareable and
// bookmarkable and the server page re-queries on every change.
//
// An empty Select (cleared, or never chosen) means "all": its param is
// simply removed from the URL.

// Antd draws its own inputs and dropdowns, so Tailwind classes can't theme
// them reliably. ConfigProvider tokens can, and they also reach the dropdown
// popup, which renders in a portal outside this component.
// Swap these hex values for your exact aff-green / aff-gold tokens if they differ.
const CREAM = "#FBF7EF";
const GOLD_300 = "#F1CC9C";
const COPPER = "#AC834E";
const GREEN_900 = "#0E3B2C"; // popup background, keep it solid and dark

const antdTheme = {
  token: {
    colorPrimary: COPPER,
    colorBgContainer: "rgba(255,255,255,0.06)",
    colorBgElevated: GREEN_900,
    colorBorder: "rgba(241,204,156,0.28)",
    colorText: CREAM,
    colorTextPlaceholder: "rgba(251,247,239,0.5)",
    colorTextQuaternary: "rgba(251,247,239,0.6)", // arrow + clear icons
    colorTextDescription: "rgba(241,204,156,0.85)", // search icon
    borderRadius: 12,
    controlOutline: "rgba(241,204,156,0.2)",
  },
  components: {
    Input: {
      colorBgContainer: "rgba(255,255,255,0.06)",
      hoverBorderColor: GOLD_300,
      activeBorderColor: GOLD_300,
      activeBg: "rgba(255,255,255,0.1)",
      hoverBg: "rgba(255,255,255,0.09)",
    },
    Select: {
      colorBgContainer: "rgba(255,255,255,0.06)",
      selectorBg: "rgba(255,255,255,0.06)",
      hoverBorderColor: GOLD_300,
      activeBorderColor: GOLD_300,
      optionSelectedBg: "rgba(172,131,78,0.35)",
      optionSelectedColor: CREAM,
      optionActiveBg: "rgba(241,204,156,0.12)",
    },
  },
};

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

export function OrdersFilters({
  search,
  status,
  paymentStatus,
  commissionState,
  resultCount,
}: {
  search: string;
  status: OrderStatus | undefined;
  paymentStatus: PaymentStatus | undefined;
  commissionState: CommissionState | undefined;
  resultCount: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [query, setQuery] = useState(search);
  const debouncedQuery = useDebouncedValue(query, 350);

  const updateParams = useCallback(
    (next: {
      q?: string;
      status?: string;
      payment?: string;
      commission?: string;
    }) => {
      const params = new URLSearchParams(searchParams.toString());

      // Set a param, or remove it when the value is empty.
      const apply = (key: string, value: string | undefined) => {
        if (value === undefined) return;
        if (value) params.set(key, value);
        else params.delete(key);
      };

      apply("q", next.q);
      apply("status", next.status);
      apply("payment", next.payment);
      apply("commission", next.commission);
      params.delete("page"); // a new filter always starts at page 1

      const qs = params.toString();
      startTransition(() => {
        router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      });
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    if (debouncedQuery !== search) updateParams({ q: debouncedQuery });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery]);

  const hasFilters = Boolean(
    search || status || paymentStatus || commissionState,
  );

  function clearAll() {
    setQuery("");
    startTransition(() => {
      router.push(pathname, { scroll: false });
    });
  }

  return (
    <ConfigProvider theme={antdTheme}>
      <div className="rounded-2xl bg-gradient-to-br from-aff-gold-600 via-aff-gold-300 to-aff-gold-500 p-[1.5px] shadow-[0_18px_44px_-22px_rgba(172,131,78,0.55)]">
        <div className="relative isolate flex flex-col gap-4 overflow-hidden rounded-[15px] bg-gradient-to-br from-aff-green-950 via-aff-green-900 to-aff-green-800 p-4 sm:p-5">
          {/* static gold glow */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -right-12 -top-12 -z-10 h-44 w-44 rounded-full bg-aff-gold-400/15 blur-3xl"
          />
          {/* thin gold line on top */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-aff-gold-300 to-transparent"
          />

          {/* Top row: title + search + result count */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-aff-gold-300">
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
              <span className="font-sans text-[13px] font-semibold uppercase tracking-wider">
                Filter orders
              </span>
            </div>
 {/* Filter selects */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center">
            <Select
              size="large"
              value={status}
              onChange={(value) => updateParams({ status: value ?? "" })}
              allowClear
              placeholder="All order status"
              className="w-full lg:w-[200px]"
              aria-label="Filter by order status"
              options={ORDER_STATUS_OPTIONS}
            />

            <Select
              size="large"
              value={paymentStatus}
              onChange={(value) => updateParams({ payment: value ?? "" })}
              allowClear
              placeholder="All payment status"
              className="w-full lg:w-[210px]"
              aria-label="Filter by payment status"
              options={PAYMENT_STATUS_OPTIONS}
            />

            <Select
              size="large"
              value={commissionState}
              onChange={(value) => updateParams({ commission: value ?? "" })}
              allowClear
              placeholder="All   statuses"
              className="w-full sm:col-span-2 lg:col-span-1 lg:w-[220px]"
              aria-label="Filter by commission state"
              options={COMMISSION_STATE_OPTIONS}
            />

            {hasFilters && (
              <button
                type="button"
                onClick={clearAll}
                className="inline-flex h-10 w-fit cursor-pointer items-center gap-1.5 rounded-full border border-aff-gold-400/60 bg-aff-gold-400/10 px-4 font-sans text-[13px] font-medium text-aff-gold-300 transition-colors hover:bg-aff-gold-400/25 hover:text-aff-cream-50"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
                Clear filters
              </button>
            )}
          </div>
            
          </div>

          {/* Divider */}
          <span
            aria-hidden="true"
            className="h-px w-full bg-gradient-to-r from-transparent via-aff-gold-400/30 to-transparent"
          />

         <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
              <Input.Search
                size="large"
                allowClear
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by order number"
                className="w-full sm:w-[320px]"
                aria-label="Search orders by order number"
              />
             
            </div>
        </div>
      </div>
    </ConfigProvider>
  );
}