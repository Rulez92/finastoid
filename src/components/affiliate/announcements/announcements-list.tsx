"use client";

// Affiliate announcements list. Opening a card marks it as read.
// Files open through short-lived signed links created on the server.

import { useState, useTransition } from "react";
import { Bell, ChevronDown, FileText, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { markPartnerAnnouncementRead } from "@/lib/partner/announcement-actions";
import type { PartnerAnnouncementView } from "@/lib/partner/announcement-queries";

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

export function AnnouncementsList({
  items,
}: {
  items: PartnerAnnouncementView[];
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [readIds, setReadIds] = useState<Set<string>>(
    () => new Set(items.filter((i) => i.isRead).map((i) => i.id)),
  );
  const [, startTransition] = useTransition();

  const unread = items.filter((i) => !readIds.has(i.id)).length;

  function toggle(item: PartnerAnnouncementView) {
    const opening = openId !== item.id;
    setOpenId(opening ? item.id : null);

    if (opening && !readIds.has(item.id)) {
      setReadIds((prev) => new Set(prev).add(item.id)); // instant "New" removal
      startTransition(async () => {
        await markPartnerAnnouncementRead("affiliate", item.id);
      });
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <header className="relative isolate overflow-hidden rounded-2xl bg-gradient-to-br from-aff-green-950 via-aff-green-900 to-aff-green-800 p-5 sm:p-6">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-aff-gold-300 to-transparent"
        />
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-display text-[25px] leading-tight text-aff-gold-300">
              Announcements
            </h1>
            <p className="mt-1 font-sans text-[13px] leading-relaxed text-aff-cream-50/75">
              News, updates and files shared by the Finasto™ team.
            </p>
          </div>
          {unread > 0 && (
            <span className="shrink-0 rounded-full border border-aff-gold-400/40 bg-aff-green-950/60 px-3 py-1 font-sans text-[12px] text-aff-gold-300">
              {unread} new
            </span>
          )}
        </div>
      </header>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-aff-border bg-white py-16 text-center">
          <Bell
            className="h-6 w-6 text-aff-muted"
            strokeWidth={1.4}
            aria-hidden="true"
          />
          <p className="mt-3 font-sans text-[14px] text-aff-green-900">
            No announcements yet
          </p>
          <p className="mt-1 max-w-xs font-sans text-[13px] text-aff-muted">
            When the Finasto™ team shares something, it will appear here.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item) => {
            const isOpen = openId === item.id;
            const isNew = !readIds.has(item.id);

            return (
              <li
                key={item.id}
                className={cn(
                  "overflow-hidden rounded-2xl border bg-white transition-colors",
                  isNew ? "border-aff-gold-500" : "border-aff-border",
                )}
              >
                <button
                  type="button"
                  onClick={() => toggle(item)}
                  aria-expanded={isOpen}
                  className="flex w-full cursor-pointer items-start justify-between gap-3 bg-aff-ivory/60 p-4 text-left sm:px-6"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-[18px] leading-snug text-aff-green-900">
                        {item.title}
                      </h2>
                      {isNew && (
                        <span className="rounded-full bg-aff-green-900 px-2 py-0.5 font-sans text-[11px] font-medium text-aff-gold-300">
                          New
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 font-sans text-[12px] text-aff-muted">
                      {dateFmt.format(new Date(item.createdAt))}
                      {item.files.length > 0 &&
                        ` · ${item.files.length} file${item.files.length === 1 ? "" : "s"}`}
                    </p>
                  </div>
                  <ChevronDown
                    className={cn(
                      "mt-1 h-4 w-4 shrink-0 text-aff-green-900 transition-transform",
                      isOpen && "rotate-180",
                    )}
                    aria-hidden="true"
                  />
                </button>

                {isOpen && (
                  <div className="border-t border-aff-border p-4 sm:px-6">
                    {item.body && (
                      <p className="whitespace-pre-wrap break-words font-sans text-[14px] leading-relaxed text-aff-green-900">
                        {item.body}
                      </p>
                    )}

                    {item.files.length > 0 && (
                      <ul className={cn("flex flex-col gap-2", item.body && "mt-4")}>
                        {item.files.map((f) => {
                          const Icon =
                            f.mimeType === "application/pdf"
                              ? FileText
                              : ImageIcon;
                          return (
                            <li key={f.id}>
                              {f.url ? (
                                <a
                                  href={f.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-3 rounded-xl border border-aff-border bg-aff-ivory px-3 py-2 font-sans text-[13px] text-aff-green-900 transition-colors hover:border-aff-gold-500"
                                >
                                  <Icon
                                    className="h-4 w-4 shrink-0"
                                    strokeWidth={1.6}
                                    aria-hidden="true"
                                  />
                                  <span className="min-w-0 flex-1 truncate">
                                    {f.fileName}
                                  </span>
                                  <span className="shrink-0 text-aff-muted">
                                    {formatSize(f.sizeBytes)}
                                  </span>
                                </a>
                              ) : (
                                <span className="font-sans text-[13px] text-aff-muted">
                                  {f.fileName} (link unavailable, refresh the page)
                                </span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}