import { NextResponse, type NextRequest } from "next/server";
import { resolveReferralCode } from "@/lib/affiliate/referral-resolve";
import { resolveReferral } from "@/lib/referral/referral-queries";
import { MAX_DISCOUNT_PERCENT } from "@/lib/checkout/discount";

// Link-preview crawlers (WhatsApp, Facebook, Telegram, X, LinkedIn,
// Slack, Discord). They do not run JavaScript and they follow redirects,
// so they must get the preview tags directly instead of a redirect.
const PREVIEW_BOTS =
  /facebookexternalhit|WhatsApp|TelegramBot|Twitterbot|LinkedInBot|Slackbot|Discordbot|SkypeUriPreview/i;

// Public route: /r/<code>
//
// 1. Look the affiliate's code up (the affiliate must be active).
// 2. Valid   -> save it in the finasto_ref cookie (the one checkout
//               already reads), then redirect to the shop.
// 3. Invalid -> redirect to the shop, no cookie, no error shown.
//
// Same rules as the existing ?ref= system in middleware.ts: first click
// wins, and the cookie lasts one year.

const SHOP_PATH = "/shop";
const REFERRAL_COOKIE = "finasto_ref"; // must match lib/referral/referral-cookie.ts
const REFERRAL_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;

  const resolved = await resolveReferralCode(code);

  if (!resolved) {
    return NextResponse.redirect(new URL(SHOP_PATH, request.url));
  }

    // Preview crawlers get a tiny page with preview tags and no cookie.
  // Only the discount percent is exposed, never the affiliate's name.
  if (PREVIEW_BOTS.test(request.headers.get("user-agent") ?? "")) {
    const referral = await resolveReferral(resolved.referralCode);
    const percent = Math.min(
      referral?.discountPercent ?? 0,
      MAX_DISCOUNT_PERCENT,
    );

    if (percent > 0) {
      const origin =
        (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/+$/, "") ||
        new URL(request.url).origin;
      const label = Number(percent.toFixed(2));
      const title = `Get ${label}% off at Finasto`;
      const description =
        "Premium Bali botanical tea. Your discount is applied automatically at checkout.";
      const url = `${origin}/r/${resolved.referralCode}`;
      const image = `${origin}/r/${resolved.referralCode}/og`;

      const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${title}</title><meta name="robots" content="noindex"><meta property="og:type" content="website"><meta property="og:site_name" content="Finasto"><meta property="og:title" content="${title}"><meta property="og:description" content="${description}"><meta property="og:url" content="${url}"><meta property="og:image" content="${image}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${title}"><meta name="twitter:description" content="${description}"><meta name="twitter:image" content="${image}"></head><body></body></html>`;

      return new NextResponse(html, {
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  }

  const response = NextResponse.redirect(new URL(SHOP_PATH, request.url));

  // First-click-wins: never replace an existing referral.
  if (!request.cookies.has(REFERRAL_COOKIE)) {
    response.cookies.set(REFERRAL_COOKIE, resolved.referralCode, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: REFERRAL_COOKIE_MAX_AGE,
    });
  }

  return response;
}
