// Reads the referral cookie on the server and, if the affiliate is active
// and has a discount, renders the bottom bar. It uses the SAME lookup as
// createOrder(), so the percent shown is the percent applied. Only the
// percent is sent to the browser: never the affiliate's name or code.

import { readReferralCode } from "@/lib/referral/referral-cookie";
import { resolveReferral } from "@/lib/referral/referral-queries";
import { MAX_DISCOUNT_PERCENT } from "@/lib/checkout/discount";
import { DiscountBarClient } from "./discount-bar-client";

export async function ReferralDiscountBar() {
  const code = await readReferralCode();
  if (!code) return null;

  const referral = await resolveReferral(code);
  const percent = Math.min(referral?.discountPercent ?? 0, MAX_DISCOUNT_PERCENT);
  if (percent <= 0) return null;

  return <DiscountBarClient percent={percent} />;
}