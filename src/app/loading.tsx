// app/loading.tsx
"use client";
import { motion } from "motion/react";

export default function Loading() {
  return (
    <motion.div
      aria-busy="true"
      aria-label="Loading"
      role="status"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.2, duration: 0.3 }}
      className="fixed inset-0 z-30 grid place-items-center bg-cream"
    >
      <motion.svg
        viewBox="0 0 200 200"
        aria-hidden="true"
        className="h-[120px] w-[120px] sm:h-[160px] sm:w-[160px]"
        animate={{ rotate: 360 }}
        transition={{ duration: 2.5, ease: "linear", repeat: Infinity }}
      >
        <circle cx="100" cy="100" r="96" fill="none" stroke="#b87333" strokeOpacity="0.5" strokeWidth="1" />
        <g transform="translate(100 100)">
          {Array.from({ length: 12 }).map((_, i) => (
            <path
              key={i}
              transform={`rotate(${30 * i})`}
              d="M0 0 C-17 -22 -15 -56 0 -80 C15 -56 17 -22 0 0Z"
              fill={i % 2 === 0 ? "#234d2a" : "#b87333"}
              fillOpacity={i % 2 === 0 ? 0.85 : 0.55}
            />
          ))}
          <circle r="11" fill="#b87333" />
        </g>
      </motion.svg>
    </motion.div>
  );
}