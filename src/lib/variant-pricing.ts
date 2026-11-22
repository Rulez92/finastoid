// Single source of truth for "which variant, and what price, does the
// customer actually see/pay". storefront-queries.ts (display) and
// checkout-actions.ts (charge) must both import from here so the two
// can never drift apart.

export type RawVariant = {
  id: string;
  name: string;
  sku: string;
  price: number;
  price_idr?: number | string | null;       // new
  sale_price: number | null;
  sale_price_idr?: number | string | null;  // new
  sale_starts_at: string | null;
  sale_ends_at: string | null;
  stock: number;
  status: string;
};

// An offer only counts inside its start/end window.
export function isOfferActive(
  v: RawVariant,
  now: number = Date.now(),
): boolean {
  return (
    v.sale_price != null &&
    !!v.sale_starts_at &&
    !!v.sale_ends_at &&
    Date.parse(v.sale_starts_at) <= now &&
    now < Date.parse(v.sale_ends_at)
  );
}

// Price the customer pays for this variant right now.
export function effectivePrice(
  v: RawVariant,
  now: number = Date.now(),
): number {
  return isOfferActive(v, now) ? Number(v.sale_price) : Number(v.price);
}

// The variant shown as "the" price for a product. Returns null when the
// product has no active variant (everything disabled).
export function pickCheapestActiveVariant<T extends RawVariant>(
  variants: T[],
  now: number = Date.now(),
): T | null {
  const active = variants.filter((v) => v.status === "active");
  if (active.length === 0) return null;
//   return active.reduce((a, b) =>
//     effectivePrice(b, now) < effectivePrice(a, now) ? b : a,
//   );
// }
  return active.reduce((a, b) =>
    effectivePrice(b, now) < effectivePrice(a, now) ? b : a,
  );
}

// ── Fixed price per currency ────────────────────────────────────────────
// The price the customer sees AND pays, in THEIR currency. USD and IDR are
// both fixed prices typed by the admin. There is no exchange rate in this
// file. A currency with no fixed price returns null, and the caller must
// not guess one.
//
// Same rule the storefront already used: the IDR sale price counts only
// while the offer window is active, otherwise the normal IDR price.
export function priceForCurrency(
  v: RawVariant,
  currency: string,
  now: number = Date.now(),
): number | null {
  const c = currency.toUpperCase();

  if (c === "USD") return effectivePrice(v, now);

  if (c === "IDR") {
    const raw =
      isOfferActive(v, now) && v.sale_price_idr != null
        ? v.sale_price_idr
        : v.price_idr;
    if (raw == null) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : null;
  }

  return null;
}

// The crossed-out "was" price, in the same currency. Null when there is
// no active offer or no fixed price for that currency.
export function comparePriceForCurrency(
  v: RawVariant,
  currency: string,
  now: number = Date.now(),
): number | null {
  if (!isOfferActive(v, now)) return null;
  const c = currency.toUpperCase();

  if (c === "USD") return Number(v.price);

  if (c === "IDR") {
    if (v.price_idr == null) return null;
    const n = Number(v.price_idr);
    return Number.isFinite(n) && n >= 0 ? n : null;
  }

  return null;
}