import type { Metadata } from "next";
import { Suspense } from "react";
import { ShopHero } from "@/components/shop/shop-hero";
import { ShopPageClient } from "@/components/shop/shop-page-client";
import { SiteHeader } from "@/components/layout/site-header";
// import { ShopIntro } from "@/components/shop/shop-intro";
import { SiteFooter } from "@/components/home/site-footer";
import { AnnouncementBar } from "@/components/layout/announcement-bar";
import { getStorefrontProducts } from "@/lib/storefront-queries";
import { OffersCarousel } from "@/components/shop/offers-carousel";

export const metadata: Metadata = {
  title: "Shop — Finasto Botanical Tea",
  description:
    "Browse Finasto's premium Bali botanical wellness teas — Velora and Blue Moon, with more to come.",
};

export default async function ShopPage() {
  const products = await getStorefrontProducts();
  return (
     <main className="relative isolate flex-1 bg-gradient-to-b from-[#f7f1e6] via-[#f3eedf] to-[#eef3ea] dark:bg-none dark:bg-cream">
      {/* Decorative background: static, no motion, ignores clicks */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden dark:hidden"
      >
        <div className="absolute -right-32 top-24 h-[480px] w-[480px] rounded-full bg-copper/15 blur-[110px]" />
        <div className="absolute -left-40 top-[55%] h-[520px] w-[520px] rounded-full bg-green/10 blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.035] [background-image:radial-gradient(#234d2a_1px,transparent_1px)] [background-size:22px_22px]" />
      </div>
      <AnnouncementBar />
      <SiteHeader />
      <ShopHero />
      {/* <ShopIntro /> */}
<OffersCarousel products={products.filter((p) => p.state === "offer")} />
      <Suspense fallback={null}>
        <ShopPageClient products={products} />
      </Suspense>
      <SiteFooter />
    </main>
  );
}
