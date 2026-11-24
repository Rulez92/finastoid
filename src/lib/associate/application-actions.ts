"use server";

// Server Actions for the PUBLIC associate application pages (/apply and the
// applicant's private tracking page). There is no login here, so there is no
// requireRole(): the applicant's tracking token is the key, and the database
// functions (submit_associate_application, cancel_my_application,
// submit_application_payment_proof) decide what that token may do.
//
// Each action:
//   1. validates its input (zod, plus a real file check for the proof),
//   2. calls a database function with the cookie-based client (anon),
//   3. never sends a price, a rate or a status: the database copies the
//      package price and commission from associate_packages itself.
//
// The database functions raise short, plain-English messages ("An
// application for this email is already in progress ..."), which are shown
// as they are. Any other database error is logged and replaced by a generic
// message, so internals never leak. Tokens are never logged.
//
// Proof upload: visitors have no storage access, so after the token is
// verified and the file's real type is checked from its first bytes, the file
// goes to the private "associate-proofs" bucket under
//   <application_id>/<random name>.<ext>
// using the service-role client. That is the ONLY use of the service role in
// this file. If recording the proof then fails, the file is removed again.
//
// NOTE: uploads go through a Server Action, whose request size is limited to
// 1 MB by default. Proofs can be up to 5 MB, so next.config needs
//   experimental: { serverActions: { bodySizeLimit: "6mb" } }
// (the stockist bulk-orders upload already needs the same setting).

import { randomUUID } from "node:crypto";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  formatApplicationNumber,
  getMyApplication,
  isValidTrackingToken,
} from "@/lib/associate/application-queries";

/* ------------------------------------------------------------------ */
/* Types and validation                                                 */
/* ------------------------------------------------------------------ */

export type SubmitApplicationResult =
  | {
      success: true;
      applicationNumber: number;
      displayNumber: string; // "AP-000123"
      // Shown to the applicant ONCE, as their private link:
      //   /apply/status?t=<trackingToken>
      trackingToken: string;
    }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

export type SimpleResult =
  | { success: true }
  | { success: false; error: string };

// An empty string is allowed (the form sends "" for a blank optional field);
// anything else must fit the length rule.
const submitSchema = z.object({
  packageCode: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9][a-z0-9_-]{1,39}$/, "Choose a package"),
  name: z
    .string()
    .trim()
    .min(2, "Enter your name")
    .max(100, "Keep your name under 100 characters"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Enter your email")
    .max(254, "That email is too long")
    .email("Enter a valid email address"),
  phone: z
    .string()
    .trim()
    .regex(/^(.{7,30})?$/, "Enter a valid phone number")
    .nullish(),
  country: z.string().trim().max(60, "Keep it under 60 characters").nullish(),
  note: z.string().trim().max(500, "Keep the note under 500 characters").nullish(),
  // Where the link was shared, from /apply?src=whatsapp. Reporting only: a
  // bad value is dropped, never an error. (Not "ref": that parameter is
  // reserved for affiliate referral links in your middleware.)
  source: z.string().trim().toLowerCase().max(40).nullish(),
  // Honeypot: a real visitor never sees or fills this field.
  website: z.string().max(200).nullish(),
});

export type SubmitApplicationInput = z.input<typeof submitSchema>;

const referenceSchema = z.string().trim().max(100);

// Postgres code for "raise exception" inside our functions.
const RAISE_EXCEPTION = "P0001";

const INVALID_LINK = "This link is not valid.";

/* ------------------------------------------------------------------ */
/* Submit an application                                                */
/* ------------------------------------------------------------------ */

export async function submitApplication(
  input: SubmitApplicationInput,
): Promise<SubmitApplicationResult> {
  const parsed = submitSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      (fieldErrors[key] ??= []).push(issue.message);
    }
    return {
      success: false,
      error: "Please fix the highlighted fields.",
      fieldErrors,
    };
  }
  const d = parsed.data;

  // A bot filled the hidden field. Fail quietly, with no hint why.
  if (d.website && d.website.trim() !== "") {
    return {
      success: false,
      error: "Could not send your application. Please try again.",
    };
  }

  const source =
    d.source && /^[a-z0-9_-]{1,40}$/.test(d.source) ? d.source : null;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_associate_application", {
    p_package_code: d.packageCode,
    p_name: d.name,
    p_email: d.email,
    p_phone: d.phone || null,
    p_country: d.country || null,
    p_note: d.note || null,
    p_source: source,
  });

  if (error) {
    if (error.code === RAISE_EXCEPTION) {
      return { success: false, error: error.message };
    }
    console.error("[associate] submit failed:", error.code, error.message);
    return {
      success: false,
      error: "Could not send your application. Please try again.",
    };
  }

  // The function returns one row: application_id, application_number,
  // tracking_token.
  const row = (Array.isArray(data) ? data[0] : data) as {
    application_number?: number | string;
    tracking_token?: string;
  } | null;

  const number = Number(row?.application_number);
  const token = row?.tracking_token;
  if (!row || !Number.isFinite(number) || !isValidTrackingToken(token)) {
    console.error("[associate] submit returned an unexpected result");
    return {
      success: false,
      error: "Could not send your application. Please try again.",
    };
  }

  // The admin sees the new application in their list.
  revalidatePath("/admin/associate-applications");

  return {
    success: true,
    applicationNumber: number,
    displayNumber: formatApplicationNumber(number),
    trackingToken: token,
  };
}

/* ------------------------------------------------------------------ */
/* Cancel (only before the admin has sent bank details)                */
/* ------------------------------------------------------------------ */

export async function cancelMyApplication(token: string): Promise<SimpleResult> {
  if (!isValidTrackingToken(token)) {
    return { success: false, error: INVALID_LINK };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_my_application", {
    p_token: token,
  });

  if (error) {
    if (error.code === RAISE_EXCEPTION) {
      return { success: false, error: error.message };
    }
    console.error("[associate] cancel failed:", error.code, error.message);
    return {
      success: false,
      error: "Could not cancel your application. Please try again.",
    };
  }

  revalidatePath("/apply/status");
  revalidatePath("/admin/associate-applications");
  return { success: true };
}

/* ------------------------------------------------------------------ */
/* Proof of payment                                                     */
/* ------------------------------------------------------------------ */

const PROOF_BUCKET = "associate-proofs"; // the bucket enforces 5 MB too
const MAX_PROOF_BYTES = 5 * 1024 * 1024;

type ProofType = { contentType: string; ext: string };

// Look at the file's first bytes. Returns null for anything that is not a
// JPEG, PNG, WebP or PDF, whatever the file is called.
function sniffProofType(head: Uint8Array): ProofType | null {
  const startsWith = (...bytes: number[]) =>
    bytes.every((b, i) => head[i] === b);

  if (startsWith(0xff, 0xd8, 0xff)) {
    return { contentType: "image/jpeg", ext: "jpg" };
  }
  if (startsWith(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) {
    return { contentType: "image/png", ext: "png" };
  }
  if (startsWith(0x25, 0x50, 0x44, 0x46)) {
    return { contentType: "application/pdf", ext: "pdf" };
  }
  // WebP: "RIFF" + 4 size bytes + "WEBP"
  if (
    startsWith(0x52, 0x49, 0x46, 0x46) &&
    head[8] === 0x57 &&
    head[9] === 0x45 &&
    head[10] === 0x42 &&
    head[11] === 0x50
  ) {
    return { contentType: "image/webp", ext: "webp" };
  }
  return null;
}

// FormData fields: token, reference (optional), file.
export async function submitApplicationPaymentProof(
  formData: FormData,
): Promise<SimpleResult> {
  const token = formData.get("token");
  if (!isValidTrackingToken(token)) {
    return { success: false, error: INVALID_LINK };
  }

  const referenceRaw = formData.get("reference");
  const reference = referenceSchema.safeParse(
    typeof referenceRaw === "string" ? referenceRaw : "",
  );
  if (!reference.success) {
    return {
      success: false,
      error: "The payment reference is too long (100 characters at most).",
    };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: "Choose the proof of payment to upload." };
  }
  if (file.size > MAX_PROOF_BYTES) {
    return { success: false, error: "The file is too large (5 MB at most)." };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffProofType(bytes.subarray(0, 12));
  if (!type) {
    return { success: false, error: "Upload a JPG, PNG, WebP or PDF file." };
  }

  // Check the application BEFORE uploading, so a wrong state never leaves a
  // stray file behind. This also proves the token is real.
  let application;
  try {
    application = await getMyApplication(token);
  } catch {
    return {
      success: false,
      error: "Could not load your application. Please try again.",
    };
  }
  if (!application) return { success: false, error: INVALID_LINK };
  if (application.status !== "awaiting_payment") {
    return {
      success: false,
      error: "Payment proof cannot be added to this application right now.",
    };
  }

  // The file name is chosen HERE, never by the browser.
  const path = `${application.id}/${randomUUID()}.${type.ext}`;

  const admin = createAdminClient();
  const { error: uploadError } = await admin.storage
    .from(PROOF_BUCKET)
    .upload(path, bytes, { contentType: type.contentType, upsert: false });
  if (uploadError) {
    console.error("[associate] proof upload failed:", uploadError.message);
    return {
      success: false,
      error: "Could not upload the file. Please try again.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_application_payment_proof", {
    p_token: token,
    p_storage_path: path,
    p_reference: reference.data || null,
  });

  if (error) {
    // Do not leave an unattached file behind.
    await admin.storage.from(PROOF_BUCKET).remove([path]);
    if (error.code === RAISE_EXCEPTION) {
      return { success: false, error: error.message };
    }
    console.error("[associate] proof save failed:", error.code, error.message);
    return {
      success: false,
      error: "Could not save your payment proof. Please try again.",
    };
  }

  revalidatePath("/apply/status");
  revalidatePath("/admin/associate-applications");
  return { success: true };
}