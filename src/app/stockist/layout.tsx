import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { signOutAction } from "@/lib/auth/actions";
import { StockistShell } from "@/components/stockist/layout/stockist-shell";
import { getMyUnreadPartnerAnnouncementCount } from "@/lib/partner/announcement-queries";

export const metadata: Metadata = {
  title: "Stockist — Finasto",
  robots: { index: false, follow: false },
};

export default async function StockistLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Authoritative server-side gate for everything under /affiliate.
  const { user, name } = await requireRole("stockist");

  // Having the affiliate role is not enough: the admin can pause or
  // soft-delete an affiliate, and their login still exists. Check the
  // affiliates row on every request (RLS lets an affiliate read only
  // their own row).
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_stockist_profile");
  if (error) console.error("[stockist layout]", error.message);
  const stockist = (
    data as
      | {
                   id: string;
          status: string;
          name: string;
          phone: string | null;
          country: string | null;
          avatar_path: string | null;
          tier_name: string;
          commission_percent: number | string | null;
        }[]
      | null
  )?.[0];

  if (!stockist || stockist.status !== "active") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream p-6">
        <div className="w-full max-w-md rounded-2xl border border-border bg-white p-8 text-center">
          <h1 className="font-display text-[24px] leading-tight text-espresso">
            Account unavailable
          </h1>
          <p className="mt-3 font-sans text-[14px] leading-relaxed text-warm-gray">
            Your stockist account is currently inactive or has been removed.
            Please contact the Finasto team if you think this is a mistake.
          </p>
          <form action={signOutAction} className="mt-6">
            <button
              type="submit"
              className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full bg-espresso px-6 font-sans text-[14px] font-medium text-cream transition-colors hover:bg-espresso-deep"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    );
  }

  // The photo bucket is private: make a 1-hour signed link. A failure just
  // means "show initials", it never breaks the page.
  let avatarUrl: string | null = null;
  if (stockist.avatar_path) {
    const { data: signed } = await supabase.storage
      .from("stockist-avatars")
      .createSignedUrl(stockist.avatar_path, 60 * 60);
    avatarUrl = signed?.signedUrl ?? null;
  }

   // Profile is complete once phone and country are saved. Bank details are
  // complete once the stockist has a saved row (RLS: own row only).
  const profileComplete = Boolean(
    stockist.phone?.trim() && stockist.country?.trim(),
  );
  const { data: bankRow } = await supabase
    .from("stockist_bank_details")
    .select("stockist_id")
    .eq("stockist_id", stockist.id)
    .maybeSingle();

  // Unread announcements for the sidebar badge. Returns 0 on any error,
  // so it can never break the layout.
  const unreadAnnouncements =
    await getMyUnreadPartnerAnnouncementCount("stockist");

  return (
    <StockistShell
      name={stockist.name || name}
      email={user.email ?? ""}
           profileLocked={profileComplete}
      bankComplete={bankRow != null}
      avatarUrl={avatarUrl}
      tierName={stockist.tier_name}
      commissionPercent={Number(stockist.commission_percent) || 0}
      unreadAnnouncements={unreadAnnouncements}
    >
      {children}
    </StockistShell>
  );
}
