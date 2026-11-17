"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert, Input, InputNumber, message } from "antd";
import { Loader2, PackageSearch, Search } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { submitBulkOrder } from "@/lib/stockist/bulk-orders-actions";
import type { StockistCatalog } from "@/lib/stockist/products-queries";

// The bulk order request form. The stockist types a quantity next to each
// pack they want (0 or empty = not on the order), sees the total update, and
// submits. Nothing here decides the price: the totals are for information
// and the database calculates the real ones when the request is submitted.
//
// Cents are used for the maths (price * 100) so adding many lines never
// drifts by a fraction of a cent.

const MAX_PACKS = 50; // different packs on one order (the database limit)
const MAX_QTY = 100000;

const TOP_LINE =
  "pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-aff-gold-600 via-aff-gold-300 to-aff-gold-600 opacity-70";

export function NewOrderForm({ catalog }: { catalog: StockistCatalog }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  function setQuantity(variantId: string, value: number | null) {
    setQuantities((prev) => {
      const next = { ...prev };
      if (!value || value < 1) delete next[variantId];
      else next[variantId] = Math.floor(value);
      return next;
    });
  }

  // Search only hides products on screen; quantities already typed stay.
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return catalog.products;
    return catalog.products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q),
    );
  }, [catalog.products, search]);

  // Everything with a quantity, in one pass over the full catalog (not just
  // what the search is showing).
  const { lines, totalCents, units } = useMemo(() => {
    const out: { variantId: string; quantity: number }[] = [];
    let cents = 0;
    let unitCount = 0;
    for (const product of catalog.products) {
      for (const pack of product.packs) {
        const qty = quantities[pack.id];
        if (!qty) continue;
        out.push({ variantId: pack.id, quantity: qty });
        cents += Math.round(pack.yourPriceUsd * 100) * qty;
        unitCount += qty;
      }
    }
    return { lines: out, totalCents: cents, units: unitCount };
  }, [catalog.products, quantities]);

  const tooMany = lines.length > MAX_PACKS;
  const canSubmit = lines.length > 0 && !tooMany && !isPending;

  function handleSubmit() {
    if (!canSubmit) return;
    setError(null);

    startTransition(async () => {
      const result = await submitBulkOrder({
        items: lines,
        note: note.trim() || null,
      });

      if (result.success) {
        message.success("Request sent");
        router.push(`/stockist/bulk-orders/${result.orderId}`);
        return;
      }
      setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      {/* Search + count */}
      <div className="relative isolate flex flex-col gap-3 overflow-hidden rounded-2xl border border-aff-border bg-gradient-to-b from-aff-ivory to-white p-4 pt-5 shadow-[0_10px_30px_-22px_rgba(172,131,78,0.45)] sm:flex-row sm:items-center sm:justify-between sm:p-5 sm:pt-5">
        <span aria-hidden className={TOP_LINE} />
        <Input
          size="large"
          allowClear
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products"
          aria-label="Search products"
          disabled={isPending}
          prefix={
            <Search
              className="h-4 w-4 text-aff-muted"
              strokeWidth={1.6}
              aria-hidden="true"
            />
          }
          className="w-full sm:max-w-sm"
        />
        <p
          aria-live="polite"
          className="font-sans text-[13px] text-aff-muted"
        >
          <span className="font-semibold text-aff-green-900">
            {visible.length}
          </span>{" "}
          {visible.length === 1 ? "product" : "products"}
        </p>
      </div>

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
        </div>
      ) : (
        <ul className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 sm:gap-5">
          {visible.map((product) => (
            <li
              key={product.id}
              className="relative isolate overflow-hidden rounded-2xl border border-aff-border bg-white shadow-[0_6px_16px_-12px_rgba(3,24,7,0.3)]"
            >
              <span aria-hidden className={TOP_LINE} />

              <div className="flex items-center gap-3 bg-gradient-to-b from-aff-ivory to-white px-4 pb-3 pt-5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={product.image}
                  alt=""
                  loading="lazy"
                  className="h-12 w-12 shrink-0 rounded-xl border border-aff-border object-cover"
                />
                <div className="min-w-0">
                  <h2 className="truncate font-display text-[18px] font-semibold leading-tight text-aff-green-900">
                    {product.name}
                  </h2>
                  <span className="mt-1 inline-block max-w-full truncate rounded-full border border-aff-gold-600/40 bg-aff-gold-400/25 px-2.5 py-0.5 font-sans text-[11px] font-medium text-[#7A5526]">
                    {product.category}
                  </span>
                </div>
              </div>

              <ul className="divide-y divide-aff-border border-t border-aff-border">
                {product.packs.map((pack) => {
                  const qty = quantities[pack.id] ?? 0;
                  return (
                    <li
                      key={pack.id}
                      className={`flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 transition-colors ${
                        qty ? "bg-aff-gold-400/10" : ""
                      }`}
                    >
                      <div className="min-w-0 flex-1 basis-32">
                        <p className="font-sans text-[14px] font-medium text-aff-green-900">
                          {pack.name}
                        </p>
                        <p className="font-sans text-[12px] text-aff-muted">
                          {formatPrice(pack.yourPriceUsd, "USD")} each
                          {!pack.inStock && (
                            <span className="font-medium text-[#A3342B]">
                              {" · "}Out of stock
                            </span>
                          )}
                        </p>
                      </div>

                      <InputNumber
                        min={0}
                        max={MAX_QTY}
                        precision={0}
                        step={1}
                        value={qty || null}
                        placeholder="0"
                        disabled={!pack.inStock || isPending}
                        onChange={(v) => setQuantity(pack.id, v)}
                        aria-label={`Quantity of ${product.name}, ${pack.name}`}
                        style={{ width: 100 }}
                      />

                      <p className="min-w-[64px] basis-16 text-right font-display text-[15px] font-semibold tabular-nums text-aff-green-900">
                        {qty
                          ? formatPrice(
                              (Math.round(pack.yourPriceUsd * 100) * qty) / 100,
                              "USD",
                            )
                          : ""}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      )}

      {/* Summary: stays on screen while the stockist scrolls the list */}
            {/* Note + alerts: normal card, scrolls with the page */}
      <div className="relative isolate overflow-hidden rounded-2xl border border-aff-border bg-gradient-to-b from-aff-ivory to-white p-4 pt-5 shadow-[0_10px_30px_-22px_rgba(172,131,78,0.45)] sm:p-5">
        <span aria-hidden className={TOP_LINE} />

        {error && (
          <Alert
            type="error"
            showIcon
            closable
            message={error}
            onClose={() => setError(null)}
            className="mb-3"
          />
        )}
        {tooMany && (
          <Alert
            type="warning"
            showIcon
            message={`An order can have at most ${MAX_PACKS} different packs. Remove some to continue.`}
            className="mb-3"
          />
        )}

        <label
          htmlFor="bulk-note"
          className="mb-1.5 block font-sans text-[13px] font-medium text-aff-green-900"
        >
          Note for Finasto
          <span className="ml-1 font-normal text-aff-muted">(optional)</span>
        </label>
        <Input.TextArea
          id="bulk-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
          showCount
          rows={3}
          placeholder="Anything we should know about this order?"
          disabled={isPending}
        />

        <p className="mt-3 font-sans text-[12px] leading-relaxed text-aff-muted">
          Prices include your {catalog.discountPercent}% discount. The total is
          saved when you send the request, so later price changes won&apos;t
          affect it.
        </p>
      </div>

      {/* Slim action bar: only the total and the button stay on screen */}
      <div className="sticky bottom-3 z-10 rounded-2xl bg-gradient-to-br from-aff-gold-600 via-aff-gold-300 to-aff-gold-500 p-[1.5px] shadow-[0_14px_34px_-16px_rgba(3,24,7,0.55)] sm:bottom-4">
        <div className="relative isolate flex items-center justify-between gap-3 overflow-hidden rounded-[15px] bg-gradient-to-br from-aff-green-950 via-aff-green-900 to-aff-green-800 px-4 py-3">
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-aff-gold-300 to-transparent"
          />

          <div className="min-w-0">
            <p className="truncate font-sans text-[12px] text-aff-cream-50/70">
              {lines.length === 0
                ? "No packs added yet"
                : `${units} ${units === 1 ? "pack" : "packs"} · ${lines.length} ${
                    lines.length === 1 ? "item" : "items"
                  }`}
            </p>
            <p className="truncate font-display text-[20px] font-semibold leading-tight tabular-nums text-aff-gold-300 sm:text-[22px]">
              {formatPrice(totalCents / 100, "USD")}
            </p>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            aria-busy={isPending}
            className="inline-flex h-11 shrink-0 cursor-pointer touch-manipulation items-center justify-center gap-2 rounded-full bg-gradient-to-r from-aff-gold-600 via-aff-gold-300 to-aff-gold-500 px-5 font-sans text-[14px] font-semibold text-aff-green-950 shadow-[0_10px_26px_-12px_rgba(241,204,156,0.7)] transition-all duration-200 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none sm:px-6 [@media(hover:hover)]:hover:enabled:-translate-y-0.5"
          >
            {isPending && (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            )}
            Send request
          </button>
        </div>
      </div>
      
    </div>
  );
}