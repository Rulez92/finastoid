import "server-only";
import { headers } from "next/headers";

// Only visitors in these countries may choose a currency.
const CHOOSER_COUNTRIES = new Set(["ID"]);

// Vercel sets this header itself and overwrites any value a visitor sends.
// Locally it does not exist: add DEV_COUNTRY=ID to .env.local to test.
export async function getVisitorCountry(): Promise<string | null> {
  const h = await headers();
  const fromVercel = h.get("x-vercel-ip-country");
  if (fromVercel) return fromVercel.trim().toUpperCase();

  if (process.env.NODE_ENV !== "production") {
    const dev = process.env.DEV_COUNTRY?.trim().toUpperCase();
    if (dev) return dev;
  }
  return null; // unknown country = USD only (the safe default)
}

export async function canChooseCurrency(): Promise<boolean> {
  const country = await getVisitorCountry();
  return country !== null && CHOOSER_COUNTRIES.has(country);
}