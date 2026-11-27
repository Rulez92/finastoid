// Pure helpers for the stockist Promotions UI. No server imports, so client
// components can use this file freely. (The server query file may only be
// imported by client files with `import type`.)

import type { StockistPromotionItem } from "@/lib/stockist/promotion-queries";

export type Phase = "scheduled" | "live" | "ended" | "rewarded";

// Only published / rewarded are stored. Scheduled / Live / Ended come from the
// dates, so they are worked out in the browser after mount.
export function getPhase(item: StockistPromotionItem, now: number): Phase {
  if (item.status === "rewarded") return "rewarded";
  if (Date.parse(item.startsAt) > now) return "scheduled";
  if (item.endsAt && Date.parse(item.endsAt) <= now) return "ended";
  return "live";
}

export function splitCountdown(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

export function pad(n: number) {
  return String(n).padStart(2, "0");
}

export const OFFER_LABEL: Record<StockistPromotionItem["offerType"], string> = {
  free_tour: "Free tour",
  cash_prize: "Cash prize",
  bonus: "Bonus",
  discount: "Discount",
  other: "Special offer",
};

// Target is shown as plain text (no progress tracking in this version).
export function formatTarget(item: StockistPromotionItem): string | null {
  if (item.targetValue === null) return null;
  const n = item.targetValue.toLocaleString("en-US");
  return item.targetUnit === "amount" ? `Sales of $${n}` : `${n} units`;
}