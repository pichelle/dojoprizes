"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";

export async function createCheckout(formData: FormData) {
  const supabase = createServerClient();
  const prizeId = String(formData.get("prize_id") ?? "");
  const date =
    String(formData.get("date_checked_out") ?? "").trim() ||
    new Date().toISOString().slice(0, 10);

  if (!prizeId) throw new Error("Pick a prize to check out.");

  const { error: checkoutError } = await supabase.from("checkouts").insert({
    prize_id: prizeId,
    date_checked_out: date,
  });
  if (checkoutError) throw new Error(checkoutError.message);

  const { data: prize } = await supabase
    .from("prizes")
    .select("stock_count")
    .eq("id", prizeId)
    .single();

  const newStock = Math.max(0, (prize?.stock_count ?? 1) - 1);
  await supabase
    .from("prizes")
    .update({
      stock_count: newStock,
      status: newStock === 0 ? "out_of_stock" : undefined,
    })
    .eq("id", prizeId);

  revalidatePath("/checkouts");
  revalidatePath("/catalog");
}

export async function deleteCheckout(checkoutId: string) {
  const supabase = createServerClient();
  const { error } = await supabase
    .from("checkouts")
    .delete()
    .eq("id", checkoutId);
  if (error) throw new Error(error.message);
  revalidatePath("/checkouts");
}
