"use client";

// Bottom discount bar. Slides up after load, can be dismissed for the
// session, and is hidden on admin, affiliate, stockist and sign-in pages.
// Dismiss state is read after mount, so server and browser render the same
// HTML first (no hydration mismatch).

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Gift, X } from "lucide-react";

// Add your checkout path here if it is not /checkout. The checkout summary
// shows the discount itself, and a fixed bar could cover the pay button.
const HIDDEN_PREFIXES = [
  "/admin",
  "/affiliate",
  "/stockist",
  "/sign-in",
  "/auth",
  "/checkout",
];

export function DiscountBarClient({ percent }: { percent: number }) {
  const pathname = usePathname();
  const storageKey = `finasto-discount-bar:${percent}`;
  const [ready, setReady] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      setDismissed(sessionStorage.getItem(storageKey) === "1");
    } catch {
      // storage blocked: just show the bar
    }
    setReady(true);
  }, [storageKey]);

  const hiddenHere = HIDDEN_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
  const show = ready && !dismissed && !hiddenHere;

  function dismiss() {
    setDismissed(true);
    try {
      sessionStorage.setItem(storageKey, "1");
    } catch {
      // ignore
    }
  }

  return (
    <>
      <AnimatePresence>
        {show && (
          <motion.div
            role="status"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-x-0 bottom-0 z-30 border-t border-copper/40 bg-green-deep pb-[env(safe-area-inset-bottom)] text-cream shadow-[0_-10px_30px_-12px_rgba(0,0,0,0.5)]"
          >
            <div className="mx-auto flex max-w-[1440px] items-center justify-center gap-3 px-4 py-3 sm:px-8">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-copper/20 text-copper-light">
                <Gift className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
              </span>
              <p className="min-w-0 font-sans text-[13px] leading-snug sm:text-[14px]">
                <span className="font-semibold">{percent}% off your order.</span>{" "}
                <span className="text-cream/80">
                  Your discount is applied automatically at checkout.
                </span>
              </p>
              <button
                type="button"
                onClick={dismiss}
                aria-label="Dismiss discount message"
                className="ml-1 inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-cream/70 transition-colors hover:bg-white/10 hover:text-cream"
              >
                <X className="h-4 w-4" strokeWidth={1.8} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Same height as the bar, so it never covers the footer. */}
      {show && <div aria-hidden="true" className="h-16" />}
    </>
  );
}