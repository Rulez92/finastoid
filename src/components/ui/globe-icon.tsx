import { useId } from "react";

export function GlobeIcon({
  size = 16,
  className,
}: {
  size?: number;
  className?: string;
}) {
  // Unique IDs per instance, so two globes on one page never clash.
  const uid = useId().replace(/:/g, "");

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id={`${uid}-sea`} cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#6ec1f0" />
          <stop offset="55%" stopColor="#2a86c8" />
          <stop offset="100%" stopColor="#14508a" />
        </radialGradient>
        <linearGradient id={`${uid}-land`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7fd36b" />
          <stop offset="100%" stopColor="#2f8f3e" />
        </linearGradient>
        <radialGradient id={`${uid}-shade`} cx="65%" cy="70%" r="75%">
          <stop offset="55%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.35" />
        </radialGradient>
        <clipPath id={`${uid}-clip`}>
          <circle cx="12" cy="12" r="10.5" />
        </clipPath>
      </defs>

      {/* ocean */}
      <circle cx="12" cy="12" r="10.5" fill={`url(#${uid}-sea)`} />

      {/* continents, clipped to the sphere */}
      <g clipPath={`url(#${uid}-clip)`} fill={`url(#${uid}-land)`}>
        {/* Americas */}
        <path d="M4.2 4.6c1.6-1 3.4-1 4.4-.2.8.7.2 1.6-.6 2-1 .6-1.1 1.5-.4 2.2.8.7 2.2.8 2.4 1.9.2 1-.7 1.5-.5 2.5.2 1 1.4 1.3 1.3 2.4-.1 1.2-1.3 1.5-1.8 2.5-.5 1.1-.3 2.4-1.2 3-.9.6-1.8-.2-2-1.2-.3-1.4.4-2.5 0-3.8-.4-1.2-1.7-1.8-2-3-.3-1.2.5-2.1.2-3.3-.3-1.1-1.5-1.8-1.5-3 0-1.1.6-2 1.5-2.8z" />
        {/* Africa and Europe */}
        <path d="M12.6 5.2c1.2-.6 2.6-.4 3.4.4.6.7 1.6.5 2.2 1.2.5.6.2 1.4-.4 1.8-.9.6-.7 1.6-.2 2.4.6 1 .1 2.2-.8 2.8-1 .7-1.4 1.8-1.3 3 .1 1.3-.7 2.5-1.8 2.9-1.1.4-2-.5-2.2-1.5-.2-1.1.3-2-.1-3-.4-1-1.4-1.5-1.5-2.7-.1-1.2.9-1.9 1.3-2.9.4-1-.2-1.9.1-2.9.3-.8.7-1.5 1.3-1.5z" />
        {/* Asia (right edge) */}
        <path d="M18.6 6.4c1.2.2 2.2 1 2.6 2.1.3.9-.4 1.6-1.2 1.8-1 .3-1.2 1.3-1.9 1.7-.8.4-1.7-.2-1.7-1.1 0-1 .8-1.6.9-2.5.1-.9.2-2.1 1.3-2z" />
      </g>

      {/* shading and glossy highlight for depth */}
      <circle cx="12" cy="12" r="10.5" fill={`url(#${uid}-shade)`} />
      <ellipse
        cx="8.6"
        cy="6.8"
        rx="4.2"
        ry="2.4"
        fill="#fff"
        opacity="0.28"
        transform="rotate(-28 8.6 6.8)"
      />
      <circle
        cx="12"
        cy="12"
        r="10.5"
        fill="none"
        stroke="#0f3f6e"
        strokeOpacity="0.35"
        strokeWidth="0.6"
      />
    </svg>
  );
}