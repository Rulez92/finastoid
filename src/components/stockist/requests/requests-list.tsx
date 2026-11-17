// "use client";

// import { Table, type TableColumnsType } from "antd";
// import { Inbox } from "lucide-react";
// import type {
//   MyRequest,
//   MyRequestStatus,
// } from "@/lib/stockist/stockist-requests-queries";

// // The stockist's own requests: an antd Table on desktop (same look as the
// // other stockist and admin tables), cards on mobile. Read-only. It shows what
// // the stockist typed plus the decision; a rejected request shows the admin's
// // note so the stockist knows why. It never shows who currently owns the
// // affiliate.

// const STATUS: Record<
//   MyRequestStatus,
//   { label: string; bg: string; color: string }
// > = {
//   pending: {
//     label: "Pending",
//     bg: "color-mix(in srgb, var(--color-copper) 14%, transparent)",
//     color: "var(--color-copper)",
//   },
//   approved: {
//     label: "Approved",
//     bg: "var(--color-green-bg)",
//     color: "var(--color-green)",
//   },
//   rejected: {
//     label: "Rejected",
//     bg: "color-mix(in srgb, var(--color-red, #b42318) 12%, transparent)",
//     color: "var(--color-red, #b42318)",
//   },
// };

// function StatusBadge({ status }: { status: MyRequestStatus }) {
//   const s = STATUS[status];
//   return (
//     <span
//       className="inline-flex items-center rounded-full px-2.5 py-0.5 font-sans text-[12px] font-medium"
//       style={{ background: s.bg, color: s.color }}
//     >
//       {s.label}
//     </span>
//   );
// }

// // Fixed locale and time zone so the server and browser render the same text.
// function formatDate(iso: string | null): string {
//   if (!iso) return "-";
//   return new Date(iso).toLocaleDateString("en-GB", {
//     day: "numeric",
//     month: "short",
//     year: "numeric",
//     timeZone: "UTC",
//   });
// }

// export function RequestsList({ requests }: { requests: MyRequest[] }) {
//   if (requests.length === 0) {
//     return (
//       <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border-strong bg-white py-16 text-center">
//         <Inbox
//           className="h-6 w-6 text-warm-gray"
//           strokeWidth={1.4}
//           aria-hidden="true"
//         />
//         <p className="mt-3 font-sans text-[14px] text-espresso">
//           No requests yet
//         </p>
//         <p className="mt-1 max-w-xs font-sans text-[13px] text-warm-gray">
//           Requests you send for an affiliate will appear here with their status.
//         </p>
//       </div>
//     );
//   }

//   const columns: TableColumnsType<MyRequest> = [
//     {
//       title: "#",
//       key: "sr",
//       width: 60,
//       render: (_, __, index) => (
//         <span className="tabular-nums text-neutral-500">{index + 1}</span>
//       ),
//     },
//     {
//       title: "Affiliate",
//       key: "affiliate",
//       width: 230,
//       render: (_, r) => (
//         <div className="min-w-0">
//           <p className="truncate font-sans text-[14px] text-espresso">
//             {r.affiliateName}
//           </p>
//           <p className="truncate font-sans text-[12px] text-warm-gray">
//             {r.affiliateEmail}
//           </p>
//         </div>
//       ),
//     },
//     {
//       title: "Description",
//       dataIndex: "description",
//       ellipsis: true,
//       render: (v: string) => (
//         <span className="font-sans text-[13px] text-espresso/80">{v}</span>
//       ),
//     },
//     {
//       title: "Status",
//       dataIndex: "status",
//       width: 120,
//       render: (s: MyRequestStatus) => <StatusBadge status={s} />,
//     },
//     {
//       title: "Sent",
//       dataIndex: "createdAt",
//       width: 120,
//       render: (v: string) => (
//         <span className="font-sans text-[13px] tabular-nums text-warm-gray">
//           {formatDate(v)}
//         </span>
//       ),
//     },
//     {
//       title: "Admin note",
//       dataIndex: "adminNote",
//       width: 220,
//       ellipsis: true,
//       render: (v: string | null) => (
//         <span className="font-sans text-[13px] text-espresso/80">
//           {v ?? "-"}
//         </span>
//       ),
//     },
//   ];

//   return (
//     <div>
//       {/* Desktop table */}
//       <div className="hidden md:block">
//         <Table<MyRequest>
//           columns={columns}
//           dataSource={requests}
//           rowKey="id"
//           pagination={
//             requests.length > 10
//               ? { pageSize: 10, hideOnSinglePage: true }
//               : false
//           }
//           scroll={{ x: 900 }}
//           className="finasto-admin-table"
//         />
//       </div>

//       {/* Mobile cards */}
//       <ul className="flex flex-col gap-3 md:hidden">
//         {requests.map((r) => (
//           <li
//             key={r.id}
//             className="rounded-2xl border border-border bg-white p-4"
//           >
//             <div className="flex items-start justify-between gap-2">
//               <div className="min-w-0">
//                 <p className="truncate font-sans text-[15px] font-medium text-espresso">
//                   {r.affiliateName}
//                 </p>
//                 <p className="truncate font-sans text-[12px] text-warm-gray">
//                   {r.affiliateEmail}
//                 </p>
//               </div>
//               <StatusBadge status={r.status} />
//             </div>

//             <p className="mt-3 break-words font-sans text-[13px] text-espresso/80">
//               {r.description}
//             </p>

//             {r.adminNote && (
//               <div className="mt-3 rounded-xl bg-cream px-3 py-2">
//                 <p className="font-sans text-[11px] uppercase tracking-wide text-warm-gray">
//                   Admin note
//                 </p>
//                 <p className="mt-0.5 break-words font-sans text-[13px] text-espresso">
//                   {r.adminNote}
//                 </p>
//               </div>
//             )}

//             <p className="mt-3 font-sans text-[12px] text-warm-gray">
//               Sent {formatDate(r.createdAt)}
//               {r.reviewedAt ? ` · Decided ${formatDate(r.reviewedAt)}` : ""}
//             </p>
//           </li>
//         ))}
//       </ul>
//     </div>
//   );
// }
"use client";

import { Table, type TableColumnsType } from "antd";
import { Inbox } from "lucide-react";
import type {
  MyRequest,
  MyRequestStatus,
} from "@/lib/stockist/stockist-requests-queries";

// The stockist's own requests: an antd Table on desktop (same look as the
// other stockist and admin tables), cards on mobile. Read-only. It shows what
// the stockist typed plus the decision; a rejected request shows the admin's
// note so the stockist knows why. It never shows who currently owns the
// affiliate.

// Full class names, so Tailwind can see them at build time.
const STATUS: Record<MyRequestStatus, { label: string; cls: string }> = {
  pending: {
    label: "Pending",
    cls: "border-aff-gold-600/40 bg-aff-gold-400/25 text-[#7A5526]",
  },
  approved: {
    label: "Approved",
    cls: "border-[rgba(47,158,107,0.3)] bg-[rgba(47,158,107,0.1)] text-[#1F7A52]",
  },
  rejected: {
    label: "Rejected",
    cls: "border-[rgba(190,60,50,0.3)] bg-[rgba(190,60,50,0.08)] text-[#A3342B]",
  },
};

const TOP_LINE =
  "pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-aff-gold-600 via-aff-gold-300 to-aff-gold-600 opacity-70";

function StatusBadge({ status }: { status: MyRequestStatus }) {
  const s = STATUS[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 font-sans text-[12px] font-medium leading-5 ${
        s?.cls ?? "border-aff-border bg-aff-ivory text-aff-muted"
      }`}
    >
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
      {s?.label ?? String(status)}
    </span>
  );
}

// Fixed locale and time zone so the server and browser render the same text.
function formatDate(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function RequestsList({ requests }: { requests: MyRequest[] }) {
  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-aff-gold-500/50 bg-aff-ivory px-6 py-14 text-center sm:py-16">
        <span className="flex h-12 w-12 items-center justify-center rounded-full border border-aff-gold-400/50 bg-aff-green-900 text-aff-gold-300">
          <Inbox className="h-5 w-5" strokeWidth={1.7} aria-hidden="true" />
        </span>
        <p className="mt-4 font-display text-[20px] font-semibold text-aff-green-900">
          No requests yet
        </p>
        <p className="mt-1 max-w-xs font-sans text-[13px] leading-relaxed text-aff-muted">
          Requests you send for an affiliate will appear here with their status.
        </p>
      </div>
    );
  }

  const columns: TableColumnsType<MyRequest> = [
    {
      title: "#",
      key: "sr",
      width: 60,
      render: (_, __, index) => (
        <span className="tabular-nums text-aff-muted">{index + 1}</span>
      ),
    },
    {
      title: "Affiliate",
      key: "affiliate",
      width: 230,
      render: (_, r) => (
        <div className="min-w-0">
          <p className="truncate font-sans text-[14px] font-medium text-aff-green-900">
            {r.affiliateName}
          </p>
          <p className="truncate font-sans text-[12px] text-aff-muted">
            {r.affiliateEmail}
          </p>
        </div>
      ),
    },
    {
      title: "Description",
      dataIndex: "description",
      ellipsis: true,
      render: (v: string) => (
        <span className="font-sans text-[13px] text-aff-muted">{v}</span>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      width: 130,
      render: (s: MyRequestStatus) => <StatusBadge status={s} />,
    },
    {
      title: "Sent",
      dataIndex: "createdAt",
      width: 120,
      render: (v: string) => (
        <span className="font-sans text-[13px] tabular-nums text-aff-muted">
          {formatDate(v)}
        </span>
      ),
    },
    {
      title: "Admin note",
      dataIndex: "adminNote",
      width: 220,
      ellipsis: true,
      render: (v: string | null) => (
        <span className="font-sans text-[13px] text-aff-muted">{v ?? "-"}</span>
      ),
    },
  ];

  return (
    <div>
      {/* Desktop table */}
      <div className="relative hidden overflow-hidden rounded-2xl border border-aff-border bg-white shadow-[0_10px_30px_-22px_rgba(172,131,78,0.45)] md:block">
        <span aria-hidden className={TOP_LINE} />
        <Table<MyRequest>
          columns={columns}
          dataSource={requests}
          rowKey="id"
          pagination={
            requests.length > 10
              ? { pageSize: 10, hideOnSinglePage: true }
              : false
          }
          scroll={{ x: 900 }}
          className="aff-orders-table"
        />
      </div>

      {/* Mobile cards */}
      <ul className="flex flex-col gap-3 md:hidden">
        {requests.map((r) => (
          <li
            key={r.id}
            className="relative isolate touch-manipulation overflow-hidden rounded-2xl border border-aff-border bg-gradient-to-b from-aff-ivory to-white p-4 pt-5 shadow-[0_10px_30px_-22px_rgba(172,131,78,0.45)] transition-transform duration-200 active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100"
          >
            <span aria-hidden className={TOP_LINE} />
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-sans text-[15px] font-semibold text-aff-green-900">
                  {r.affiliateName}
                </p>
                <p className="truncate font-sans text-[12px] text-aff-muted">
                  {r.affiliateEmail}
                </p>
              </div>
              <StatusBadge status={r.status} />
            </div>

            <p className="mt-3 break-words font-sans text-[13px] leading-relaxed text-aff-muted">
              {r.description}
            </p>

            {r.adminNote && (
              <div className="mt-3 rounded-xl border border-aff-gold-600/40 border-l-[3px] border-l-aff-gold-600 bg-aff-gold-400/20 px-3 py-2">
                <p className="font-sans text-[11px] font-semibold uppercase tracking-wide text-[#7A5526]">
                  Admin note
                </p>
                <p className="mt-0.5 break-words font-sans text-[13px] text-aff-green-900">
                  {r.adminNote}
                </p>
              </div>
            )}

            <p className="mt-3 font-sans text-[12px] text-aff-muted">
              Sent {formatDate(r.createdAt)}
              {r.reviewedAt ? ` · Decided ${formatDate(r.reviewedAt)}` : ""}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}