export default function Loading() {
  return (
    <main
      aria-busy="true"
      aria-label="Loading"
      className="grid min-h-dvh place-items-center bg-[radial-gradient(ellipse_at_center,#1d3a22_0%,#0f1d12_55%,#0b0806_100%)]"
    >
      <svg
        viewBox="0 0 200 200"
        aria-hidden="true"
        className="h-[190px] w-[190px] animate-pulse sm:h-[260px] sm:w-[260px]"
      >
        <circle
          cx="100"
          cy="100"
          r="96"
          fill="none"
          stroke="#e8c06a"
          strokeOpacity="0.55"
          strokeWidth="1"
        />
        <g transform="translate(100 100)">
          {Array.from({ length: 12 }).map((_, i) => (
            <path
              key={i}
              transform={`rotate(${30 * i})`}
              d="M0 0 C-17 -22 -15 -56 0 -80 C15 -56 17 -22 0 0Z"
              fill="#e8c06a"
              fillOpacity={i % 2 === 0 ? 0.55 : 0.3}
            />
          ))}
          <circle r="11" fill="#e8c06a" />
        </g>
      </svg>
    </main>
  );
}