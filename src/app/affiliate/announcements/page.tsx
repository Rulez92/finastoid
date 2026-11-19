// Affiliate Announcements page. Server component: loads the data and hands
// it to the client list (same pattern as the Accounts page).

import { redirect } from "next/navigation";
import { getMyPartnerAnnouncements } from "@/lib/partner/announcement-queries";
import { AnnouncementsList } from "@/components/affiliate/announcements/announcements-list";

export const metadata = { title: "Announcements" };

export default async function AffiliateAnnouncementsPage() {
  // requireRole("affiliate") inside the query redirects non-affiliates.
  const result = await getMyPartnerAnnouncements("affiliate");
  if (!result) redirect("/login");

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6">
      <AnnouncementsList items={result.items} />
    </div>
  );
}