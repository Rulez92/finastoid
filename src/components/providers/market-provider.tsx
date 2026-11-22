"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { activeMarket, availableMarkets, type Market } from "@/data/site";
import { CURRENCY_COOKIE, writeCurrencyCookie } from "@/lib/currency";

// type MarketContextValue = {
//   market: Market;
//   setMarket: (market: Market) => void;
// };
type MarketContextValue = {
  market: Market;
  setMarket: (market: Market) => void;
  canChooseCurrency: boolean;
};

const STORAGE_KEY = "finasto-market";

const defaultMarket =
  availableMarkets.find((m) => m.countryCode === activeMarket.countryCode) ??
  availableMarkets[0];

// const MarketContext = createContext<MarketContextValue | null>(null);
// Visitors outside Indonesia always see USD. Prefer the "GLOBAL" market.
const usdMarket =
  availableMarkets.find((m) => m.countryCode === "GLOBAL") ??
  availableMarkets.find((m) => m.currencyCode === "USD") ??
  defaultMarket;

const MarketContext = createContext<MarketContextValue | null>(null);

// export function MarketProvider({ children }: { children: ReactNode }) {
//   const [market, setMarketState] = useState<Market>(defaultMarket);
export function MarketProvider({
  children,
  canChooseCurrency,
}: {
  children: ReactNode;
  canChooseCurrency: boolean;
}) {
  const [market, setMarketState] = useState<Market>(
    canChooseCurrency ? defaultMarket : usdMarket,
  );
  const router = useRouter();

  // Read the saved choice after mount, so server and client render the
  // same HTML first (avoids a hydration mismatch).
  // useEffect(() => {
  //   try {
  //     const saved = localStorage.getItem(STORAGE_KEY);
    useEffect(() => {
    // Outside Indonesia the market is fixed to USD. Nothing is saved or
    // written here, and the server ignores the currency cookie anyway.
    if (!canChooseCurrency) return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const found =
        availableMarkets.find((m) => m.countryCode === saved) ??
        // older saves stored the currency code (e.g. "IDR")
        availableMarkets.find((m) => m.currencyCode === saved);
      if (found) {
        setMarketState(found);
        if (
          !document.cookie.includes(`${CURRENCY_COOKIE}=${found.currencyCode}`)
        ) {
          writeCurrencyCookie(found.currencyCode);
          router.refresh();
        }
      } else if (!document.cookie.includes(`${CURRENCY_COOKIE}=`)) {
        // First visit: the shop shows the default market's currency, so the
        // server must use the same one, or checkout would charge in USD.
        writeCurrencyCookie(defaultMarket.currencyCode);
        router.refresh();
      }
    } catch {
      // storage blocked (private mode): keep the default market
    }
  // }, [router]);

  // function setMarket(next: Market) {
  //   setMarketState(next);

    }, [router, canChooseCurrency]);

  function setMarket(next: Market) {
    if (!canChooseCurrency) return;
    setMarketState(next);
    writeCurrencyCookie(next.currencyCode);
    router.refresh();
    try {
      localStorage.setItem(STORAGE_KEY, next.countryCode);
    } catch {
      // ignore
    }
  }

  return (
    // <MarketContext.Provider value={{ market, setMarket }}>
        <MarketContext.Provider value={{ market, setMarket, canChooseCurrency }}>
      {children}
    </MarketContext.Provider>
  );
}

export function useMarket() {
  const ctx = useContext(MarketContext);
  if (!ctx) throw new Error("useMarket must be used inside <MarketProvider>");
  return ctx;
}
