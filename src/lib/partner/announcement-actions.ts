"use server";

// Server Action for affiliates and stockists: mark an announcement as read.
// The user comes from the signed-in session, never from the browser, and
// RLS (insert policy) only allows a row for the caller's own user id on an
// announcement they are allowed to see.

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";

const idSchema = z.string().uuid();
const roleSchema = z.enum(["affiliate", "stockist"]);

export type ActionResult = { success: true } | { success: false; error: string };

export async function markPartnerAnnouncementRead(
  role: "affiliate" | "stockist",
  announcementId: string,
): Promise<ActionResult> {
  const parsedRole = roleSchema.safeParse(role);
  if (!parsedRole.success) return { success: false, error: "Invalid role." };

  const { user } = await requireRole(parsedRole.data);

  if (!idSchema.safeParse(announcementId).success) {
    return { success: false, error: "Invalid announcement." };
  }

  const supabase = await createClient();

  // Insert only; an already-read row is ignored. We do not use upsert,
  // because there is no update policy on this table.
  const { error } = await supabase
    .from("partner_announcement_reads")
    .insert({ announcement_id: announcementId, user_id: user.id });

  // 23505 = already marked as read, which is fine.
  if (error && error.code !== "23505") {
    return { success: false, error: error.message };
  }

  revalidatePath(`/${parsedRole.data}/announcements`);
  revalidatePath(`/${parsedRole.data}`, "layout");
  return { success: true };
}