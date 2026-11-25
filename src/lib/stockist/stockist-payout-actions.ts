"use server";

// Stockist payout request action. Server only.
//
// The browser sends ONLY the ticked order ids. The database function
// request_stockist_payout() finds the stockist from the signed-in user and
// re-checks everything in one transaction: account active, bank details
// saved, every order payable right now (shipped, refund window over, not
// already claimed), positive balance after refund adjustments, and the
// minimum payout. This file never calculates money.

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";

export type RequestPayoutResult =
  | { ok: true; requestNumber: string }
  | { ok: false; error: string };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MAX_ORDERS_PER_REQUEST = 200;

export async function requestStockistPayout(
  orderIds: string[],
): Promise<RequestPayoutResult> {
  // Role check. The database checks the role again.
  await requireRole("stockist");

  /* 1. Validate input. Never trust what the browser sent. */
  if (!Array.isArray(orderIds)) {
    return { ok: false, error: "Select at least one order." };
  }
  const ids = [...new Set(orderIds)].filter(
    (id) => typeof id === "string" && UUID_RE.test(id),
  );
  if (ids.length === 0) {
    return { ok: false, error: "Select at least one order." };
  }
  if (ids.length > MAX_ORDERS_PER_REQUEST) {
    return {
      ok: false,
      error: `You can request up to ${MAX_ORDERS_PER_REQUEST} orders at a time.`,
    };
  }

  /* 2. The database does the real work in one transaction. */
  const supabase = await createClient();
  const { data: requestId, error } = await supabase.rpc(
    "request_stockist_payout",
    { p_order_ids: ids },
  );

  if (error) {
    // P0001 = a message the SQL function raised on purpose (written for
    // the stockist). Anything else is a real fault: hide the details.
    return {
      ok: false,
      error:
        error.code === "P0001"
          ? error.message
          : "Could not send your payout request. Please try again.",
    };
  }

  /* 3. The function returns the new request id. Read its number
        (RLS lets the stockist read their own request). */
  let requestNumber = "";
  if (typeof requestId === "string") {
    const { data: row } = await supabase
      .from("stockist_payout_requests")
      .select("request_number")
      .eq("id", requestId)
      .maybeSingle();
    requestNumber = (row?.request_number as string | undefined) ?? "";
  }

  /* 4. Refresh the pages that show these numbers. */
  revalidatePath("/stockist/payouts");
  revalidatePath("/stockist");

  return { ok: true, requestNumber };
}