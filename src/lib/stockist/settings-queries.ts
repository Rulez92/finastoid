// Server-side read for the stockist Settings page. Import only from server
// components and server actions, never from a "use client" file (client
// files may import the TYPE below, which is erased at build).
//
// The stockist has no direct access to the stockists table. The record is
// read through my_stockist_profile(), a database function that returns the
// caller's own safe columns only (never the admin-only notes or the login
// link). The browser never sends an id.

import { requireRole } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";

export type StockistProfile = {
  id: string;
  name: string;
  email: string; // login identity, shown read-only
  phone: string | null;
  country: string | null;
  region: string | null;
   status: string;
  tierName: string; // set by the admin, shown read-only
  purchaseAmount: number;
  commissionPercent: number;
  avatarUrl: string | null; // short-lived signed link, null = no photo
  bank: MyBankDetails | null; // null until the stockist saves them
  countries: string[]; // suggestions for the bank country field
};

// Bank details exactly as saved. The stockist sees and can edit their own
// full account number.
export type MyBankDetails = {
  accountHolderName: string;
  bankName: string;
  bankCountry: string;
  accountNumber: string;
  swiftBic: string | null;
  routingCode: string | null;
  payoutCurrency: string;
};

type RawProfile = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  country: string | null;
  region: string | null;
  status: string;
  tier_name: string;
  purchase_amount: number | string | null;
  commission_percent: number | string | null;
  avatar_path: string | null;
};

type BankRow = {
  account_holder_name: string;
  bank_name: string;
  bank_country: string;
  account_number_or_iban: string;
  swift_bic: string | null;
  routing_code: string | null;
  payout_currency: string;
};

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// Returns null when the login has no stockist row (the layout normally
// blocks that first, so this is only a safety net).
export async function getMyStockistProfile(): Promise<StockistProfile | null> {
  await requireRole("stockist");
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("my_stockist_profile");
  if (error) {
    throw new Error(`Failed to load your profile: ${error.message}`);
  }

  // A function that returns a table comes back as a list of rows.
  const row = (data as RawProfile[] | null)?.[0];
  if (!row) return null;

   // Bank details, country suggestions and the photo link are independent
  // reads, so run them together.
  const [bankResult, countriesResult, signedAvatar] = await Promise.all([
    supabase
      .from("stockist_bank_details")
      .select(
        "account_holder_name, bank_name, bank_country, account_number_or_iban, swift_bic, routing_code, payout_currency",
      )
      .eq("stockist_id", row.id)
      .maybeSingle(),
    supabase.from("countries").select("name").eq("active", true).order("name"),
    // The bucket is private: make a 1-hour signed link.
    row.avatar_path
      ? supabase.storage
          .from("stockist-avatars")
          .createSignedUrl(row.avatar_path, 60 * 60)
      : Promise.resolve(null),
  ]);

  if (bankResult.error) {
    throw new Error(`Failed to load bank details: ${bankResult.error.message}`);
  }
  const bank = bankResult.data as BankRow | null;

  // If the countries table can't be read, the form falls back to typing the
  // country by hand, so this never fails the page. Same for the photo link.
  const countries = (countriesResult.data ?? [])
    .map((c) => c.name as string)
    .filter(Boolean);

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    country: row.country,
    region: row.region,
    status: row.status,
    tierName: row.tier_name,
    purchaseAmount: num(row.purchase_amount),
    commissionPercent: num(row.commission_percent),
    avatarUrl: signedAvatar?.data?.signedUrl ?? null,
    bank: bank
      ? {
          accountHolderName: bank.account_holder_name,
          bankName: bank.bank_name,
          bankCountry: bank.bank_country,
          accountNumber: bank.account_number_or_iban,
          swiftBic: bank.swift_bic,
          routingCode: bank.routing_code,
          payoutCurrency: bank.payout_currency,
        }
      : null,
    countries,
  };
}
