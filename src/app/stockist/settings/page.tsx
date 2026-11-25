// import type { Metadata } from "next";
// import { getMyStockistProfile } from "@/lib/stockist/settings-queries";
// import { StockistProfileForm } from "@/components/stockist/settings/profile-form";
// import { StockistPhotoCard } from "@/components/stockist/settings/stockist-photo-card"
// import { StockistTierCard } from "@/components/stockist/settings/stockist-tier-card";
// import { StockistBankDetailsForm } from "@/components/stockist/settings/bank-details-form";

// // Server component: reads the stockist's own profile, then hands it to the
// // client form. getMyStockistProfile() calls requireRole("stockist") itself,
// // so the page is protected even if the layout check were ever removed.

// export const metadata: Metadata = {
//   title: "Settings",
// };

// export default async function StockistSettingsPage() {
//   const profile = await getMyStockistProfile();

//  return (
//   <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6">
//     {profile ? (
//       <>
//         <StockistTierCard
//           tierName={profile.tierName}
//           purchaseAmount={profile.purchaseAmount}
//           commissionPercent={profile.commissionPercent}
//         />
//         <StockistProfileForm profile={profile} />
//         <StockistBankDetailsForm profile={profile} />
//       </>
//     ) : (
//       <div className="rounded-2xl border border-border px-6 py-10 text-center font-sans text-[14px] text-warm-gray">
//         Your profile isn&apos;t ready yet. Please contact support.
//       </div>
//     )}
//   </div>
// );
// }

import type { Metadata } from "next";
import { getMyStockistProfile } from "@/lib/stockist/settings-queries";
import { StockistProfileForm } from "@/components/stockist/settings/profile-form";
import { StockistTierCard } from "@/components/stockist/settings/stockist-tier-card";
import { StockistBankDetailsForm } from "@/components/stockist/settings/bank-details-form";

// Server component: reads the stockist's own profile, then hands it to the
// client form. getMyStockistProfile() calls requireRole("stockist") itself,
// so the page is protected even if the layout check were ever removed.

export const metadata: Metadata = {
  title: "Settings",
};

export default async function StockistSettingsPage() {
  const profile = await getMyStockistProfile();

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6">
      {profile ? (
        <>
          <StockistTierCard
            tierName={profile.tierName}
            purchaseAmount={profile.purchaseAmount}
            commissionPercent={profile.commissionPercent}
          />
          <StockistProfileForm profile={profile} />
          <StockistBankDetailsForm profile={profile} />
        </>
      ) : (
        <div className="rounded-2xl border border-border px-6 py-10 text-center font-sans text-[14px] text-warm-gray">
          Your profile isn&apos;t ready yet. Please contact support.
        </div>
      )}
    </div>
  );
}
