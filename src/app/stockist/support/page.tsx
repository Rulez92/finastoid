// Save as: app/(stockist)/stockist/support/page.tsx  (your existing path)

import type { Metadata } from "next";
import { Clock, Lightbulb, Mail, MessageCircle, User } from "lucide-react";
import { getMyStockistProfile } from "@/lib/stockist/settings-queries";
import { SupportEmailForm } from "@/components/stockist/support/support-email-form";
import { Reveal } from "@/components/affiliate/dashboard/reveal";
import { SUPPORT_TEXT, whatsappGreeting } from "@/lib/stockist/support-copy";

// Server component. Same design as the affiliate Support page. Two ways to
// reach the admin: WhatsApp (NEXT_PUBLIC_SUPPORT_WHATSAPP, digits only) and
// an email form. The stockist is found from the signed-in user through
// getMyStockistProfile(), which checks the stockist role itself.

export const metadata: Metadata = {
  title: "Support",
  robots: { index: false, follow: false },
};

const goldText =
  "bg-gradient-to-r from-aff-gold-600 via-aff-gold-300 to-aff-gold-500 bg-clip-text text-transparent";

function IconBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-aff-gold-400/25 text-[#7A5526]">
      {children}
    </span>
  );
}

export default async function StockistSupportPage() {
  const profile = await getMyStockistProfile();

  // Keep digits only, so "+92 300 1234567" in the env file still works.
  const number = (process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? "").replace(
    /\D/g,
    "",
  );

  const text = whatsappGreeting(profile?.name, profile?.email);
  const whatsappUrl = number
    ? `https://wa.me/${number}?text=${encodeURIComponent(text)}`
    : null;

  const T = SUPPORT_TEXT;
  const email = profile?.email ?? "";

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-4 sm:gap-6">
      {/* Header */}
      <Reveal>
        <header className="rounded-2xl bg-gradient-to-br from-aff-gold-600 via-aff-gold-300 to-aff-gold-500 p-[1.5px] shadow-[0_18px_44px_-20px_rgba(172,131,78,0.55)]">
          <div className="relative isolate overflow-hidden rounded-[15px] bg-gradient-to-br from-aff-green-950 via-aff-green-900 to-aff-green-800">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -start-16 -top-16 -z-10 h-48 w-48 rounded-full bg-aff-gold-400/15 blur-3xl"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-aff-gold-300 to-transparent"
            />
            <div className="relative z-10 flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-6">
              <div className="min-w-0">
                <h1 className="break-words font-display text-[24px] font-semibold leading-tight text-aff-cream-50 sm:text-[30px]">
                  {T.page.titleLead}{" "}
                  <span className={goldText}>{T.page.titleAccent}</span>
                </h1>
                <p className="mt-1.5 max-w-xl font-sans text-[13px] leading-relaxed text-aff-cream-50/75 sm:text-[14px]">
                  {T.page.subtitle}
                </p>
              </div>

              <div className="shrink-0">
                {whatsappUrl ? (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-11 w-full touch-manipulation items-center justify-center gap-2 rounded-full bg-gradient-to-r from-aff-gold-600 via-aff-gold-300 to-aff-gold-500 px-6 font-sans text-[14px] font-semibold text-aff-green-950 shadow-[0_10px_26px_-12px_rgba(241,204,156,0.7)] transition-all duration-200 active:scale-[0.97] sm:w-auto [@media(hover:hover)]:hover:-translate-y-0.5"
                  >
                    <MessageCircle className="h-4 w-4" aria-hidden="true" />
                    {T.page.whatsapp}
                  </a>
                ) : (
                  <p className="rounded-full border border-aff-gold-400/40 bg-aff-green-950/60 px-3.5 py-1.5 font-sans text-[12px] font-medium text-aff-gold-300">
                    {T.page.whatsappOff}
                  </p>
                )}
              </div>
            </div>
          </div>
        </header>
      </Reveal>

      <div className="grid items-start gap-4 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Email card */}
        <Reveal>
          <section className="aff-card flex flex-col gap-5 p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <IconBadge>
                <Mail className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden="true" />
              </IconBadge>
              <div className="min-w-0">
                <h2 className="font-display text-[18px] leading-tight text-aff-green-900">
                  {T.composer.title}
                </h2>
                <p className="mt-0.5 font-sans text-[13px] leading-relaxed text-aff-muted">
                  {T.composer.subtitle}
                </p>
              </div>
            </div>

            <SupportEmailForm replyTo={email} />
          </section>
        </Reveal>

        {/* Sidebar */}
        <aside className="flex flex-col gap-4 sm:gap-6">
          <Reveal>
            <section className="aff-card p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <IconBadge>
                  <User className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden="true" />
                </IconBadge>
                <h2 className="font-display text-[16px] leading-tight text-aff-green-900">
                  {T.details.title}
                </h2>
              </div>

              <dl className="mt-4 flex flex-col divide-y divide-aff-border font-sans text-[13px]">
                <div className="flex items-center justify-between gap-3 py-2.5 first:pt-0">
                  <dt className="text-aff-muted">{T.details.name}</dt>
                  <dd className="min-w-0 break-words text-end font-medium text-aff-green-900">
                    <bdi>{profile?.name ?? T.details.none}</bdi>
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3 py-2.5">
                  <dt className="text-aff-muted">{T.details.country}</dt>
                  <dd className="min-w-0 break-words text-end font-medium text-aff-green-900">
                    <bdi>{profile?.country ?? T.details.none}</bdi>
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3 py-2.5 last:pb-0">
                  <dt className="text-aff-muted">{T.details.email}</dt>
                  <dd className="min-w-0 break-all text-end font-medium text-aff-green-900">
                    <bdi>{email || T.details.none}</bdi>
                  </dd>
                </div>
              </dl>
            </section>
          </Reveal>

          <Reveal>
            <section className="aff-card p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <IconBadge>
                  <Clock className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden="true" />
                </IconBadge>
                <h2 className="font-display text-[16px] leading-tight text-aff-green-900">
                  {T.response.title}
                </h2>
              </div>
              <p className="mt-3 font-sans text-[13px] leading-relaxed text-aff-muted">
                {T.response.body}
              </p>
            </section>
          </Reveal>

          <Reveal>
            <section className="aff-card p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <IconBadge>
                  <Lightbulb className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden="true" />
                </IconBadge>
                <h2 className="font-display text-[16px] leading-tight text-aff-green-900">
                  {T.tips.title}
                </h2>
              </div>
              <ul className="mt-3 flex flex-col gap-2 font-sans text-[13px] leading-relaxed text-aff-muted">
                {T.tips.items.map((tip) => (
                  <li key={tip} className="flex items-start gap-2.5">
                    <span
                      aria-hidden="true"
                      className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-aff-gold-500"
                    />
                    <span className="min-w-0">{tip}</span>
                  </li>
                ))}
              </ul>
            </section>
          </Reveal>
        </aside>
      </div>
    </div>
  );
}