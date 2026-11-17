// "use client";

// import Link from "next/link";
// import { Table, type TableColumnsType } from "antd";
// import { Boxes } from "lucide-react";
// import type {
//   Inventory,
//   InventoryRow,
//   StockLevel,
// } from "@/lib/stockist/inventory-queries";

// // Read-only stock list for the stockist: a table on desktop, cards on
// // mobile, three totals on top. The desktop table is an antd Table (same
// // look as the other stockist and affiliate tables), so every number sits in
// // its own aligned column.

// const LEVELS: Record<StockLevel, { label: string; bg: string; color: string }> =
//   {
//     in_stock: {
//       label: "In stock",
//       bg: "var(--color-green-bg)",
//       color: "var(--color-green)",
//     },
//     low: {
//       label: "Low stock",
//       bg: "color-mix(in srgb, var(--color-copper) 14%, transparent)",
//       color: "var(--color-copper)",
//     },
//     out: {
//       label: "Out of stock",
//       bg: "var(--color-cream)",
//       color: "var(--color-warm-gray)",
//     },
//   };

// function LevelBadge({ level }: { level: StockLevel }) {
//   const l = LEVELS[level];
//   return (
//     <span
//       className="inline-flex items-center rounded-full px-2.5 py-0.5 font-sans text-[12px] font-medium"
//       style={{ background: l.bg, color: l.color }}
//     >
//       {l.label}
//     </span>
//   );
// }

// export function InventoryTable({ inventory }: { inventory: Inventory }) {
//   const { items, totals } = inventory;

//   const columns: TableColumnsType<InventoryRow> = [
//     {
//       title: "#",
//       dataIndex: "sr",
//       width: 60,
//       render: (_, __, index) => (
//         <span className="tabular-nums text-neutral-500">{index + 1}</span>
//       ),
//     },

//     {
//       title: "Product",
//       dataIndex: "productName",
//       render: (v: string) => (
//         <span className="font-sans text-[14px] text-espresso">{v}</span>
//       ),
//     },
//     {
//       title: "Pack",
//       dataIndex: "packName",
//       render: (v: string) => (
//         <span className="font-sans text-[14px] text-espresso/80">{v}</span>
//       ),
//     },
//     {
//       title: "Bought",
//       dataIndex: "bought",
//       align: "right",
//       width: 110,
//       render: (v: number) => (
//         <span className="font-sans text-[14px] tabular-nums text-espresso">
//           {v}
//         </span>
//       ),
//     },
//     {
//       title: "Sold",
//       dataIndex: "sold",
//       align: "right",
//       width: 110,
//       render: (v: number) => (
//         <span className="font-sans text-[14px] tabular-nums text-espresso">
//           {v}
//         </span>
//       ),
//     },
//     {
//       title: "Remaining",
//       dataIndex: "remaining",
//       align: "right",
//       width: 120,
//       render: (v: number) => (
//         <span className="font-sans text-[14px] font-medium tabular-nums text-espresso">
//           {v}
//         </span>
//       ),
//     },
//     {
//       title: "Status",
//       dataIndex: "level",
//       width: 140,
//       render: (level: StockLevel) => <LevelBadge level={level} />,
//     },
//   ];

//   if (items.length === 0) {
//     return (
//       <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border-strong bg-white py-16 text-center">
//         <Boxes
//           className="h-6 w-6 text-warm-gray"
//           strokeWidth={1.4}
//           aria-hidden="true"
//         />
//         <p className="mt-3 font-sans text-[14px] text-espresso">No stock yet</p>
//         <p className="mt-1 max-w-xs font-sans text-[13px] text-warm-gray">
//           Packs appear here once Finasto approves a bulk order.
//         </p>
//         <Link
//           href="/stockist/bulk-orders/new"
//           className="mt-4 font-sans text-[13px] text-espresso underline hover:text-copper"
//         >
//           Request packs
//         </Link>
//       </div>
//     );
//   }

//   return (
//     <div>
//       {/* Totals */}
//       <dl className="mb-4 grid grid-cols-3 gap-3">
//         {[
//           { label: "Bought", value: totals.bought },
//           { label: "Sold", value: totals.sold },
//           { label: "Remaining", value: totals.remaining },
//         ].map((s) => (
//           <div
//             key={s.label}
//             className="rounded-2xl border border-border bg-white px-4 py-3"
//           >
//             <dt className="font-sans text-[12px] text-warm-gray">{s.label}</dt>
//             <dd className="mt-1 font-display text-[24px] leading-none tabular-nums text-espresso">
//               {s.value}
//             </dd>
//           </div>
//         ))}
//       </dl>

//       {/* Desktop table */}
//       <div className="hidden md:block">
//         <Table<InventoryRow>
//           columns={columns}
//           dataSource={items}
//           rowKey="variantId"
//           pagination={false}
//           className="finasto-admin-table"
//         />
//       </div>

//       {/* Mobile cards */}
//       <ul className="flex flex-col gap-3 md:hidden">
//         {items.map((i) => (
//           <li
//             key={i.variantId}
//             className="rounded-2xl border border-border bg-white p-4"
//           >
//             <div className="flex items-start justify-between gap-2">
//               <div className="min-w-0">
//                 <p className="truncate font-sans text-[15px] font-medium text-espresso">
//                   {i.productName}
//                 </p>
//                 <p className="font-sans text-[12px] text-warm-gray">
//                   {i.packName}
//                 </p>
//               </div>
//               <LevelBadge level={i.level} />
//             </div>
//             <dl className="mt-3 grid grid-cols-3 gap-2 font-sans text-[13px]">
//               <div>
//                 <dt className="text-warm-gray">Bought</dt>
//                 <dd className="tabular-nums text-espresso">{i.bought}</dd>
//               </div>
//               <div>
//                 <dt className="text-warm-gray">Sold</dt>
//                 <dd className="tabular-nums text-espresso">{i.sold}</dd>
//               </div>
//               <div>
//                 <dt className="text-warm-gray">Remaining</dt>
//                 <dd className="font-medium tabular-nums text-espresso">
//                   {i.remaining}
//                 </dd>
//               </div>
//             </dl>
//           </li>
//         ))}
//       </ul>
//     </div>
//   );
// }
"use client";

import Link from "next/link";
import { Table, type TableColumnsType } from "antd";
import { Boxes, PackageCheck, PackagePlus, Wallet } from "lucide-react";
import type {
  Inventory,
  InventoryRow,
  StockLevel,
} from "@/lib/stockist/inventory-queries";

// Read-only stock list for the stockist: a table on desktop, cards on
// mobile, three totals on top. The desktop table is an antd Table (same
// look as the other stockist and affiliate tables), so every number sits in
// its own aligned column.

// Full class names, so Tailwind can see them at build time.
const LEVELS: Record<StockLevel, { label: string; cls: string }> = {
  in_stock: {
    label: "In stock",
    cls: "border-[rgba(47,158,107,0.3)] bg-[rgba(47,158,107,0.1)] text-[#1F7A52]",
  },
  low: {
    label: "Low stock",
    cls: "border-aff-gold-600/40 bg-aff-gold-400/25 text-[#7A5526]",
  },
  out: {
    label: "Out of stock",
    cls: "border-[rgba(190,60,50,0.3)] bg-[rgba(190,60,50,0.08)] text-[#A3342B]",
  },
};

const TOP_LINE =
  "pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-aff-gold-600 via-aff-gold-300 to-aff-gold-600 opacity-70";

function LevelBadge({ level }: { level: StockLevel }) {
  const l = LEVELS[level] ?? LEVELS.out;
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 font-sans text-[12px] font-medium leading-5 ${l.cls}`}
    >
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
      {l.label}
    </span>
  );
}

// One look per total card. Full class names for Tailwind.
const TOTAL_TONES = {
  teal: {
    card: "border-[#D6E4EA] bg-[#F5F9FB]",
    line: "from-[#2E6F86] via-[#6FA8BD] to-[#2E6F86]",
    chip: "bg-[#1F4E5F] text-[#CFE8F1]",
  },
  gold: {
    card: "border-[#EBDDC3] bg-[#FBF6EC]",
    line: "from-[#AC834E] via-[#F1CC9C] to-[#AC834E]",
    chip: "bg-[#7A5526] text-[#F6E3C4]",
  },
  emerald: {
    card: "border-[#CFE6DA] bg-[#F4FAF7]",
    line: "from-[#2F9E6B] via-[#7CCBA1] to-[#2F9E6B]",
    chip: "bg-[#14573A] text-[#C6EFD7]",
  },
} as const;

export function InventoryTable({ inventory }: { inventory: Inventory }) {
  const { items, totals } = inventory;

  const columns: TableColumnsType<InventoryRow> = [
    {
      title: "#",
      dataIndex: "sr",
      width: 60,
      render: (_, __, index) => (
        <span className="tabular-nums text-aff-muted">{index + 1}</span>
      ),
    },
    {
      title: "Product",
      dataIndex: "productName",
      render: (v: string) => (
        <span className="font-sans text-[14px] font-medium text-aff-green-900">
          {v}
        </span>
      ),
    },
    {
      title: "Pack",
      dataIndex: "packName",
      render: (v: string) => (
        <span className="font-sans text-[14px] text-aff-muted">{v}</span>
      ),
    },
    {
      title: "Bought",
      dataIndex: "bought",
      align: "right",
      width: 110,
      render: (v: number) => (
        <span className="font-sans text-[14px] tabular-nums text-aff-green-900">
          {v}
        </span>
      ),
    },
    {
      title: "Sold",
      dataIndex: "sold",
      align: "right",
      width: 110,
      render: (v: number) => (
        <span className="font-sans text-[14px] tabular-nums text-aff-green-900">
          {v}
        </span>
      ),
    },
    {
      title: "Remaining",
      dataIndex: "remaining",
      align: "right",
      width: 120,
      render: (v: number) => (
        <span className="font-sans text-[14px] font-semibold tabular-nums text-aff-green-900">
          {v}
        </span>
      ),
    },
    {
      title: "Status",
      dataIndex: "level",
      width: 150,
      render: (level: StockLevel) => <LevelBadge level={level} />,
    },
  ];

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-aff-gold-500/50 bg-aff-ivory px-6 py-14 text-center sm:py-16">
        <span className="flex h-12 w-12 items-center justify-center rounded-full border border-aff-gold-400/50 bg-aff-green-900 text-aff-gold-300">
          <Boxes className="h-5 w-5" strokeWidth={1.7} aria-hidden="true" />
        </span>
        <p className="mt-4 font-display text-[20px] font-semibold text-aff-green-900">
          No stock yet
        </p>
        <p className="mt-1 max-w-xs font-sans text-[13px] leading-relaxed text-aff-muted">
          Packs appear here once Finasto approves a bulk order.
        </p>
        <Link
          href="/stockist/bulk-orders/new"
          className="mt-5 inline-flex h-11 touch-manipulation items-center justify-center gap-2 rounded-full bg-gradient-to-r from-aff-gold-600 via-aff-gold-300 to-aff-gold-500 px-6 font-sans text-[14px] font-semibold text-aff-green-950 shadow-[0_10px_26px_-14px_rgba(172,131,78,0.8)] transition-all duration-200 active:scale-[0.97] motion-reduce:transition-none [@media(hover:hover)]:hover:-translate-y-0.5"
        >
          <PackagePlus className="h-4 w-4" aria-hidden="true" />
          Request packs
        </Link>
      </div>
    );
  }

  const totalCards = [
    { label: "Bought", value: totals.bought, icon: PackagePlus, tone: "teal" },
    { label: "Sold", value: totals.sold, icon: Wallet, tone: "gold" },
    {
      label: "Remaining",
      value: totals.remaining,
      icon: PackageCheck,
      tone: "emerald",
    },
  ] as const;

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      {/* Totals */}
      <dl className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-3">
        {totalCards.map((s) => {
          const t = TOTAL_TONES[s.tone];
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className={`group relative isolate flex touch-manipulation items-center justify-between gap-2 overflow-hidden rounded-2xl border px-4 py-4 pt-5 shadow-[0_6px_16px_-12px_rgba(3,24,7,0.3)] transition-all duration-300 active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100 [@media(hover:hover)]:hover:-translate-y-1 [@media(hover:hover)]:hover:shadow-[0_20px_36px_-18px_rgba(172,131,78,0.55)] ${t.card}`}
            >
              <span
                aria-hidden
                className={`pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r ${t.line}`}
              />
              <div className="min-w-0">
                <dt className="font-sans text-[12px] font-medium text-aff-muted">
                  {s.label}
                </dt>
                <dd className="mt-1 break-words font-display text-[26px] font-semibold leading-none tabular-nums text-aff-green-900">
                  {s.value}
                </dd>
              </div>
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-active:scale-90 [@media(hover:hover)]:group-hover:-rotate-6 [@media(hover:hover)]:group-hover:scale-110 ${t.chip}`}
              >
                <Icon className="h-[18px] w-[18px]" strokeWidth={1.7} />
              </span>
            </div>
          );
        })}
      </dl>

      {/* Desktop table */}
      <div className="relative hidden overflow-hidden rounded-2xl border border-aff-border bg-white shadow-[0_10px_30px_-22px_rgba(172,131,78,0.45)] md:block">
        <span aria-hidden className={TOP_LINE} />
        <Table<InventoryRow>
          columns={columns}
          dataSource={items}
          rowKey="variantId"
          pagination={false}
          scroll={{ x: 720 }}
          className="aff-orders-table"
        />
      </div>

      {/* Mobile cards */}
      <ul className="flex flex-col gap-3 md:hidden">
        {items.map((i) => (
          <li
            key={i.variantId}
            className="relative isolate touch-manipulation overflow-hidden rounded-2xl border border-aff-border bg-gradient-to-b from-aff-ivory to-white p-4 pt-5 shadow-[0_10px_30px_-22px_rgba(172,131,78,0.45)] transition-transform duration-200 active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100"
          >
            <span aria-hidden className={TOP_LINE} />
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-sans text-[15px] font-semibold text-aff-green-900">
                  {i.productName}
                </p>
                <p className="truncate font-sans text-[12px] text-aff-muted">
                  {i.packName}
                </p>
              </div>
              <LevelBadge level={i.level} />
            </div>
            <dl className="mt-3 grid grid-cols-3 gap-2 rounded-xl border border-aff-border bg-white px-3 py-2.5 font-sans text-[13px]">
              <div>
                <dt className="text-[12px] text-aff-muted">Bought</dt>
                <dd className="font-medium tabular-nums text-aff-green-900">
                  {i.bought}
                </dd>
              </div>
              <div>
                <dt className="text-[12px] text-aff-muted">Sold</dt>
                <dd className="font-medium tabular-nums text-aff-green-900">
                  {i.sold}
                </dd>
              </div>
              <div>
                <dt className="text-[12px] text-aff-muted">Remaining</dt>
                <dd className="font-semibold tabular-nums text-aff-green-900">
                  {i.remaining}
                </dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>
    </div>
  );
}