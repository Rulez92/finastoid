// Server-side reads for the PUBLIC associate application pages (/apply and
// the applicant's private tracking page). Import only from server
// components and server actions. Client files may import the TYPES and
// formatApplicationNumber below, which are plain and safe.
//
// There is no login here, so there is no requireRole(). The applicant's
// tracking token IS the key:
//   * packages come from list_public_packages() (active packages only),
//   * an application is read through get_my_application(token), which
//     returns only that one application, and only shows the bank details
//     once the admin has sent them.
// The token is never logged, never stored and never sent anywhere but the
// database function.

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

// All amounts are USD.
export type PublicPackage = {
  code: string; // 'mobile', 'signature', ...
  name: string;
  description: string | null;
  priceUsd: number;
  commissionPercent: number;
};

export type ApplicationStatus =
  | "requested" // submitted, waiting for the admin
  | "awaiting_payment" // admin sent bank details, applicant must pay
  | "payment_submitted" // proof uploaded, waiting for the admin
  | "approved" // paid, associate account created
  | "rejected" // admin declined the application
  | "cancelled";

export type MyApplication = {
  id: string;
  number: number;
  displayNumber: string; // "AP-000123"
  status: ApplicationStatus;
  packageName: string;
  priceUsd: number;
  commissionPercent: number;
  applicantName: string;
  adminNote: string | null;
  // Only filled once the admin has sent them.
  bankDetails: string | null;
  hasProof: boolean;
  paymentReference: string | null;
  createdAt: string;
  quotedAt: string | null;
  proofSubmittedAt: string | null;
  decidedAt: string | null;
};

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export function formatApplicationNumber(n: number): string {
  return `AP-${String(n).padStart(6, "0")}`;
}

// The database makes the token from two UUIDs without dashes: 64 lowercase
// hex characters. Anything else cannot be a real token, so it is rejected
// here without touching the database.
const tokenSchema = z.string().regex(/^[0-9a-f]{64}$/);

export function isValidTrackingToken(token: unknown): token is string {
  return tokenSchema.safeParse(token).success;
}

// PGRST202 / 42883 = function missing (File 1 / File 2 not run yet).
const MISSING_CODES = new Set(["PGRST202", "42883"]);

type RawPackage = {
  code: string;
  name: string;
  description: string | null;
  price_usd: number | string;
  commission_percent: number | string;
};

type RawApplication = {
  id: string;
  number: number | string;
  status: ApplicationStatus;
  package_name: string;
  price_usd: number | string;
  commission_percent: number | string;
  applicant_name: string;
  admin_note: string | null;
  bank_details: string | null;
  has_proof: boolean;
  payment_reference: string | null;
  created_at: string;
  quoted_at: string | null;
  proof_submitted_at: string | null;
  decided_at: string | null;
};

/* ------------------------------------------------------------------ */
/* Packages (for the apply form)                                       */
/* ------------------------------------------------------------------ */

export async function getPublicPackages(): Promise<PublicPackage[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_public_packages");

  if (error) {
    if (error.code && MISSING_CODES.has(error.code)) return [];
    console.error("[associate] packages failed:", error.code, error.message);
    throw new Error("Could not load the packages. Please try again.");
  }

  return ((data ?? []) as RawPackage[]).map((p) => ({
    code: p.code,
    name: p.name,
    description: p.description,
    priceUsd: num(p.price_usd),
    commissionPercent: num(p.commission_percent),
  }));
}

/* ------------------------------------------------------------------ */
/* One application, found by its private token                         */
/* ------------------------------------------------------------------ */

// Returns null for a malformed or unknown token (the page shows the same
// "link not valid" message for both, so nothing about which tokens exist
// can be learned).
export async function getMyApplication(
  token: string,
): Promise<MyApplication | null> {
  if (!isValidTrackingToken(token)) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_my_application", {
    p_token: token,
  });

  if (error) {
    if (error.code && MISSING_CODES.has(error.code)) return null;
    console.error("[associate] application failed:", error.code, error.message);
    throw new Error("Could not load your application. Please try again.");
  }

  const raw = data as RawApplication | null;
  if (!raw) return null;

  return {
    id: raw.id,
    number: num(raw.number),
    displayNumber: formatApplicationNumber(num(raw.number)),
    status: raw.status,
    packageName: raw.package_name,
    priceUsd: num(raw.price_usd),
    commissionPercent: num(raw.commission_percent),
    applicantName: raw.applicant_name,
    adminNote: raw.admin_note,
    bankDetails: raw.bank_details,
    hasProof: !!raw.has_proof,
    paymentReference: raw.payment_reference,
    createdAt: raw.created_at,
    quotedAt: raw.quoted_at,
    proofSubmittedAt: raw.proof_submitted_at,
    decidedAt: raw.decided_at,
  };
}