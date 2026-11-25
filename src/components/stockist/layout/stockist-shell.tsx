// "use client";

// import { useEffect, useState } from "react";
// import { usePathname } from "next/navigation";
// import Link from "next/link";
// import { Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
// import { cn } from "@/lib/utils";
// import { StockistSidebar } from "./stockist-sidebar";
// import { stockistNav, isNavActive } from "./stockist-nav";

// import { StockistNotificationBell } from "./notification-bell";
// import { ThemeToggle } from "@/components/ThemeToggle";

// // Same layout as admin-shell.tsx: fixed 260px sidebar on desktop, a
// // slide-in drawer with overlay on mobile, and a sticky top bar showing
// // the current page title, the currency menu and the signed-in user.

// export function StockistShell({
//   name,
//   email,
//   profileLocked,
//   children,
// }: {
//   name: string | null;
//   email: string;
//   profileLocked: boolean;
//   children: React.ReactNode;
// }) {
//   const [open, setOpen] = useState(false);

//   const [collapsed, setCollapsed] = useState(false);
//   const pathname = usePathname();
//   // Until username, phone and country are saved, only Settings is usable.
//   const needsProfile =
//     !profileLocked && !pathname.startsWith("/stockist/settings");
//   const title =
//     stockistNav.find((i) => isNavActive(pathname, i.href))?.label ?? "Stockist";
//   const initials = (name || email || "A").trim().slice(0, 2).toUpperCase();

//   // Escape closes the drawer; the page behind it can't scroll while open.
//   useEffect(() => {
//     if (!open) return;
//     const onKeyDown = (e: KeyboardEvent) => {
//       if (e.key === "Escape") setOpen(false);
//     };
//     document.addEventListener("keydown", onKeyDown);
//     document.body.style.overflow = "hidden";
//     return () => {
//       document.removeEventListener("keydown", onKeyDown);
//       document.body.style.overflow = "";
//     };
//   }, [open]);

//   return (
//     <div className="relative min-h-screen bg-cream dark:bg-cream-soft">
//       <div
//         aria-hidden
//         className="dark-glow pointer-events-none fixed -bottom-40 -right-40 z-0 h-[520px] w-[520px] rounded-full"
//       />
//       {open && (
//         <div
//           aria-hidden="true"
//           onClick={() => setOpen(false)}
//           className="fixed inset-0 z-40 bg-espresso-deep/45 lg:hidden"
//         />
//       )}

//       <aside
//         id="stockist-sidebar"
//         aria-label="Stockist navigation"
//         className={cn(
//           "fixed inset-y-0 left-0 z-50 w-[280px] border-r border-border bg-cream transition-[transform,width] duration-300 ease-out lg:translate-x-0",
//           collapsed ? "lg:w-[76px]" : "lg:w-[260px]",
//           open ? "translate-x-0" : "-translate-x-full",
//         )}
//       >
//         <StockistSidebar
//           onNavigate={() => setOpen(false)}
//           collapsed={collapsed}
//         />
//       </aside>
//       <div
//         className={cn(
//           "transition-[padding] duration-300 ease-out",
//           collapsed ? "lg:pl-[76px]" : "lg:pl-[260px]",
//         )}
//       >
//         <header className="sticky top-0 z-30 flex h-[68px] items-center justify-between gap-3 border-b border-border bg-cream/80 px-4 backdrop-blur-xl backdrop-saturate-150 sm:px-6">
//           <div className="flex min-w-0 items-center gap-2">
//             <button
//               type="button"
//               onClick={() => setOpen(true)}
//               aria-label="Open menu"
//               aria-controls="stockist-sidebar"
//               aria-expanded={open}
//               className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center text-espresso lg:hidden"
//             >
//               <Menu className="h-6 w-6" strokeWidth={1.6} />
//             </button>

//             <button
//               type="button"
//               onClick={() => setCollapsed((c) => !c)}
//               aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
//               className="hidden h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl text-warm-gray transition-colors hover:bg-espresso/5 hover:text-espresso lg:inline-flex"
//             >
//               {collapsed ? (
//                 <PanelLeftOpen className="h-5 w-5" strokeWidth={1.6} />
//               ) : (
//                 <PanelLeftClose className="h-5 w-5" strokeWidth={1.6} />
//               )}
//             </button>
//             <div className="min-w-0">
//               <p className="hidden font-sans text-[10px] font-medium uppercase tracking-[0.18em] text-copper sm:block">
//                 Stockist
//               </p>
//               <h1 className="truncate font-display text-[22px] leading-tight tracking-tight text-espresso">
//                 {title}
//               </h1>
//             </div>
//           </div>

//           <div className="flex shrink-0 items-center gap-2 sm:gap-3">
//             <ThemeToggle />
//             <StockistNotificationBell />

//             <span
//               aria-hidden
//               className="mx-1 hidden h-6 w-px bg-border sm:block"
//             />

//             <div className="flex items-center gap-2.5">
//               <div className="flex h-9 w-9 items-center justify-center rounded-full bg-linear-to-br from-copper-light to-copper font-sans text-[12px] font-semibold text-espresso-deep ring-2 ring-copper/30">
//                 {initials}
//               </div>
//               <div className="hidden min-w-0 md:block">
//                 <p className="max-w-[160px] truncate font-sans text-[13px] leading-tight text-espresso">
//                   {name || "Stockist"}
//                 </p>
//                 <p className="max-w-[160px] truncate font-sans text-[11px] leading-tight text-warm-gray">
//                   {email}
//                 </p>
//               </div>
//             </div>
//           </div>
//         </header>

//         <main className="p-4 sm:p-6 lg:p-8">
//           {needsProfile ? (
//             <div className="mx-auto max-w-md rounded-2xl border border-border bg-white p-8 text-center">
//               <h1 className="font-display text-[22px] leading-tight text-espresso">
//                 Complete your profile
//               </h1>
//               <p className="mt-3 font-sans text-[14px] leading-relaxed text-warm-gray">
//                 Add your username, phone number and country first. Your country
//                 decides the currency your prices are shown in.
//               </p>
//               <Link
//                 href="/stockist/settings"
//                 className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-espresso px-6 font-sans text-[14px] font-medium text-cream transition-colors hover:bg-espresso-deep"
//               >
//                 Go to Settings
//               </Link>
//             </div>
//           ) : (
//             children
//           )}
//         </main>
//       </div>
//     </div>
//   );
// }
"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Landmark, LogOut, Menu, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { signOutAction } from "@/lib/auth/actions";
import { StockistSidebar } from "./stockist-sidebar";
import { stockistNav, isNavActive } from "./stockist-nav";

import { StockistNotificationBell } from "./notification-bell";

// Same design as affiliate-shell.tsx: fixed 260px sidebar on desktop (76px
// collapsed), a slide-in drawer with overlay on mobile, and a sticky top bar
// with the page title, notifications and the signed-in user.

export function StockistShell({
  name,
  email,
  profileLocked,
  avatarUrl,
  tierName,
  commissionPercent,
  bankComplete,
  unreadAnnouncements = 0,
  children,
}: {
  name: string | null;
  email: string;
  profileLocked: boolean;
  avatarUrl: string | null;
  tierName: string;
  commissionPercent: number;
  bankComplete: boolean;
  unreadAnnouncements?: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  // Until username, phone and country are saved, only Settings is usable.
  const needsProfile =
    !profileLocked && !pathname.startsWith("/stockist/settings");
  const title =
    stockistNav.find((i) => isNavActive(pathname, i.href))?.label ?? "Stockist";
  const initials = (name || email || "S").trim().slice(0, 2).toUpperCase();

  // Escape closes the drawer; the page behind it can't scroll while open.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open]);

  // Profile menu: close on outside tap or Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  return (
    <div className="relative min-h-screen bg-cream dark:bg-cream-soft">
      {open && (
        <div
          aria-hidden="true"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 animate-[fadeIn_0.2s_ease-out] bg-espresso-deep/50 backdrop-blur-[2px] lg:hidden"
        />
      )}

      <aside
        id="stockist-sidebar"
        aria-label="Stockist navigation"
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[280px] border-r border-aff-gold-600/25 bg-[radial-gradient(ellipse_at_top,var(--color-aff-green-800)_0%,var(--color-aff-green-900)_45%,var(--color-aff-green-950)_100%)] transition-[transform,width] duration-300 ease-out lg:translate-x-0 lg:shadow-none",
          open && "shadow-[0_0_60px_-10px_rgba(16,38,15,0.45)]",
          collapsed ? "lg:w-[76px]" : "lg:w-[260px]",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <StockistSidebar
          onNavigate={() => setOpen(false)}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((c) => !c)}
          tierName={tierName}
          commissionPercent={commissionPercent}
          unreadAnnouncements={unreadAnnouncements}
        />
      </aside>
      <div
        className={cn(
          "transition-[padding] duration-300 ease-out",
          collapsed ? "lg:pl-[76px]" : "lg:pl-[260px]",
        )}
      >
        <header className="sticky top-0 z-30 flex h-[68px] items-center justify-between gap-3 border-b border-aff-border bg-aff-ivory/85 px-4 shadow-[0_1px_0_0_rgba(172,131,78,0.25)] backdrop-blur-xl backdrop-saturate-150 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
              aria-controls="stockist-sidebar"
              aria-expanded={open}
              className="inline-flex h-11 w-11 shrink-0 cursor-pointer touch-manipulation items-center justify-center rounded-xl text-aff-green-900 transition-colors active:bg-aff-green-900/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aff-gold-600 lg:hidden"
            >
              <Menu className="h-6 w-6" strokeWidth={1.6} />
            </button>

            <div className="min-w-0">
              <p className="hidden font-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-aff-gold-600 sm:block">
                Stockist
              </p>
              <h1 className="truncate font-display text-[20px] font-semibold leading-tight tracking-tight text-aff-green-900 sm:text-[22px]">
                {title}
              </h1>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <StockistNotificationBell />

            <span
              aria-hidden
              className="mx-1 hidden h-6 w-px bg-aff-border sm:block"
            />

            <div className="flex items-center gap-2.5">
              <div ref={menuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen((o) => !o)}
                  aria-label="Open profile menu"
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  className="flex h-10 w-10 shrink-0 cursor-pointer touch-manipulation items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-green-deep to-green font-sans text-[12px] font-semibold text-aff-cream-50 ring-2 ring-aff-gold-500/60 ring-offset-2 ring-offset-aff-ivory md:cursor-default"
                >
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    initials
                  )}
                </button>

                {/* Small-screen menu: name + sign out (hidden from md up) */}
                {menuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 top-full z-50 mt-3 w-52 overflow-hidden rounded-xl border border-aff-gold-400/40 bg-aff-green-950 p-1.5 shadow-[0_16px_40px_-12px_rgba(3,24,7,0.7)] md:hidden"
                  >
                    <p className="truncate px-3 py-2 font-sans text-[13px] font-medium text-aff-cream-50">
                      {name || "Stockist"}
                    </p>
                    <span
                      aria-hidden="true"
                      className="mx-2 block h-px bg-aff-gold-400/25"
                    />
                    <form action={signOutAction}>
                      <button
                        type="submit"
                        role="menuitem"
                        className="mt-1 flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2.5 font-sans text-[14px] text-aff-cream-50/85 transition-colors active:bg-aff-cream-50/10 hover:bg-aff-cream-50/5 hover:text-aff-gold-300"
                      >
                        <LogOut className="h-[18px] w-[18px]" strokeWidth={1.6} />
                        Sign out
                      </button>
                    </form>
                  </div>
                )}
              </div>
            <div className="min-w-0">
  <p className="max-w-[90px] truncate font-sans text-[13px] leading-tight text-aff-green-900 sm:max-w-[160px]">
    {name || "Stockist"}
  </p>
  <p className="hidden max-w-[160px] truncate font-sans text-[11px] leading-tight text-aff-muted sm:block">
    {email}
  </p>
</div>
            </div>
          </div>
        </header>

        <main className="relative z-10 p-3 sm:p-6 lg:p-8">
          {needsProfile ? (
            <div className="finasto-card relative mx-auto mt-4 max-w-md overflow-hidden p-6 text-center sm:mt-8 sm:p-8">
              <span
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-aff-gold-600 via-aff-gold-300 to-aff-gold-600"
              />
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-green-deep to-green text-aff-cream-50 ring-2 ring-aff-gold-500/60 ring-offset-2 ring-offset-aff-ivory">
                <UserRound
                  className="h-5 w-5"
                  strokeWidth={1.7}
                  aria-hidden="true"
                />
              </span>
              <h1 className="mt-4 font-display text-[22px] font-semibold leading-tight text-aff-green-900">
                Complete your profile
              </h1>
              <p className="mt-3 font-sans text-[14px] leading-relaxed text-aff-muted">
                Add your phone number and country first so the Finasto team can
                reach you. You can then add your bank details to receive
                commissions.
              </p>
              <Link
                href="/stockist/settings"
                className="group mt-6 inline-flex h-11 touch-manipulation items-center justify-center gap-2 rounded-full border border-aff-gold-500/60 bg-gradient-to-br from-green-deep to-green px-6 font-sans text-[14px] font-medium text-aff-cream-50 shadow-[0_12px_28px_-12px_rgba(35,77,42,0.9)] transition-all duration-200 active:scale-[0.97] active:from-aff-green-800 active:to-aff-green-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aff-gold-600 [@media(hover:hover)]:hover:-translate-y-0.5 [@media(hover:hover)]:hover:from-aff-green-800 hover:to-aff-green-900"
              >
                Go to Settings
                <ArrowRight
                  className="h-4 w-4 text-aff-gold-300 transition-transform duration-200 group-active:translate-x-1"
                  strokeWidth={1.8}
                  aria-hidden="true"
                />
              </Link>
            </div>
          ) : (
            <>
              {!bankComplete && !pathname.startsWith("/stockist/settings") && (
                <div
                  role="status"
                  className="mb-4 flex flex-col gap-3 rounded-xl border border-aff-gold-500/50 bg-aff-ivory p-4 sm:mb-6 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-aff-gold-300 via-aff-gold-400 to-aff-gold-600 text-aff-green-950">
                      <Landmark
                        className="h-[18px] w-[18px]"
                        strokeWidth={1.8}
                        aria-hidden="true"
                      />
                    </span>
                    <div className="min-w-0">
                      <p className="font-sans text-[14px] font-semibold text-aff-green-900">
                        Add your bank details
                      </p>
                      <p className="mt-0.5 font-sans text-[13px] leading-relaxed text-aff-muted">
                       Finasto™ needs them to pay your commissions. You
                        can&apos;t request a payout until they are saved.
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/stockist/settings"
                    className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full border border-aff-gold-500/60 bg-gradient-to-br from-green-deep to-green px-5 font-sans text-[13px] font-medium text-aff-cream-50 transition-all active:scale-[0.97]"
                  >
                    Add bank details
                    <ArrowRight
                      className="h-4 w-4 text-aff-gold-300"
                      strokeWidth={1.8}
                      aria-hidden="true"
                    />
                  </Link>
                </div>
              )}
              {children}
            </>
          )}
        </main>
      </div>
    </div>
  );
}