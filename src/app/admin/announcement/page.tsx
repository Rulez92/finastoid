// Admin Announcement page. A server component: it loads both lists on the
// server and hands them to the client tables.

import { listAnnouncements } from "@/lib/admin/announcement-queries";
import { listPartnerAnnouncements } from "@/lib/admin/partner-announcement-queries";
import { AnnouncementTable } from "@/components/admin/announcement/announcement-table";
import { PartnerAnnouncementTable } from "@/components/admin/announcement/partner-announcement-table";
import { PromotionTable } from "@/components/admin/announcement/promotion-table";
import { listPromotions } from "@/lib/admin/promotion-queries";

export const metadata = { title: "Announcements — Finasto Admin" };

export default async function AdminAnnouncementPage() {
  // Both queries re-check requireRole("admin") themselves.
  const [items, partnerItems,promotionItems] = await Promise.all([
    listAnnouncements(),
    listPartnerAnnouncements(),
    listPromotions()
  ]);

  return (
    <div className="flex flex-col gap-12">
      <AnnouncementTable items={items} />
      <PartnerAnnouncementTable items={partnerItems} />
      <PromotionTable items={promotionItems}/>
    </div>
  );
}