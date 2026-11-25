"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, message } from "antd";
import { Camera, Loader2, Trash2 } from "lucide-react";
import {
  removeMyStockistAvatar,
  uploadMyStockistAvatar,
} from "@/lib/stockist/settings-actions";

// Identity strip with the profile photo. Clicking the photo opens the file
// picker; the small bin button removes it. The browser checks type and size
// only for convenience, the server action checks the real file again.

export function StockistPhotoCard({
  name,
  email,
  avatarUrl,
}: {
  name: string | null;
  email: string;
  avatarUrl: string | null;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);

  async function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow picking the same file again
    if (!file) return;

    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      message.error("Only PNG, JPG or WebP images are allowed.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      message.error("The image must be 2 MB or smaller.");
      return;
    }

    setBusy(true);
    const fd = new FormData();
    fd.append("avatar", file);
    const res = await uploadMyStockistAvatar(fd);
    setBusy(false);

    if (res.success) {
      message.success("Photo updated");
      router.refresh();
    } else {
      message.error(res.error);
    }
  }

  async function handleRemove() {
    setBusy(true);
    const res = await removeMyStockistAvatar();
    setBusy(false);

    if (res.success) {
      message.success("Photo removed");
      router.refresh();
    } else {
      message.error(res.error);
    }
  }

  const initials = (name || email || "S").trim().slice(0, 2).toUpperCase();

  return (
    <Card className="aff-card aff-antd-card overflow-hidden" bordered={false}>
      <div className="relative flex items-center gap-4 overflow-hidden rounded-xl bg-gradient-to-br from-aff-green-950 via-aff-green-900 to-aff-green-800 p-4">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-aff-gold-300 to-transparent"
        />

        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            aria-label="Change profile photo"
            className="group relative flex h-16 w-16 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-aff-ivory font-sans text-[16px] font-semibold text-aff-green-900 ring-2 ring-aff-gold-500/70 transition-shadow hover:ring-aff-gold-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aff-gold-300 disabled:cursor-wait"
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt="Your profile photo"
                className="h-full w-full object-cover"
              />
            ) : (
              initials
            )}
            <span className="absolute inset-0 flex items-center justify-center bg-aff-green-950/55 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
              {busy ? (
                <Loader2 className="h-5 w-5 animate-spin text-aff-gold-300" />
              ) : (
                <Camera
                  className="h-5 w-5 text-aff-gold-300"
                  strokeWidth={1.8}
                />
              )}
            </span>
          </button>

          {avatarUrl && !busy && (
            <button
              type="button"
              onClick={handleRemove}
              aria-label="Remove profile photo"
              className="absolute -bottom-1 -right-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-aff-gold-500/60 bg-aff-green-950 text-aff-gold-300 transition-colors hover:bg-aff-gold-300 hover:text-aff-green-950"
            >
              <Trash2 className="h-3 w-3" strokeWidth={1.8} />
            </button>
          )}

          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handlePick}
            className="hidden"
          />
        </div>

        <div className="min-w-0">
          <p className="truncate font-display text-[18px] leading-tight text-aff-gold-300">
            {name || "Stockist"}
          </p>
          <p className="truncate font-sans text-[12px] text-aff-cream-50/75">
            {email}
          </p>
          <p className="mt-1 font-sans text-[11px] text-aff-cream-50/60">
            PNG, JPG or WebP, up to 2 MB
          </p>
        </div>
      </div>
    </Card>
  );
}