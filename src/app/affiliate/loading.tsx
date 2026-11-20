// Shown instantly while an affiliate page loads its data. It copies the
// dashboard's layout (banner, KPI cards, chart, side cards) so the page
// doesn't jump when the real content arrives.

function Block({ className }: { className: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-2xl bg-aff-green-900/10 ${className}`}
    />
  );
}

export default function AffiliateLoading() {
  return (
    <div
      role="status"
      aria-busy="true"
      className="flex w-full min-w-0 flex-col gap-3 sm:gap-4"
    >
      <span className="sr-only">Loading…</span>

      {/* Welcome banner */}
      <Block className="h-[140px] sm:h-[150px]" />

      <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-3">
        {/* Left: KPI cards + chart */}
        <div className="flex min-w-0 flex-col gap-3 sm:gap-4 lg:col-span-2">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Block key={i} className="h-[96px]" />
            ))}
          </div>
          <Block className="h-[320px] lg:h-[380px]" />
        </div>

        {/* Right: donut + recent orders */}
        <div className="flex min-w-0 flex-col gap-3 sm:gap-4">
          <Block className="h-[240px]" />
          <Block className="h-[300px]" />
        </div>
      </div>
    </div>
  );
}