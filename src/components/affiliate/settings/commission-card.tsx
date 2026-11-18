import { Percent } from "lucide-react";

// Read-only card: the rate is calculated automatically from monthly
// sales (or a custom override set by the admin). The affiliate can only
// see it. No client code needed, so this stays a server component.

export function CommissionCard({
  commissionPercent,
  commissionTier,
}: {
  commissionPercent: number;
  commissionTier: string;
}) {
  const isSet = commissionPercent > 0;

   return (
    <section className="rounded-2xl bg-gradient-to-br from-aff-gold-600 via-aff-gold-300 to-aff-gold-500 p-[1.5px] shadow-[0_18px_44px_-20px_rgba(172,131,78,0.55)]">
      <div className="relative isolate overflow-hidden rounded-[15px] bg-gradient-to-br from-aff-green-950 via-aff-green-900 to-aff-green-800 p-5 sm:p-6">
        {/* thin gold line on top */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-aff-gold-300 to-transparent"
        />

        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-display text-[25px] leading-tight text-aff-gold-300">
  Commission rate
</h1>
            <p className="mt-1 max-w-md font-sans text-[13px] leading-relaxed text-aff-cream-50/75">
              {isSet
                ? "This is the share of each eligible sale you earn. It is based on your monthly sales tier. To ask about a change, please contact the Finasto team."
                : "Your commission rate is not available yet. Please contact the Finasto team."}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-3 rounded-xl border border-aff-gold-400/40 bg-aff-green-950/60 px-4 py-3">
            <div className="text-right">
              <span className="font-display text-[26px] leading-none tabular-nums text-aff-gold-300">
                {isSet ? `${commissionPercent}%` : "Not set"}
              </span>
              {isSet && (
                <p className="mt-1 font-sans text-[12px] text-aff-cream-50/75">
                  {commissionTier} tier
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
