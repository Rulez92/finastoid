// The one place a referral discount is calculated. Pure function: no
// database, no exchange rates, no cookies. Checkout passes in the product
// subtotal (admin's FIXED price in the customer's own currency) and the
// affiliate's percent, and gets back every number it needs to save on the
// order.
//
// Rounding follows the currency: IDR has 0 decimals (Rp 85,000), USD has 2
// ($5.00). Money is rounded once, on the discount, and the total is
// subtotal minus that rounded discount, so subtotal - discount = total
// always holds exactly.

import { roundMoney } from "@/lib/currency";

// Must match the CHECK constraint in referral-discount.sql (30).
export const MAX_DISCOUNT_PERCENT = 30;

export type DiscountResult = {
  subtotal: number; // before discount, in the order currency
  discountPercent: number; // the percent actually applied (clamped)
  discountAmount: number; // money taken off, in the order currency
  total: number; // what the customer pays
};

export function applyDiscount(
  subtotal: number,
  percent: number,
  currency: string,
): DiscountResult {
  const safeSubtotal = roundMoney(
    Number.isFinite(subtotal) && subtotal > 0 ? subtotal : 0,
    currency,
  );

  // Never trust the input: NaN, negative or too large all become safe values.
  const safePercent =
    Number.isFinite(percent) && percent > 0
      ? Math.min(percent, MAX_DISCOUNT_PERCENT)
      : 0;

  const rawDiscount = roundMoney((safeSubtotal * safePercent) / 100, currency);
  const discountAmount = Math.min(rawDiscount, safeSubtotal);

  return {
    subtotal: safeSubtotal,
    discountPercent: safePercent,
    discountAmount,
    total: roundMoney(safeSubtotal - discountAmount, currency),
  };
}