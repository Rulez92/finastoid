"use server";

// Server Actions for the admin Associate Tiers section. Same pattern as
// stockist-actions.ts: every action re-checks requireRole("admin"), validates
// every input with zod, and writes through the regular cookie-based server
// client (RLS applies, and only admins can write to associate_tiers).
//
// Tiers are data, not code. Rules this file enforces:
//   - Edit price or commission %: allowed. It only affects FUTURE verified
//     sales, because each order_item stores its own snapshot of the rate.
//   - Archive: a tier that stockists already use is archived, never deleted.
//     It disappears from the stockist form dropdown, but stays valid for the
//     stockists on it and for history.
//   - Hard delete: only possible if no stockist has ever used the tier. The
//     foreign key (stockists.tier_id, on delete restrict) is the real guard;
//     this file just turns its error into a friendly message.

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

const tierInputSchema = z.object({
  name: z.string().trim().min(1, "Enter a tier name").max(80),
  purchaseAmount: z.number().finite().min(0).max(1_000_000_000),
  commissionPercent: z.number().finite().min(0).max(100),
  sortOrder: z.number().int().min(0).max(9999),
});

export type TierInput = z.infer<typeof tierInputSchema>;

const tierStatusSchema = z.enum(["active", "archived"]);
export type TierStatus = z.infer<typeof tierStatusSchema>;

const idSchema = z.string().uuid();

export type TierActionResult =
  | { success: true; tierId: string }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

// Postgres error codes we translate into friendly messages.
const UNIQUE_VIOLATION = "23505";
const FOREIGN_KEY_VIOLATION = "23503";

function revalidateTierPages() {
  revalidatePath("/admin/associate-tiers");
  // The stockist form's dropdown and the stockist list both show tier data.
  revalidatePath("/admin/stockists");
}

/* ------------------------------------------------------------------ */
/* Create                                                               */
/* ------------------------------------------------------------------ */

export async function createTier(input: TierInput): Promise<TierActionResult> {
  await requireRole("admin");

  const parsed = tierInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<
        string,
        string[]
      >,
    };
  }
  const data = parsed.data;

  const supabase = await createClient();
  const { data: tier, error } = await supabase
    .from("associate_tiers")
    .insert({
      name: data.name,
      purchase_amount: data.purchaseAmount,
      commission_percent: data.commissionPercent,
      sort_order: data.sortOrder,
      // status defaults to 'active' in the database
    })
    .select("id")
    .single();

  if (error || !tier) {
    if (error?.code === UNIQUE_VIOLATION) {
      return {
        success: false,
        error: "A tier with this name already exists.",
        fieldErrors: { name: ["Already in use"] },
      };
    }
    return {
      success: false,
      error: `Could not create tier: ${error?.message}`,
    };
  }

  revalidateTierPages();
  return { success: true, tierId: tier.id };
}

/* ------------------------------------------------------------------ */
/* Update                                                               */
/* ------------------------------------------------------------------ */

export async function updateTier(
  id: string,
  input: TierInput,
): Promise<TierActionResult> {
  await requireRole("admin");

  if (!idSchema.safeParse(id).success) {
    return { success: false, error: "Invalid tier." };
  }

  const parsed = tierInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<
        string,
        string[]
      >,
    };
  }
  const data = parsed.data;

  const supabase = await createClient();
  // updated_at is set by a database trigger, so it is not sent from here.
  // .select("id") lets us tell "updated" apart from "matched no row".
  const { data: updated, error } = await supabase
    .from("associate_tiers")
    .update({
      name: data.name,
      purchase_amount: data.purchaseAmount,
      commission_percent: data.commissionPercent,
      sort_order: data.sortOrder,
    })
    .eq("id", id)
    .select("id");

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return {
        success: false,
        error: "A tier with this name already exists.",
        fieldErrors: { name: ["Already in use"] },
      };
    }
    return {
      success: false,
      error: `Could not update tier: ${error.message}`,
    };
  }
  if (!updated || updated.length === 0) {
    return { success: false, error: "Tier not found." };
  }

  revalidateTierPages();
  revalidatePath(`/admin/associate-tiers/${id}`);
  return { success: true, tierId: id };
}

/* ------------------------------------------------------------------ */
/* Archive / restore                                                    */
/* ------------------------------------------------------------------ */

// Archiving is always allowed, even when stockists are on the tier: they keep
// it (and their history stays correct), it just stops appearing in the
// dropdown for new assignments. The UI shows the stockist count as a warning.
export async function setTierStatus(
  id: string,
  status: TierStatus,
): Promise<TierActionResult> {
  await requireRole("admin");

  if (!idSchema.safeParse(id).success) {
    return { success: false, error: "Invalid tier." };
  }
  const parsedStatus = tierStatusSchema.safeParse(status);
  if (!parsedStatus.success) {
    return { success: false, error: "Invalid status." };
  }

  const supabase = await createClient();
  const { data: updated, error } = await supabase
    .from("associate_tiers")
    .update({ status: parsedStatus.data })
    .eq("id", id)
    .select("id");

  if (error) return { success: false, error: error.message };
  if (!updated || updated.length === 0) {
    return { success: false, error: "Tier not found." };
  }

  revalidateTierPages();
  return { success: true, tierId: id };
}

/* ------------------------------------------------------------------ */
/* Hard delete (only if never used)                                     */
/* ------------------------------------------------------------------ */

export async function deleteTier(id: string): Promise<TierActionResult> {
  await requireRole("admin");

  if (!idSchema.safeParse(id).success) {
    return { success: false, error: "Invalid tier." };
  }

  const supabase = await createClient();
  const { data: deleted, error } = await supabase
    .from("associate_tiers")
    .delete()
    .eq("id", id)
    .select("id");

  if (error) {
    // stockists.tier_id uses "on delete restrict", so Postgres refuses.
    if (error.code === FOREIGN_KEY_VIOLATION) {
      return {
        success: false,
        error:
          "This tier is used by stockists, so it can't be deleted. Archive it instead.",
      };
    }
    return { success: false, error: `Could not delete tier: ${error.message}` };
  }
  if (!deleted || deleted.length === 0) {
    return { success: false, error: "Tier not found." };
  }

  revalidateTierPages();
  return { success: true, tierId: id };
}