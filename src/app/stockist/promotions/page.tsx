// // Stockist Promotions page. A server component: it loads the promotions on the
// // server (stockist role re-checked inside the query) and hands them to the
// // client list.

// import { listStockistPromotions } from "@/lib/stockist/promotion-queries";
// import { PromotionList } from "@/components/stockist/promotions/promotion-list";

// export const metadata = { title: "Promotions — Finasto Stockist" };

// export default async function StockistPromotionsPage() {
//   const items = await listStockistPromotions();

//   return (
//     <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
//       <div className="min-w-0 leading-tight">
//         <h1 className="font-display text-[24px] font-semibold text-aff-green-900 sm:text-[28px]">
//           Promotions
//         </h1>
//         <p className="mt-1 font-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-aff-gold-600">
//           Offers and rewards from Finasto™
//         </p>
//       </div>

//       <PromotionList items={items} />
//     </div>
//   );
// }
// Stockist Promotions page. A server component: it loads the promotions on the
// server (stockist role re-checked inside the query) and hands them to the
// client list.

import { Gift } from "lucide-react";
import { listStockistPromotions } from "@/lib/stockist/promotion-queries";
import { PromotionList } from "@/components/stockist/promotions/promotion-list";

export const metadata = { title: "Promotions — Finasto Stockist" };

export default async function StockistPromotionsPage() {
  const items = await listStockistPromotions();

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <header className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-aff-green-950 via-aff-green-900 to-aff-green-800 px-5 py-6 sm:px-8 sm:py-8">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-aff-gold-300 to-transparent"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-12 -top-12 -z-10 h-48 w-48 rounded-full bg-aff-gold-400/20 blur-3xl"
        />
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-aff-gold-300 via-aff-gold-400 to-aff-gold-600 text-aff-green-950 shadow-md sm:h-14 sm:w-14">
            <Gift className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={1.8} aria-hidden="true" />
          </span>
          <div className="min-w-0 leading-tight">
            <h1 className="font-display text-[26px] font-semibold text-aff-cream-50 sm:text-[32px]">
              Promotions
            </h1>
            <p className="mt-1.5 font-sans text-[14px] text-aff-cream-50/70">
              Offers and rewards from Finasto™. Hit your target before the
              timer ends.
            </p>
          </div>
        </div>
      </header>

      <PromotionList items={items} />
    </div>
  );
}