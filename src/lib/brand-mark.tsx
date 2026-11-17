// lib/brand-mark.tsx
export const BRAND = {
  green: "#234d2a", // brand green-deep
  gold: "#e8c06a",  // brand gold
};

// Plain function (not a component): Satori handles a returned element most reliably.
export function leafMark(px: number, strokeWidth = 2.2) {
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 24 24"
      fill="none"
      stroke={BRAND.gold}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Lucide "leaf" */}
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
    </svg>
  );
}