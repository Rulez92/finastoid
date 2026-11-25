"use server";

// Server Action for the stockist Settings page. It:
//   1. re-checks requireRole("stockist"),
//   2. validates every input with zod,
//   3. saves through update_my_stockist_profile(), a database function that
//      finds the stockist from the signed-in user and can write ONLY name,
//      phone, country and region. Email, status, tier rate, notes and
//      the login link cannot be changed from here, whatever the browser sends.
//
// An empty phone / country / region is saved as "not set" (null).

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/server";
import { createClient } from "@/lib/supabase/server";
import { isValidPhoneNumber } from "libphonenumber-js";
import {
  bankDetailsSchema,
  normalizeAccount,
  normalizeCurrency,
  normalizeSwift,
} from "@/lib/affiliate/bank-validation";
const profileSchema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(120),
  phone: z
    .string()
    .trim()
    .max(30)
    .refine(
      (v) => v === "" || isValidPhoneNumber(v),
      "Enter a valid phone number",
    )
    .nullable(),
  country: z.string().trim().max(60).nullable(),
  region: z.string().trim().max(60).nullable(),
});

export type StockistProfileInput = z.infer<typeof profileSchema>;

export type SaveProfileResult =
  | { success: true }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

export async function saveMyStockistProfile(
  input: StockistProfileInput,
): Promise<SaveProfileResult> {
  await requireRole("stockist");

  const parsed = profileSchema.safeParse(input);
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
  const { error } = await supabase.rpc("update_my_stockist_profile", {
    p_name: data.name,
    p_phone: data.phone ?? "",
    p_country: data.country ?? "",
    p_region: data.region ?? "",
  });

  if (error) {
    return {
      success: false,
      error: `Could not save your details: ${error.message}`,
    };
  }

  revalidatePath("/stockist/settings");
  revalidatePath("/stockist"); // the top bar shows the name
  return { success: true };
}
/* ------------------------------------------------------------------ */
/* Bank details                                                         */
/* ------------------------------------------------------------------ */

function flatten(error: z.ZodError): Record<string, string[]> {
  return error.flatten().fieldErrors as Record<string, string[]>;
}

// The signed-in stockist's own id, only while the account is active.
// Found from the login by the database, never from anything the browser sends.
async function getOwnActiveStockistId(): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_active_stockist_id");
  if (error || !data) return null;
  return data as string;
}

export async function saveMyStockistBankDetails(
  input: unknown,
): Promise<SaveProfileResult> {
  await requireRole("stockist");

  const parsed = bankDetailsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: flatten(parsed.error),
    };
  }
  const data = parsed.data;

  const stockistId = await getOwnActiveStockistId();
  if (!stockistId) {
    return { success: false, error: "Your account is not active." };
  }

  const supabase = await createClient();

  const { data: existing, error: existingError } = await supabase
    .from("stockist_bank_details")
    .select("stockist_id")
    .eq("stockist_id", stockistId)
    .maybeSingle();

  if (existingError) {
    return {
      success: false,
      error: `Could not load your bank details: ${existingError.message}`,
    };
  }

  const account = normalizeAccount(data.accountNumberOrIban);

  // A blank account number means "keep the saved one". That is only
  // possible when something is already saved.
  if (!account && !existing) {
    return {
      success: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: { accountNumberOrIban: ["Enter an account number or IBAN"] },
    };
  }

  const fields = {
    account_holder_name: data.accountHolderName,
    bank_name: data.bankName,
    bank_country: data.bankCountry,
    swift_bic: data.swiftBic ? normalizeSwift(data.swiftBic) : null,
    routing_code: data.routingCode,
    payout_currency: normalizeCurrency(data.payoutCurrency),
  };

  const { error } = existing
    ? await supabase
        .from("stockist_bank_details")
        .update(account ? { ...fields, account_number_or_iban: account } : fields)
        .eq("stockist_id", stockistId)
    : await supabase.from("stockist_bank_details").insert({
        stockist_id: stockistId,
        account_number_or_iban: account,
        ...fields,
      });

  if (error) {
    return {
      success: false,
      error: `Could not save your bank details: ${error.message}`,
    };
  }

  revalidatePath("/stockist/settings");
  revalidatePath("/stockist/payouts");
  return { success: true };
}

/* ------------------------------------------------------------------ */
/* Profile photo                                                        */
/* ------------------------------------------------------------------ */

const AVATAR_BUCKET = "stockist-avatars";
const AVATAR_MAX_BYTES = 2 * 1024 * 1024; // matches the bucket limit

// Check the real file signature, not the type the browser claims.
function detectImageType(
  bytes: Uint8Array,
): { mime: string; ext: string } | null {
  const starts = (sig: number[], offset = 0) =>
    sig.every((b, i) => bytes[offset + i] === b);

  if (starts([0x89, 0x50, 0x4e, 0x47])) return { mime: "image/png", ext: "png" };
  if (starts([0xff, 0xd8, 0xff])) return { mime: "image/jpeg", ext: "jpg" };
  if (starts([0x52, 0x49, 0x46, 0x46]) && starts([0x57, 0x45, 0x42, 0x50], 8)) {
    return { mime: "image/webp", ext: "webp" };
  }
  return null;
}

// FormData must contain one entry named "avatar".
export async function uploadMyStockistAvatar(
  formData: FormData,
): Promise<SaveProfileResult> {
  const { user } = await requireRole("stockist");

  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: "No image selected." };
  }
  if (file.size > AVATAR_MAX_BYTES) {
    return { success: false, error: "The image must be 2 MB or smaller." };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = detectImageType(bytes);
  if (!type) {
    return {
      success: false,
      error: "Only PNG, JPG or WebP images are allowed.",
    };
  }

  const supabase = await createClient();

  // The folder name must be the user's own id: the storage policy checks it.
  const path = `${user.id}/avatar-${crypto.randomUUID()}.${type.ext}`;

  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, bytes, { contentType: type.mime, upsert: false });

  if (uploadError) {
    return {
      success: false,
      error: `Could not upload your photo: ${uploadError.message}`,
    };
  }

  // Saves the new path and returns the OLD one, so it can be deleted.
  const { data: oldPath, error: saveError } = await supabase.rpc(
    "set_my_stockist_avatar",
    { p_path: path },
  );

  if (saveError) {
    await supabase.storage.from(AVATAR_BUCKET).remove([path]); // roll back
    return {
      success: false,
      error:
        saveError.code === "P0001"
          ? saveError.message
          : "Could not save your photo. Please try again.",
    };
  }

  if (typeof oldPath === "string" && oldPath) {
    await supabase.storage.from(AVATAR_BUCKET).remove([oldPath]);
  }

  revalidatePath("/stockist", "layout");
  return { success: true };
}

export async function removeMyStockistAvatar(): Promise<SaveProfileResult> {
  await requireRole("stockist");
  const supabase = await createClient();

  const { data: oldPath, error } = await supabase.rpc("set_my_stockist_avatar", {
    p_path: null,
  });

  if (error) {
    return {
      success: false,
      error:
        error.code === "P0001"
          ? error.message
          : "Could not remove your photo. Please try again.",
    };
  }

  if (typeof oldPath === "string" && oldPath) {
    await supabase.storage.from(AVATAR_BUCKET).remove([oldPath]);
  }

  revalidatePath("/stockist", "layout");
  return { success: true };
}