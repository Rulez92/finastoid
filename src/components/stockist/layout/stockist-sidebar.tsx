
"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, Crown, LogOut, UserRound, X } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { signOutAction } from "@/lib/auth/actions";
import { stockistNav, isNavActive } from "./stockist-nav";

// Same design as affiliate-sidebar.tsx: logo, nav list, sign out pinned to
// the bottom. onNavigate closes the mobile drawer when a link (or the close
// button) is tapped. Colors come from the aff-* tokens in globals.css.

export function StockistSidebar({
  onNavigate,
  collapsed = false,
  onToggleCollapse,
   tierName,
  commissionPercent,
  unreadAnnouncements = 0,
}: {
  onNavigate?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
   tierName: string;
  commissionPercent: number;
  unreadAnnouncements?: number;
}) {
    const pathname = usePathname();

  // Poster: Mobile Associate = person icon, Signature Associate = crown.
  const TierIcon = /signature/i.test(tierName) ? Crown : UserRound;

  return (
    <div className="relative h-full">
      {onToggleCollapse && (
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          aria-controls="stockist-sidebar"
          className="group/handle absolute -right-3.5 top-[104px] z-20 hidden h-7 w-7 cursor-pointer touch-manipulation items-center justify-center rounded-full border border-aff-gold-400/60 bg-aff-green-950 text-aff-gold-300 shadow-[0_6px_16px_-6px_rgba(3,24,7,0.6)] transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aff-gold-300 active:scale-90 motion-reduce:transition-none lg:inline-flex [@media(hover:hover)]:hover:border-aff-gold-300 [@media(hover:hover)]:hover:bg-aff-gold-300 [@media(hover:hover)]:hover:text-aff-green-950 [@media(hover:hover)]:hover:shadow-[0_0_18px_rgba(241,204,156,0.55)]"
        >
          <ChevronLeft
            className={cn(
              "h-4 w-4 transition-transform duration-300 motion-reduce:transition-none",
              collapsed && "rotate-180",
            )}
            strokeWidth={2.2}
            aria-hidden="true"
          />
        </button>
      )}

      <div className="relative flex h-full flex-col overflow-hidden bg-[radial-gradient(ellipse_at_25%_18%,var(--color-aff-green-800)_0%,var(--color-aff-green-900)_48%,var(--color-aff-green-950)_100%)]">
        {/* Right vertical golden edge line */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-[1.5px] bg-gradient-to-b from-aff-gold-600/30 via-aff-gold-300/75 to-aff-gold-600/30"
        />

        {/* Logo & Close Drawer Button */}
        <div className="relative z-10 flex h-32 shrink-0 items-center justify-center px-5 pt-2">
          <Link
            href="/stockist"
            onClick={onNavigate}
            aria-label="Finasto stockist home"
            className={cn(collapsed && "lg:hidden")}
          >
            <Image
              src="/brand/finasto-logo-dark.png"
              alt="Finasto"
              width={130}
              height={98}
              priority
              className="h-24 w-auto drop-shadow-[0_4px_20px_rgba(241,204,156,0.35)]"
            />
          </Link>

          <button
            type="button"
            onClick={onNavigate}
            aria-label="Close menu"
            className="absolute right-3 top-3 inline-flex h-9 w-9 cursor-pointer items-center justify-center text-aff-cream-50/70 hover:text-aff-cream-50 lg:hidden"
          >
            <X className="h-5 w-5" strokeWidth={1.6} />
          </button>
        </div>

        {/* Associate tier badge (read-only, set by the admin) */}
        <div className="relative z-10 shrink-0 px-3.5 pb-1">
          <Link
            href="/stockist/settings"
            onClick={onNavigate}
            title={
              collapsed ? `${tierName} · ${commissionPercent}%` : undefined
            }
            aria-label={`Your tier: ${tierName}, ${commissionPercent}% commission`}
            className={cn(
              "flex items-center gap-3 rounded-xl border border-aff-gold-400/40 bg-aff-cream-50/5 px-3.5 py-2.5 transition-colors hover:bg-aff-cream-50/10",
              collapsed && "lg:justify-center lg:gap-0 lg:px-0",
            )}
          >
            <TierIcon
              className="h-[18px] w-[18px] shrink-0 text-aff-gold-300"
              strokeWidth={1.8}
              aria-hidden="true"
            />
            <span className={cn("min-w-0", collapsed && "lg:hidden")}>
              <span className="block truncate font-sans text-[13px] font-semibold leading-tight text-aff-gold-300">
                {tierName}
              </span>
              <span className="block font-sans text-[11px] leading-tight text-aff-cream-50/70">
                {commissionPercent}% commission
              </span>
            </span>
          </Link>
        </div>

        {/* Navigation List */}
        <nav
          aria-label="Stockist"
          className="relative z-10 flex-1 overflow-y-auto px-3.5 py-3"
        >
          <ul className="flex flex-col gap-2">
                       {stockistNav.map(({ label, href, icon: Icon }) => {
              const active = isNavActive(pathname, href);
              // Announcements shows the live unread count ("9+" when above 9).
              const badge =
                href === "/stockist/announcements" && unreadAnnouncements > 0
                  ? unreadAnnouncements > 9
                    ? "9+"
                    : String(unreadAnnouncements)
                  : undefined;
              return (
                <li key={href}>
                  <motion.div
                    whileHover={{ x: 4, scale: 1.01 }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <Link
                      href={href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      title={collapsed ? label : undefined}
                      className={cn(
                        "group relative flex items-center gap-3.5 rounded-xl px-3.5 py-2.5 font-sans text-[14px] transition-all duration-200",
                        collapsed && "lg:justify-center lg:gap-0 lg:px-0",
                        active
                          ? "bg-gradient-to-r from-aff-cream-50 via-aff-gold-300 to-aff-gold-600 font-semibold text-aff-green-950 shadow-[0_0_24px_rgba(241,204,156,0.4),inset_0_1px_1px_rgba(255,255,255,0.7)] ring-1 ring-aff-gold-300/80"
                          : "text-aff-cream-50/85 hover:bg-aff-cream-50/5 hover:text-aff-cream-50",
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-[18px] w-[18px] shrink-0 transition-colors",
                          active
                            ? "text-aff-green-950"
                            : "text-aff-cream-50/80 group-hover:text-aff-gold-300",
                        )}
                        strokeWidth={active ? 2 : 1.6}
                      />
                                          <span
                        className={cn("truncate", collapsed && "lg:hidden")}
                      >
                        {label}
                      </span>
                      {badge && (
                        <span
                          className={cn(
                            "ml-auto shrink-0 rounded-full border px-2 py-0.5 font-sans text-[10px] font-medium",
                            collapsed && "lg:hidden",
                            active
                              ? "border-aff-green-950/30 bg-aff-green-950/10 text-aff-green-950"
                              : "border-aff-gold-400/40 bg-aff-gold-400/10 text-aff-gold-300",
                          )}
                        >
                          {badge}
                        </span>
                      )}
                    </Link>
                  </motion.div>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Sign Out Section (pinned to bottom) */}
        <div className="relative z-10 shrink-0 p-3.5 pb-5">
          <form action={signOutAction}>
            <motion.div
              whileHover={{ x: 3 }}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <button
                type="submit"
                title={collapsed ? "Sign out" : undefined}
                className={cn(
                  "flex w-full cursor-pointer items-center gap-3.5 rounded-xl px-3.5 py-2.5 font-sans text-[14px] text-aff-cream-50/75 transition-colors hover:bg-aff-cream-50/5 hover:text-aff-gold-300",
                  collapsed && "lg:justify-center lg:gap-0 lg:px-0",
                )}
              >
                <LogOut className="h-[18px] w-[18px]" strokeWidth={1.6} />
                <span className={cn(collapsed && "lg:hidden")}>Sign out</span>
              </button>
            </motion.div>
          </form>
        </div>
      </div>
    </div>
  );
}