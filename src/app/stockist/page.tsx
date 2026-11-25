// app/stockist/(...)/page.tsx   (your stockist dashboard page)

import type { Metadata } from "next";
import Link from "next/link";
import { BadgePercent } from "lucide-react";
import { requireRole } from "@/lib/auth/server";
import { getMyStockistDashboard } from "@/lib/stockist/dashboard-queries";
import { getMyStockistProfile } from "@/lib/stockist/settings-queries";
import { parseRange } from "@/lib/affiliate/dashboard-ranges";
import { StatCards } from "@/components/stockist/dashboard/stat-cards";
import { SalesChart } from "@/components/stockist/dashboard/sales-chart";
import {
  RecentCommissionsCard,
  TopAffiliatesCard,
} from "@/components/stockist/dashboard/dashboard-lists";
import { Reveal } from "@/components/affiliate/dashboard/reveal";

// Server component. The period comes from the URL (?range=30d) and is
// cleaned by parseRange(), so an unknown value falls back to the default
// instead of reaching the database. getMyStockistDashboard() checks the
// stockist role itself and returns only the signed-in stockist's own data.

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function StockistDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { name } = await requireRole("stockist");
  const { range } = await searchParams;

  // Independent reads run together instead of one after another.
  const [data, profile] = await Promise.all([
    getMyStockistDashboard(parseRange(range)),
    getMyStockistProfile(),
  ]);

  // Same source the Settings form uses, with the auth name as a fallback.
  const displayName = profile?.name || name;

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <Reveal>
        <header className="rounded-2xl bg-gradient-to-br from-aff-gold-600 via-aff-gold-300 to-aff-gold-500 p-[1.5px] shadow-[0_18px_44px_-20px_rgba(172,131,78,0.55)]">
          <div className="relative isolate overflow-hidden rounded-[15px] bg-gradient-to-br from-aff-green-950 via-aff-green-900 to-aff-green-800">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -left-16 -top-16 -z-10 h-48 w-48 rounded-full bg-aff-gold-400/15 blur-3xl"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-[6px] rounded-[11px] border border-aff-gold-400/15"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-aff-gold-300 to-transparent"
            />

            <div className="relative z-10 flex flex-col justify-center gap-4 px-5 py-5 sm:min-h-[140px] sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-6">
              <div className="min-w-0">
                <h1 className="break-words font-display text-[24px] font-semibold leading-tight text-aff-cream-50 sm:text-[32px]">
                  Welcome back
                  {displayName ? (
                    <>
                      ,{" "}
                      <span className="bg-gradient-to-r from-aff-gold-600 via-aff-gold-300 to-aff-gold-500 bg-clip-text text-transparent">
                        {displayName}
                      </span>
                    </>
                  ) : null}
                </h1>
                <p className="mt-1.5 max-w-xl font-sans text-[13px] leading-relaxed text-aff-cream-50/75 sm:text-[14px]">
                  Here is an overview of your commission earnings, affiliate
                  sales and payouts for the selected period.
                </p>

                {profile && (
                  <p className="mt-3 inline-flex max-w-full items-center gap-2 rounded-full border border-aff-gold-400/40 bg-aff-green-950/60 px-3.5 py-1.5 font-sans text-[12px] font-medium text-aff-gold-300">
                    <BadgePercent
                      className="h-3.5 w-3.5 shrink-0"
                      strokeWidth={1.8}
                      aria-hidden="true"
                    />
                    <span className="truncate">{profile.tierName}</span>
                    <span
                      aria-hidden="true"
                      className="h-3 w-px shrink-0 bg-aff-gold-400/40"
                    />
                    <span className="shrink-0 tabular-nums">
                      {profile.commissionPercent}% commission
                    </span>
                  </p>
                )}
              </div>

              <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <Link
                  href="/stockist/payouts"
                  className="inline-flex h-11 touch-manipulation items-center justify-center rounded-full bg-gradient-to-r from-aff-gold-600 via-aff-gold-300 to-aff-gold-500 px-6 font-sans text-[14px] font-semibold text-aff-green-950 shadow-[0_10px_26px_-12px_rgba(241,204,156,0.7)] transition-all duration-200 active:scale-[0.97] motion-reduce:transition-none [@media(hover:hover)]:hover:-translate-y-0.5"
                >
                  Payout request
                </Link>
                <Link
                  href="/stockist/affiliate-requests"
                  className="inline-flex h-11 touch-manipulation items-center justify-center rounded-full border border-aff-gold-400/40 bg-aff-green-950/60 px-6 font-sans text-[14px] font-medium text-aff-gold-300 transition-colors active:scale-[0.97] [@media(hover:hover)]:hover:border-aff-gold-300 [@media(hover:hover)]:hover:bg-aff-green-950"
                >
                  Affiliate requests
                </Link>
              </div>
            </div>
          </div>
        </header>
      </Reveal>

      <StatCards data={data} />

      <SalesChart daily={data.daily} range={data.range} bucket={data.bucket} />

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <TopAffiliatesCard affiliates={data.topAffiliates} />
        <RecentCommissionsCard items={data.recent} />
      </div>
    </div>
  );
}