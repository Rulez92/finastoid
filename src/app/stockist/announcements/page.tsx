import { getMyPartnerAnnouncements } from "@/lib/partner/announcement-queries";
import { StockistAnnouncementsList } from "@/components/stockist/announcements/announcements-list";

export const metadata = { title: "Announcements" };

export default async function StockistAnnouncementsPage() {
  // requireRole("stockist") inside the query redirects non-stockists.
  const result = await getMyPartnerAnnouncements("stockist");

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6">
      <StockistAnnouncementsList items={result.items} />
    </div>
  );
}