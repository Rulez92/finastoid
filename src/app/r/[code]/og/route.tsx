// Preview image for a shared referral link: /r/<code>/og
// Shows only the discount percent. Never the affiliate's name or code.
// Uses the same lookup as createOrder(), so the percent shown is the
// percent applied. Invalid codes and 0% discounts return 404.

import { ImageResponse } from "next/og";
import { resolveReferral } from "@/lib/referral/referral-queries";
import { MAX_DISCOUNT_PERCENT } from "@/lib/checkout/discount";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  if (!/^[A-Za-z0-9]{4,32}$/.test(code)) {
    return new Response("Not found", { status: 404 });
  }

  const referral = await resolveReferral(code);
  const percent = Math.min(referral?.discountPercent ?? 0, MAX_DISCOUNT_PERCENT);
  if (percent <= 0) return new Response("Not found", { status: 404 });

  const label = `${Number(percent.toFixed(2))}%`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0c2411 0%, #1b4724 100%)",
          color: "#f4e4cf",
          border: "14px solid #c9a15a",
        }}
      >
        <div style={{ display: "flex", fontSize: 44, letterSpacing: 10, color: "#c9a15a" }}>
         FINASTO™ 
        </div>
        <div style={{ display: "flex", fontSize: 230, fontWeight: 700, lineHeight: 1, marginTop: 10 }}>
          {label}
        </div>
        <div style={{ display: "flex", fontSize: 76, letterSpacing: 18, color: "#e3c48a" }}>
          OFF
        </div>
        <div style={{ display: "flex", fontSize: 34, marginTop: 36, opacity: 0.85 }}>
          Applied automatically at checkout
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}