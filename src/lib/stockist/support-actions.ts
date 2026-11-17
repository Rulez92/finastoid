"use server";

// Save as: lib/stockist/support-actions.ts
// Same flow as the affiliate action, but for the stockist role. The name
// comes from the existing getMyStockistProfile() read, so no new query.

import { requireRole } from "@/lib/auth/server";
import { getMyStockistProfile } from "@/lib/stockist/settings-queries";

export type SupportState = {
  ok: boolean;
  error?: string;
  fieldErrors?: { subject?: string; message?: string };
  values?: { subject: string; message: string };
};

export async function submitSupportRequest(
  _prev: SupportState,
  formData: FormData,
): Promise<SupportState> {
  // Identity comes from the session, never from the form.
  const { user } = await requireRole("stockist");

  // Honeypot filled: pretend success, send nothing.
  if (String(formData.get("website") ?? "").trim() !== "") {
    return { ok: true };
  }

  const subject = String(formData.get("subject") ?? "")
    .replace(/[\r\n]+/g, " ")
    .trim();
  const message = String(formData.get("message") ?? "").trim();
  const values = { subject, message };

  const fieldErrors: NonNullable<SupportState["fieldErrors"]> = {};
  if (subject.length < 3) fieldErrors.subject = "Enter a short subject";
  if (subject.length > 120) fieldErrors.subject = "Keep it under 120 characters";
  if (message.length < 10) fieldErrors.message = "Write at least 10 characters";
  if (message.length > 2000) fieldErrors.message = "Keep it under 2000 characters";
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors, values };
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.SUPPORT_FROM_EMAIL;
  const to = process.env.SUPPORT_TO_EMAIL;
  if (!apiKey || !from || !to) {
    console.error("Support email is not configured (RESEND_API_KEY, SUPPORT_*).");
    return {
      ok: false,
      error: "Email is not available right now. Please try WhatsApp.",
      values,
    };
  }

  const profile = await getMyStockistProfile();

  const body = [
    `From: ${profile?.name ?? "Unknown"} <${user.email}>`,
    `Role: Stockist`,
    `Country: ${profile?.country ?? "-"}`,
    "",
    message,
  ].join("\n");

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: user.email,
        subject: `[Stockist support] ${subject}`,
        text: body,
      }),
    });

    if (!res.ok) {
      console.error("Resend error:", res.status, await res.text());
      return {
        ok: false,
        error: "We could not send your message. Please try again.",
        values,
      };
    }
  } catch (err) {
    console.error("Support email failed:", err);
    return { ok: false, error: "Network problem. Please try again.", values };
  }

  return { ok: true };
}