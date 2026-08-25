"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { NONE_VALUE } from "@/lib/constants";

export async function createCheckout(formData: FormData) {
  const supabase = createServerClient();
  const rawPrizeId = String(formData.get("prize_id") ?? "");
  const prizeId = rawPrizeId === NONE_VALUE ? "" : rawPrizeId;
  const date =
    String(formData.get("date_checked_out") ?? "").trim() ||
    new Date().toISOString().slice(0, 10);

  if (!prizeId) throw new Error("Pick a prize to check out.");

  const boughtBy = String(formData.get("bought_by") ?? "").trim() || null;

  const { error: checkoutError } = await supabase.from("checkouts").insert({
    prize_id: prizeId,
    date_checked_out: date,
    bought_by: boughtBy,
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
      status: newStock === 0 ? "print_on_request" : undefined,
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

// "Move back to Prize Bin" -- for a checkout logged by mistake. Unlike
// deleteCheckout (a plain, no-side-effects nuke for genuinely bad data),
// this restores the pairing a checkout always represents: the row goes
// away AND the stock it decremented comes back, so the prize actually
// re-appears as available instead of quietly staying a unit short.
export async function undoCheckout(checkoutId: string) {
  const supabase = createServerClient();

  const { data: checkout, error: fetchError } = await supabase
    .from("checkouts")
    .select("prize_id")
    .eq("id", checkoutId)
    .single();
  if (fetchError || !checkout) throw new Error(fetchError?.message ?? "Checkout not found.");

  const { error: deleteError } = await supabase.from("checkouts").delete().eq("id", checkoutId);
  if (deleteError) throw new Error(deleteError.message);

  // The prize itself may have since been deleted -- if so, there's nothing
  // left to restock, and that's fine; the checkout row is still gone.
  const { data: prize } = await supabase
    .from("prizes")
    .select("stock_count")
    .eq("id", checkout.prize_id)
    .maybeSingle();
  if (prize) {
    const { error: updateError } = await supabase
      .from("prizes")
      .update({ stock_count: (prize.stock_count ?? 0) + 1, status: "in_stock" })
      .eq("id", checkout.prize_id);
    if (updateError) throw new Error(updateError.message);
  }

  revalidatePath("/checkouts");
  revalidatePath("/catalog");
}

// Edits a bin checkout's date/buyer -- the only two fields that make sense
// to correct after the fact (the prize itself isn't swappable; that's what
// undoCheckout + a fresh checkout is for).
export async function updateCheckout(checkoutId: string, formData: FormData) {
  const supabase = createServerClient();
  const date = String(formData.get("date_checked_out") ?? "").trim();
  if (!date) throw new Error("Pick a date.");
  const boughtBy = String(formData.get("bought_by") ?? "").trim() || null;

  const { error } = await supabase
    .from("checkouts")
    .update({ date_checked_out: date, bought_by: boughtBy })
    .eq("id", checkoutId);
  if (error) throw new Error(error.message);
  revalidatePath("/checkouts");
}
