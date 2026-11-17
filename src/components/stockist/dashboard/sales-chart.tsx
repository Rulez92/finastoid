// "use client";

// // Sales in USD (area) or orders (bars) for a period the stockist picks:
// // last 7 / 30 / 90 days, last month, or last 12 months (one point per
// // month). Same look and behaviour as the affiliate OrdersChart: theme
// // colors, recharts drawn in the browser, the period kept in the URL
// // (?range=30d) so the server page loads the new numbers.
// //
// // Stockist amounts are USD only, so there is no currency conversion here.
// // Nothing is calculated except formatting and the totals for the screen
// // reader label.
// //
// // Needs: npm install recharts

// import { useState, useTransition } from "react";
// import { useRouter } from "next/navigation";
// import {
//   Area,
//   AreaChart,
//   Bar,
//   BarChart,
//   CartesianGrid,
//   ResponsiveContainer,
//   Tooltip,
//   XAxis,
//   YAxis,
// } from "recharts";
// import { Empty, Segmented, Select, Skeleton } from "antd";
// import { cn, formatPrice } from "@/lib/utils";
// // Type-only import: erased at build, so no server code reaches the browser.
// import type { StockistDashboardDay } from "@/lib/stockist/dashboard-queries";
// import {
//   DASHBOARD_RANGES,
//   type DashboardRange,
// } from "@/lib/affiliate/dashboard-ranges";

// // "2026-10-08" is a UTC day, so format it as one (no local-time shift).
// const dayFmt = new Intl.DateTimeFormat("en-GB", {
//   day: "2-digit",
//   month: "short",
//   timeZone: "UTC",
// });
// const monthFmt = new Intl.DateTimeFormat("en-GB", {
//   month: "short",
//   year: "numeric",
//   timeZone: "UTC",
// });

// function formatBucket(day: string, bucket: "day" | "month"): string {
//   const d = new Date(`${day}T00:00:00Z`);
//   if (Number.isNaN(d.getTime())) return day;
//   return bucket === "month" ? monthFmt.format(d) : dayFmt.format(d);
// }

// // Theme colors (CSS variables from your theme).
// const SALES_COLOR = "var(--color-copper)";
// const ORDERS_COLOR = "var(--color-green)";
// const TEXT_COLOR = "var(--color-espresso)";
// const MUTED_COLOR = "var(--color-warm-gray)";
// const GRID_COLOR = "var(--color-border-strong)";

// export function SalesChart({
//   daily,
//   range,
//   bucket,
// }: {
//   daily: StockistDashboardDay[];
//   range: DashboardRange;
//   bucket: "day" | "month";
// }) {
//   const router = useRouter();
//   const [isPending, startTransition] = useTransition();
//   const [metric, setMetric] = useState<"sales" | "orders">("sales");

//   const tooltipProps = {
//     contentStyle: {
//       backgroundColor: "var(--color-white)",
//       border: "1px solid var(--color-border-strong)",
//       borderRadius: 12,
//       boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
//       fontSize: 12,
//     },
//     labelStyle: { color: "var(--color-warm-gray)", marginBottom: 4 },
//     itemStyle: { color: "var(--color-espresso)" },
//   };

//   const label =
//     DASHBOARD_RANGES.find((r) => r.value === range)?.label ?? "Chart";

//   const totalOrders = daily.reduce((sum, d) => sum + d.orders, 0);
//   const totalUnits = daily.reduce((sum, d) => sum + d.units, 0);
//   const totalSales = daily.reduce((sum, d) => sum + d.salesUsd, 0);
//   const isEmpty = totalOrders === 0 && totalSales === 0;

//   const onRangeChange = (value: DashboardRange) => {
//     startTransition(() => {
//       router.replace(`?range=${value}`, { scroll: false });
//     });
//   };

//   return (
//     <div
//       aria-busy={isPending}
//       className={cn(
//         "relative flex h-full flex-col overflow-hidden rounded-2xl border border-border-strong bg-white p-4 shadow-[0_1px_2px_rgba(50,30,24,0.06),0_6px_16px_rgba(50,30,24,0.05)] transition-opacity dark:border-border dark:shadow-none sm:p-5",
//         isPending && "opacity-60",
//       )}
//     >
//       <span
//         aria-hidden
//         className="absolute inset-x-0 top-0 h-[2px] bg-copper/70 dark:hidden"
//       />

//       <div className="flex flex-wrap items-start justify-between gap-3">
//         <div>
//           <p className="font-sans text-[11px] font-medium uppercase tracking-[0.14em] text-warm-gray">
//             {label}
//           </p>
//           <p className="mt-2 font-display text-[32px] leading-none tabular-nums text-espresso">
//             {metric === "sales" ? formatPrice(totalSales, "USD") : totalOrders}
//           </p>
//           <p className="mt-1.5 font-sans text-[12px] text-warm-gray">
//             {metric === "sales"
//               ? `${totalUnits} packs sold`
//               : `${formatPrice(totalSales, "USD")} sales`}
//             {" · "}
//             {bucket === "month" ? "Months are UTC" : "Days are UTC"}
//           </p>
//         </div>

//         <div className="flex flex-wrap items-center gap-2">
//           <Segmented<"sales" | "orders">
//             value={metric}
//             onChange={setMetric}
//             options={[
//               { label: "Sales", value: "sales" },
//               { label: "Orders", value: "orders" },
//             ]}
//           />
//           <Select<DashboardRange>
//             value={range}
//             onChange={onRangeChange}
//             options={DASHBOARD_RANGES.map((r) => ({
//               value: r.value,
//               label: r.label,
//             }))}
//             style={{ minWidth: 150 }}
//             aria-label="Chart period"
//           />
//         </div>
//       </div>

//       {isPending ? (
//         <div className="mt-4 flex-1">
//           <Skeleton active title={false} paragraph={{ rows: 4 }} />
//         </div>
//       ) : isEmpty ? (
//         <div className="flex flex-1 items-center justify-center">
//           <Empty
//             image={Empty.PRESENTED_IMAGE_SIMPLE}
//             description="No orders in this period. Orders from your affiliates will appear here."
//           />
//         </div>
//       ) : (
//         <div
//           className="mt-4 min-h-[220px] w-full flex-1"
//           role="img"
//           aria-label={`Chart, ${label.toLowerCase()}: ${totalOrders} orders and ${formatPrice(totalSales, "USD")} in sales.`}
//         >
//           <ResponsiveContainer width="100%" height="100%">
//             {metric === "sales" ? (
//               <AreaChart
//                 data={daily}
//                 margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
//               >
//                 <defs>
//                   <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
//                     <stop
//                       offset="0%"
//                       style={{ stopColor: SALES_COLOR, stopOpacity: 0.35 }}
//                     />
//                     <stop
//                       offset="100%"
//                       style={{ stopColor: SALES_COLOR, stopOpacity: 0 }}
//                     />
//                   </linearGradient>
//                 </defs>
//                 <CartesianGrid
//                   vertical={false}
//                   strokeDasharray="3 3"
//                   stroke={GRID_COLOR}
//                   strokeOpacity={0.6}
//                 />
//                 <XAxis
//                   dataKey="day"
//                   tickFormatter={(v) => formatBucket(String(v), bucket)}
//                   tick={{ fill: MUTED_COLOR, fontSize: 12 }}
//                   tickLine={false}
//                   axisLine={false}
//                   minTickGap={24}
//                 />
//                 <YAxis
//                   tickFormatter={(v) => `$${v}`}
//                   tick={{ fill: MUTED_COLOR, fontSize: 12 }}
//                   tickLine={false}
//                   axisLine={false}
//                   width={52}
//                 />
//                 <Tooltip
//                   {...tooltipProps}
//                   cursor={{ stroke: TEXT_COLOR, strokeOpacity: 0.2 }}
//                   labelFormatter={(l) => formatBucket(String(l), bucket)}
//                   formatter={(value) => [
//                     formatPrice(Number(value), "USD"),
//                     "Sales",
//                   ]}
//                 />
//                 <Area
//                   dataKey="salesUsd"
//                   name="Sales"
//                   type="monotone"
//                   stroke={SALES_COLOR}
//                   strokeWidth={2}
//                   fill="url(#salesFill)"
//                   dot={false}
//                   activeDot={{
//                     r: 5,
//                     fill: SALES_COLOR,
//                     stroke: "var(--color-white)",
//                     strokeWidth: 2,
//                   }}
//                 />
//               </AreaChart>
//             ) : (
//               <BarChart
//                 data={daily}
//                 margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
//               >
//                 <CartesianGrid
//                   vertical={false}
//                   strokeDasharray="3 3"
//                   stroke={GRID_COLOR}
//                   strokeOpacity={0.6}
//                 />
//                 <XAxis
//                   dataKey="day"
//                   tickFormatter={(v) => formatBucket(String(v), bucket)}
//                   tick={{ fill: MUTED_COLOR, fontSize: 12 }}
//                   tickLine={false}
//                   axisLine={false}
//                   minTickGap={24}
//                 />
//                 <YAxis
//                   allowDecimals={false}
//                   tick={{ fill: MUTED_COLOR, fontSize: 12 }}
//                   tickLine={false}
//                   axisLine={false}
//                   width={32}
//                 />
//                 <Tooltip
//                   {...tooltipProps}
//                   cursor={{ fill: TEXT_COLOR, fillOpacity: 0.06 }}
//                   labelFormatter={(l) => formatBucket(String(l), bucket)}
//                   formatter={(value) => [String(value), "Orders"]}
//                 />
//                 <Bar
//                   dataKey="orders"
//                   name="Orders"
//                   fill={ORDERS_COLOR}
//                   radius={[6, 6, 0, 0]}
//                   maxBarSize={bucket === "month" ? 32 : 20}
//                 />
//               </BarChart>
//             )}
//           </ResponsiveContainer>
//         </div>
//       )}
//     </div>
//   );
// }
"use client";

// Sales in USD (area) or orders (bars) for a period the stockist picks:
// last 7 / 30 / 90 days, last month, or last 12 months (one point per
// month). Same look and behaviour as the affiliate OrdersChart: theme
// colors, recharts drawn in the browser, the period kept in the URL
// (?range=30d) so the server page loads the new numbers.
//
// Stockist amounts are USD only, so there is no currency conversion here.
// Nothing is calculated except formatting and the totals for the screen
// reader label.
//
// Needs: npm install recharts

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Empty, Segmented, Select, Skeleton } from "antd";
import { motion, useReducedMotion } from "motion/react";
import { TrendingUp } from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";
// Type-only import: erased at build, so no server code reaches the browser.
import type { StockistDashboardDay } from "@/lib/stockist/dashboard-queries";
import {
  DASHBOARD_RANGES,
  type DashboardRange,
} from "@/lib/affiliate/dashboard-ranges";

// "2026-10-08" is a UTC day, so format it as one (no local-time shift).
const dayFmt = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  timeZone: "UTC",
});
const monthFmt = new Intl.DateTimeFormat("en-GB", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

function formatBucket(day: string, bucket: "day" | "month"): string {
  const d = new Date(`${day}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return day;
  return bucket === "month" ? monthFmt.format(d) : dayFmt.format(d);
}

// Theme colors (CSS variables from globals.css).
const SALES_COLOR = "var(--color-aff-gold-600)";
const ORDERS_COLOR = "var(--color-aff-green-900)";
const TEXT_COLOR = "var(--color-aff-green-900)";
const MUTED_COLOR = "var(--color-aff-muted)";
const GRID_COLOR = "var(--color-aff-border)";

// "$850", "$1.2k", "$12k": keeps the axis narrow on phones.
const axisUsd = (v: number) =>
  v >= 1000 ? `$${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k` : `$${v}`;

const EASE = [0.22, 1, 0.36, 1] as const;

export function SalesChart({
  daily,
  range,
  bucket,
}: {
  daily: StockistDashboardDay[];
  range: DashboardRange;
  bucket: "day" | "month";
}) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [isPending, startTransition] = useTransition();
  const [metric, setMetric] = useState<"sales" | "orders">("sales");

  const tooltipProps = {
    wrapperStyle: { outline: "none" },
    contentStyle: {
      backgroundColor: "var(--color-white)",
      border: "1px solid var(--color-aff-gold-500)",
      borderRadius: 12,
      boxShadow: "0 12px 28px -12px rgba(3,24,7,0.3)",
      fontSize: 13,
      padding: "8px 12px",
    },
    labelStyle: {
      color: "var(--color-aff-muted)",
      marginBottom: 4,
      fontWeight: 500,
    },
    itemStyle: { color: "var(--color-aff-green-900)", fontWeight: 600 },
  };

  const label =
    DASHBOARD_RANGES.find((r) => r.value === range)?.label ?? "Chart";

  const totalOrders = daily.reduce((sum, d) => sum + d.orders, 0);
  const totalUnits = daily.reduce((sum, d) => sum + d.units, 0);
  const totalSales = daily.reduce((sum, d) => sum + d.salesUsd, 0);
  const isEmpty = totalOrders === 0 && totalSales === 0;

  const headline =
    metric === "sales" ? formatPrice(totalSales, "USD") : String(totalOrders);
  // Shrink the number as it gets longer, and wrap instead of cutting it.
  const headlineSize =
    headline.length > 16
      ? "text-[20px]"
      : headline.length > 12
        ? "text-[26px]"
        : "text-[32px]";

  const onRangeChange = (value: DashboardRange) => {
    startTransition(() => {
      router.replace(`?range=${value}`, { scroll: false });
    });
  };

  return (
    <motion.div
      aria-busy={isPending}
      initial={reduce ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.7, ease: EASE }}
      className={cn(
        "relative isolate flex h-full min-h-[380px] flex-col overflow-hidden rounded-2xl border border-aff-border bg-gradient-to-b from-aff-ivory to-white p-4 pt-5 shadow-[0_6px_16px_-12px_rgba(3,24,7,0.3)] transition-opacity sm:p-5 sm:pt-6",
        isPending && "opacity-60",
      )}
    >
      {/* thin gold line on top, same as the other cards */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-aff-gold-600 via-aff-gold-300 to-aff-gold-600 opacity-70"
      />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-sans text-[13px] font-semibold text-aff-green-900">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-aff-green-900 text-aff-gold-300">
              <TrendingUp
                className="h-3.5 w-3.5"
                strokeWidth={2}
                aria-hidden="true"
              />
            </span>
            {label}
          </p>
          <motion.p
            key={metric}
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className={`mt-2 break-words font-display font-semibold leading-tight text-aff-green-900 [font-variant-numeric:tabular-nums] ${headlineSize}`}
          >
            {headline}
          </motion.p>
          <p className="mt-1.5 break-words font-sans text-[12px] text-aff-muted">
            {metric === "sales"
              ? `${totalUnits} packs sold`
              : `${formatPrice(totalSales, "USD")} sales`}
            {" · "}
            <span className="text-aff-muted/80">
              {bucket === "month" ? "Months are UTC" : "Days are UTC"}
            </span>
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <Segmented<"sales" | "orders">
            size="large"
            block
            className="touch-manipulation font-medium [&_.ant-segmented-item-selected]:!bg-aff-green-900 [&_.ant-segmented-item-selected]:!text-aff-gold-300 [&_.ant-segmented-thumb]:!bg-aff-green-900"
            value={metric}
            onChange={setMetric}
            options={[
              { label: "Sales", value: "sales" },
              { label: "Orders", value: "orders" },
            ]}
          />
          <Select<DashboardRange>
            size="large"
            value={range}
            onChange={onRangeChange}
            options={DASHBOARD_RANGES.map((r) => ({
              value: r.value,
              label: r.label,
            }))}
            className="w-full sm:w-[170px]"
            aria-label="Chart period"
          />
        </div>
      </div>

      {isPending ? (
        <div className="mt-4 flex-1">
          <Skeleton active title={false} paragraph={{ rows: 4 }} />
        </div>
      ) : isEmpty ? (
        <div className="mt-4 flex min-h-[220px] flex-1 items-center justify-center rounded-xl border border-dashed border-aff-gold-500/40 bg-aff-ivory">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No orders in this period. Orders from your affiliates will appear here."
          />
        </div>
      ) : (
        <div
          className="mt-4 min-h-[220px] w-full flex-1"
          role="img"
          aria-label={`Chart, ${label.toLowerCase()}: ${totalOrders} orders and ${formatPrice(totalSales, "USD")} in sales.`}
        >
          <ResponsiveContainer width="100%" height="100%">
            {metric === "sales" ? (
              <AreaChart
                data={daily}
                margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
              >
                <defs>
                  <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      style={{ stopColor: SALES_COLOR, stopOpacity: 0.45 }}
                    />
                    <stop
                      offset="100%"
                      style={{ stopColor: SALES_COLOR, stopOpacity: 0 }}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  vertical={false}
                  strokeDasharray="3 3"
                  stroke={GRID_COLOR}
                  strokeOpacity={0.6}
                />
                <XAxis
                  dataKey="day"
                  tickFormatter={(v) => formatBucket(String(v), bucket)}
                  tick={{ fill: MUTED_COLOR, fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={24}
                />
                <YAxis
                  tickFormatter={(v) => axisUsd(Number(v))}
                  tick={{ fill: MUTED_COLOR, fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  width={48}
                />
                <Tooltip
                  {...tooltipProps}
                  cursor={{ stroke: TEXT_COLOR, strokeOpacity: 0.2 }}
                  labelFormatter={(l) => formatBucket(String(l), bucket)}
                  formatter={(value) => [
                    formatPrice(Number(value), "USD"),
                    "Sales",
                  ]}
                />
                {/* soft glow: a wide, faint copy of the line (no blur filter) */}
                <Area
                  dataKey="salesUsd"
                  type="monotone"
                  stroke={SALES_COLOR}
                  strokeWidth={9}
                  strokeOpacity={0.14}
                  fill="none"
                  dot={false}
                  activeDot={false}
                  isAnimationActive={false}
                  tooltipType="none"
                />
                <Area
                  dataKey="salesUsd"
                  name="Sales"
                  type="monotone"
                  stroke={SALES_COLOR}
                  strokeWidth={2.5}
                  isAnimationActive={!reduce}
                  animationDuration={900}
                  fill="url(#salesFill)"
                  dot={false}
                  activeDot={{
                    r: 5,
                    fill: SALES_COLOR,
                    stroke: "var(--color-white)",
                    strokeWidth: 2,
                  }}
                />
              </AreaChart>
            ) : (
              <BarChart
                data={daily}
                margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
              >
                <defs>
                  <linearGradient id="ordersFill" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      style={{ stopColor: ORDERS_COLOR, stopOpacity: 1 }}
                    />
                    <stop
                      offset="100%"
                      style={{ stopColor: ORDERS_COLOR, stopOpacity: 0.5 }}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  vertical={false}
                  strokeDasharray="3 3"
                  stroke={GRID_COLOR}
                  strokeOpacity={0.6}
                />
                <XAxis
                  dataKey="day"
                  tickFormatter={(v) => formatBucket(String(v), bucket)}
                  tick={{ fill: MUTED_COLOR, fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={24}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: MUTED_COLOR, fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  width={32}
                />
                <Tooltip
                  {...tooltipProps}
                  cursor={{ fill: TEXT_COLOR, fillOpacity: 0.06 }}
                  labelFormatter={(l) => formatBucket(String(l), bucket)}
                  formatter={(value) => [String(value), "Orders"]}
                />
                <Bar
                  dataKey="orders"
                  name="Orders"
                  fill="url(#ordersFill)"
                  isAnimationActive={!reduce}
                  animationDuration={800}
                  radius={[6, 6, 0, 0]}
                  maxBarSize={bucket === "month" ? 32 : 20}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </motion.div>
  );
}