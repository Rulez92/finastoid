"use client";

// Stockist announcements: a branded news feed with a timeline rail, grouped
// by date (Today / This week / Earlier). Every card is open, with text, an
// inline image gallery and PDF tiles. A card is marked as read after about 1
// second on screen. Images use the 1-hour signed links made on the server.

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  ImageOff,
  Megaphone,
  Paperclip,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { markPartnerAnnouncementRead } from "@/lib/partner/announcement-actions";
import type {
  PartnerAnnouncementView,
  PartnerFileView,
} from "@/lib/partner/announcement-queries";

// UTC so the server and the browser print the same text (no hydration mismatch).
const dateFmt = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const formatSize = (b: number) =>
  b >= 1024 * 1024
    ? `${(b / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(b / 1024))} KB`;

const isImage = (f: PartnerFileView) => f.mimeType.startsWith("image/");

type LightboxState = {
  images: { url: string; name: string }[];
  index: number;
} | null;

type Filter = "all" | "unread";

const DAY = 24 * 60 * 60 * 1000;

function relativeTime(iso: string, now: number): string {
  const diff = now - Date.parse(iso);
  const min = Math.floor(diff / 60000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min} min ago`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return dateFmt.format(new Date(iso));
}

function groupLabel(iso: string, now: number): string {
  const d = new Date(iso);
  const today = new Date(now);
  const sameDay =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  if (sameDay) return "Today";
  if (now - d.getTime() < 7 * DAY) return "This week";
  return "Earlier";
}

export function StockistAnnouncementsList({
  items,
}: {
  items: PartnerAnnouncementView[];
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [lightbox, setLightbox] = useState<LightboxState>(null);
  const [, startTransition] = useTransition();

  // Time-based labels depend on the viewer's clock and timezone, so they
  // render only after mount (avoids a hydration mismatch).
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => setNow(Date.now()), []);

  // Snapshot of what was unread at page load: the "Unread" filter uses it,
  // so a card does not vanish while it is being read.
  const [initialUnreadIds] = useState(
    () => new Set(items.filter((i) => !i.isRead).map((i) => i.id)),
  );
  const [readIds, setReadIds] = useState<Set<string>>(
    () => new Set(items.filter((i) => i.isRead).map((i) => i.id)),
  );
  const sentRef = useRef<Set<string>>(new Set(readIds));
  const feedRef = useRef<HTMLDivElement | null>(null);

  const unreadCount = items.filter((i) => !readIds.has(i.id)).length;
  const visible =
    filter === "unread"
      ? items.filter((i) => initialUnreadIds.has(i.id))
      : items;

  // Build groups (items are already newest first).
  const groups: { label: string | null; items: PartnerAnnouncementView[] }[] =
    [];
  for (const item of visible) {
    const label = now === null ? null : groupLabel(item.createdAt, now);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(item);
    else groups.push({ label, items: [item] });
  }

  const markRead = useCallback((id: string) => {
    if (sentRef.current.has(id)) return;
    sentRef.current.add(id);
    setReadIds((prev) => new Set(prev).add(id));
    startTransition(async () => {
      await markPartnerAnnouncementRead("stockist", id);
    });
  }, []);

  // Mark as read after a card has been visible for ~1 second.
  useEffect(() => {
    const root = feedRef.current;
    if (!root) return;

    const timers = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).dataset.announcementId;
          if (!id) continue;

          if (entry.isIntersecting) {
            if (sentRef.current.has(id) || timers.has(id)) continue;
            timers.set(
              id,
              window.setTimeout(() => {
                timers.delete(id);
                markRead(id);
              }, 1000),
            );
          } else {
            const t = timers.get(id);
            if (t) {
              window.clearTimeout(t);
              timers.delete(id);
            }
          }
        }
      },
      { threshold: 0.25 },
    );

    root
      .querySelectorAll<HTMLElement>("[data-announcement-id]")
      .forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [visible.length, filter, now, markRead]);

  function openLightbox(item: PartnerAnnouncementView, fileId: string) {
    const images = item.files
      .filter((f) => isImage(f) && f.url)
      .map((f) => ({ id: f.id, url: f.url as string, name: f.fileName }));
    const index = Math.max(
      0,
      images.findIndex((i) => i.id === fileId),
    );
    setLightbox({ images, index });
  }

  return (
    <section className="flex flex-col gap-6">
      {/* Hero header */}
      <header className="relative isolate overflow-hidden rounded-2xl bg-gradient-to-br from-aff-green-950 via-aff-green-900 to-aff-green-800 p-5 shadow-[0_18px_44px_-24px_rgba(3,24,7,0.6)] sm:p-7">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-aff-gold-300 to-transparent"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-aff-gold-300/10 blur-3xl"
        />

        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="flex min-w-0 items-center gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-aff-gold-300 via-aff-gold-400 to-aff-gold-600 text-aff-green-950 shadow-[0_8px_22px_-8px_rgba(241,204,156,0.7)]">
              <Megaphone className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h1 className="font-display text-[26px] leading-tight text-aff-gold-300 sm:text-[30px]">
                Announcements
              </h1>
              <p className="mt-1 font-sans text-[13px] leading-relaxed text-aff-cream-50/75">
                {items.length === 0
                  ? "News, updates and files from the Finasto™ team."
                  : `${unreadCount} New · ${items.length} Total `}
              </p>
            </div>
          </div>

          <div
            role="tablist"
            aria-label="Filter announcements"
            className="flex rounded-full border border-aff-gold-400/40 bg-aff-green-950/60 p-1"
          >
            {(
              [
                { key: "all", label: "All" },
                {
                  key: "unread",
                  label: unreadCount > 0 ? `Unread (${unreadCount})` : "Unread",
                },
              ] as { key: Filter; label: string }[]
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={filter === tab.key}
                onClick={() => setFilter(tab.key)}
                className={cn(
                  "cursor-pointer rounded-full px-4 py-1.5 font-sans text-[13px] transition-colors",
                  filter === tab.key
                    ? "bg-aff-gold-300 font-medium text-aff-green-950"
                    : "text-aff-gold-300 hover:bg-aff-green-800",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Empty state */}
      {visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-aff-border bg-white px-6 py-16 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-aff-green-950/90 ring-1 ring-aff-gold-500/40 shadow-[0_0_20px_rgba(34,197,94,0.45)]">
            <Bell
              className="h-7 w-7 text-cream"
              strokeWidth={1.4}
              aria-hidden="true"
            />
          </span>
          <p className="mt-4 font-display text-[20px] text-aff-green-900">
            {filter === "unread" ? "You're all caught up" : "No announcements yet"}
          </p>
          <p className="mt-1 max-w-xs font-sans text-[13px] leading-relaxed text-aff-muted">
            {filter === "unread"
              ? "Nothing new since your last visit."
              : "When the Finasto™ team shares something, it will appear here."}
          </p>
        </div>
      ) : (
        <div ref={feedRef} className="relative pl-6 sm:pl-9">
          {/* Timeline rail */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute bottom-2 left-[7px] top-2 w-px bg-gradient-to-b from-aff-gold-500/60 via-aff-border to-transparent sm:left-[11px]"
          />

          <div className="flex flex-col gap-8">
            {groups.map((group, gi) => (
              <div key={`${group.label}-${gi}`} className="flex flex-col gap-5">
                {group.label && (
                  <div className="relative">
                    <span
                      aria-hidden="true"
                      className="absolute -left-6 top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full border-2 border-aff-gold-500 bg-green sm:-left-9 sm:ml-[4px]"
                    />
                    <span className="inline-block rounded-full border border-aff-border bg-aff-green-950/90 px-3 py-1 font-sans text-[11px]  tracking-[0.16em] text-cream">
                      {group.label}
                    </span>
                  </div>
                )}

                {group.items.map((item) => {
                  const isNew = !readIds.has(item.id);
                  const images = item.files.filter(isImage);
                  const docs = item.files.filter((f) => !isImage(f));

                  return (
                    <article
                      key={item.id}
                      data-announcement-id={item.id}
                      className={cn(
                        "relative overflow-hidden rounded-2xl border bg-white shadow-[0_12px_34px_-20px_rgba(3,24,7,0.4)] transition-shadow hover:shadow-[0_16px_40px_-18px_rgba(3,24,7,0.45)]",
                        isNew ? "border-aff-gold-500" : "border-aff-border",
                      )}
                    >
                      {/* Timeline dot */}
                      <span
                        aria-hidden="true"
                        className={cn(
                          "absolute -left-[1px] top-[26px] hidden h-0 w-0",
                        )}
                      />
                      {/* Gold accent bar on unread cards */}
                      {isNew && (
                        <span
                          aria-hidden="true"
                          className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-aff-gold-300 via-aff-gold-500 to-aff-gold-600"
                        />
                      )}

                      {/* Card header */}
                      <div className="flex items-start justify-between gap-3 border-b border-aff-border bg-aff-ivory/60 px-5 py-4 sm:px-7 sm:py-5">
                        <div className="min-w-0">
                          <h2 className="font-display text-[21px] font-semibold leading-snug tracking-tight text-aff-green-900 sm:text-[23px]">
                            {item.title}
                          </h2>
                          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 font-sans text-[12px] text-aff-muted">
                            <span>{dateFmt.format(new Date(item.createdAt))}</span>
                            {now !== null && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span>{relativeTime(item.createdAt, now)}</span>
                              </>
                            )}
                            {item.files.length > 0 && (
                              <span className="inline-flex items-center gap-1 rounded-full border border-aff-border bg-white px-2 py-0.5">
                                <Paperclip
                                  className="h-3 w-3"
                                  strokeWidth={1.8}
                                  aria-hidden="true"
                                />
                                {item.files.length} file
                                {item.files.length === 1 ? "" : "s"}
                              </span>
                            )}
                          </div>
                        </div>
                        {isNew && (
                          <span className="shrink-0 rounded-full bg-aff-green-900 px-2.5 py-1 font-sans text-[11px] font-medium text-aff-gold-300 shadow-sm">
                            New
                          </span>
                        )}
                      </div>

                      {/* Card body */}
                      <div className="flex flex-col gap-5 px-5 py-5 sm:px-7 sm:py-6">
                        {item.body && (
                          <p className="max-w-[68ch] whitespace-pre-wrap break-words font-sans text-[15px] leading-[1.75] text-aff-green-900/90">
                            {item.body}
                          </p>
                        )}

                        {/* Inline image gallery */}
                        {images.length > 0 && (
                          <div
                            className={cn(
                              "grid gap-2.5",
                              images.length === 1 ? "grid-cols-1" : "grid-cols-2",
                            )}
                          >
                            {images.map((f, idx) =>
                              f.url ? (
                                <button
                                  key={f.id}
                                  type="button"
                                  onClick={() => openLightbox(item, f.id)}
                                  aria-label={`View ${f.fileName}`}
                                  className={cn(
                                    "group relative cursor-zoom-in overflow-hidden rounded-xl border border-aff-border bg-aff-ivory shadow-sm",
                                    images.length === 1
                                      ? "aspect-[16/9]"
                                      : "aspect-[4/3]",
                                    images.length === 3 &&
                                      idx === 0 &&
                                      "col-span-2",
                                  )}
                                >
                                  {/* Plain <img>: signed URLs change on every
                                      request, so next/image caching won't help. */}
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={f.url}
                                    alt={f.fileName}
                                    loading="lazy"
                                    decoding="async"
                                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                                  />
                                  <span
                                    aria-hidden="true"
                                    className="pointer-events-none absolute inset-0 bg-gradient-to-t from-aff-green-950/25 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                                  />
                                </button>
                              ) : (
                                <div
                                  key={f.id}
                                  className="flex aspect-[4/3] flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-aff-border bg-aff-ivory text-aff-muted"
                                >
                                  <ImageOff className="h-5 w-5" strokeWidth={1.4} />
                                  <span className="font-sans text-[12px]">
                                    Refresh to load image
                                  </span>
                                </div>
                              ),
                            )}
                          </div>
                        )}

                        {/* PDF tiles */}
                        {docs.length > 0 && (
                          <ul className="grid gap-2.5 sm:grid-cols-2">
                            {docs.map((f) => (
                              <li key={f.id}>
                                {f.url ? (
                                  <a
                                    href={f.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group flex items-center gap-3 rounded-xl border border-aff-border bg-aff-ivory p-3 transition-all hover:border-aff-gold-500 hover:bg-white hover:shadow-sm"
                                  >
                                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-aff-green-900 text-aff-gold-300">
                                      <FileText
                                        className="h-5 w-5"
                                        strokeWidth={1.6}
                                        aria-hidden="true"
                                      />
                                    </span>
                                    <span className="min-w-0 flex-1">
                                      <span className="block truncate font-sans text-[13px] font-medium text-aff-green-900">
                                        {f.fileName}
                                      </span>
                                      <span className="block font-sans text-[11px] text-aff-muted">
                                        PDF · {formatSize(f.sizeBytes)}
                                      </span>
                                    </span>
                                    <Download
                                      className="h-4 w-4 shrink-0 text-aff-gold-600 transition-transform group-hover:translate-y-0.5"
                                      strokeWidth={1.8}
                                      aria-hidden="true"
                                    />
                                  </a>
                                ) : (
                                  <span className="font-sans text-[13px] text-aff-muted">
                                    {f.fileName} (link unavailable, refresh the
                                    page)
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {lightbox && <Lightbox state={lightbox} onChange={setLightbox} />}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Lightbox                                                             */
/* ------------------------------------------------------------------ */

function Lightbox({
  state,
  onChange,
}: {
  state: NonNullable<LightboxState>;
  onChange: (s: LightboxState) => void;
}) {
  const { images, index } = state;
  const total = images.length;
  const current = images[index];

  const go = useCallback(
    (delta: number) => {
      onChange({ images, index: (index + delta + total) % total });
    },
    [images, index, total, onChange],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onChange(null);
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    }
    window.addEventListener("keydown", onKey);

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [go, onChange]);

  if (!current) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={current.name}
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-aff-green-950/90 p-4 backdrop-blur-sm"
      onClick={() => onChange(null)}
    >
      <button
        type="button"
        onClick={() => onChange(null)}
        aria-label="Close"
        className="absolute right-4 top-4 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-aff-green-900 text-aff-gold-300 transition-colors hover:bg-aff-green-800"
      >
        <X className="h-5 w-5" />
      </button>

      {total > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              go(-1);
            }}
            aria-label="Previous image"
            className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-aff-green-900 text-aff-gold-300 transition-colors hover:bg-aff-green-800 sm:left-6"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              go(1);
            }}
            aria-label="Next image"
            className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-aff-green-900 text-aff-gold-300 transition-colors hover:bg-aff-green-800 sm:right-6"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      <figure
        className="flex max-h-full max-w-full flex-col items-center gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current.url}
          alt={current.name}
          className="max-h-[80vh] max-w-full rounded-xl object-contain shadow-2xl"
        />
        <figcaption className="font-sans text-[13px] text-aff-cream-50/80">
          {current.name}
          {total > 1 && ` · ${index + 1} / ${total}`}
        </figcaption>
      </figure>
    </div>
  );
}