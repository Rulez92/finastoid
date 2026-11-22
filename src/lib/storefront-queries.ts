import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Product, ProductState } from "@/data/products";
import {
  pickCheapestActiveVariant,
  priceForCurrency,
  comparePriceForCurrency,
} from "@/lib/variant-pricing";
// import {
//   pickCheapestActiveVariant,
//   effectivePrice,
//   isOfferActive,
// } from "@/lib/variant-pricing";

async function fetchStorefrontProducts(): Promise<Product[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      `id, name, category,featured, currency_code, tagline, short_description, description, sections, features, origin,
       tasting_note, accent_color, created_at,
      product_variants ( id, name, sku, price, price_idr, sale_price, sale_price_idr, sale_starts_at, sale_ends_at, stock, weight, status ),
       product_images ( url, is_primary ),
       product_country_prices ( price, sale_price, active, countries ( currency_code ) )`,
    )
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .order("position", { referencedTable: "product_images", ascending: true });

  if (error) console.error("[storefront] query failed:", error.message);
  if (!data) return [];

 ;
 

  return data.flatMap((p: any): Product[] => {
    const now = Date.now();
    const variants = (p.product_variants ?? []).filter(
      (v: any) => v.status === "active",
    );
   const cheapest = pickCheapestActiveVariant(p.product_variants ?? [], now);
   
// const onSale = !!cheapest && isOfferActive(cheapest, now);

// // USD: fixed admin price. IDR: fixed admin price. No conversion.
// const basePrice = cheapest ? effectivePrice(cheapest, now) : 0;
// const compareAt: number | undefined = onSale ? Number(cheapest!.price) : undefined;
// const idrPrice: number | undefined = !cheapest
//   ? undefined
//   : onSale && cheapest.sale_price_idr != null
//     ? Number(cheapest.sale_price_idr)
//     : cheapest.price_idr != null
//       ? Number(cheapest.price_idr)
//       : undefined;
// const idrCompare: number | undefined =
//   onSale && cheapest!.price_idr != null ? Number(cheapest!.price_idr) : undefined;
// USD and IDR are both FIXED admin prices. No conversion. The same helpers
// are used by checkout, so the price shown is the price charged.
const basePrice = cheapest ? (priceForCurrency(cheapest, "USD", now) ?? 0) : 0;
const compareAt: number | undefined = cheapest
  ? (comparePriceForCurrency(cheapest, "USD", now) ?? undefined)
  : undefined;
const idrPrice: number | undefined = cheapest
  ? (priceForCurrency(cheapest, "IDR", now) ?? undefined)
  : undefined;
const idrCompare: number | undefined = cheapest
  ? (comparePriceForCurrency(cheapest, "IDR", now) ?? undefined)
  : undefined;
const hasSale = compareAt !== undefined;
const totalStock = variants.reduce((s: number, v: any) => s + v.stock, 0);
const isNew = Date.now() - new Date(p.created_at).getTime() < 30 * 86400000;

let state: ProductState = "available";
if (totalStock === 0) state = "out-of-stock";
else if (hasSale) state = "offer";
else if (totalStock <= 5) state = "low-stock";
else if (isNew) state = "new";

const prices: Record<string, number> = { USD: basePrice };
if (idrPrice !== undefined) prices.IDR = idrPrice;

const comparePrices: Record<string, number> = {};
if (hasSale) {
  comparePrices.USD = compareAt!;
  if (idrCompare !== undefined) comparePrices.IDR = idrCompare;
}
    const imgs: { url: string; is_primary: boolean }[] = p.product_images ?? [];
    const img = imgs.find((i) => i.is_primary) ?? imgs[0];
    // Primary first, then the rest in the order the database returned them.
    const gallery = [
      ...(img ? [img] : []),
      ...imgs.filter((i) => i !== img),
    ].map((i) => i.url);
    const weight = variants.find((v: any) => v.weight != null)?.weight;

    return [{
      id: p.id,
      featured: p.featured,
      slug: p.id,
      name: p.name,
      category: p.category ?? "Uncategorized",
      tagline: p.tagline ?? [],
      shortDescription: p.short_description ?? "",
      description: p.description ?? "",
      sections: Array.isArray(p.sections) ? p.sections : [],
      price: basePrice,
      currency: "USD",
      prices,
      compareAtPrice: compareAt,
      comparePrices: compareAt !== undefined ? comparePrices : undefined,
            offerEndsAt: hasSale ? (cheapest?.sale_ends_at ?? undefined) : undefined,
      image: img?.url ?? "/product/placeholder.png",
      images: gallery.length > 0 ? gallery : ["/product/placeholder.png"],
      state,
      accentColor: p.accent_color,
      features: p.features ?? [],
      weight: weight != null ? `${weight}g` : undefined,
      origin: p.origin ?? "",
      tastingNote: p.tasting_note ?? undefined,
    }];
  });
}

// One query per request: the layout and the page share this result.
export const getStorefrontProducts = cache(fetchStorefrontProducts);
