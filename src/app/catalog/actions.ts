"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { silverEquivalentForTier } from "@/lib/coins";
import type { CoinTier, PrizeStatus } from "@/lib/types";

function parseTags(raw: FormDataEntryValue | null): string[] {
  const str = String(raw ?? "");
  return str
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

export async function createPrize(formData: FormData) {
  const supabase = createServerClient();
  const coinTier = (formData.get("coin_tier") as CoinTier) || null;

  const { error } = await supabase.from("prizes").insert({
    name: String(formData.get("name") ?? "").trim(),
    photo_url: String(formData.get("photo_url") ?? "").trim() || null,
    franchise: String(formData.get("franchise") ?? "").trim() || null,
    tags: parseTags(formData.get("tags")),
    coin_tier: coinTier,
    coin_value_silver_equivalent: coinTier
      ? silverEquivalentForTier(coinTier)
      : null,
    makerworld_link: String(formData.get("makerworld_link") ?? "").trim() || null,
    stock_count: Number(formData.get("stock_count") ?? 0),
    status: (formData.get("status") as PrizeStatus) || "in_stock",
  });

  if (error) throw new Error(error.message);

  revalidatePath("/catalog");
  redirect("/catalog");
}

export async function updatePrize(prizeId: string, formData: FormData) {
  const supabase = createServerClient();
  const coinTier = (formData.get("coin_tier") as CoinTier) || null;

  const { error } = await supabase
    .from("prizes")
    .update({
      name: String(formData.get("name") ?? "").trim(),
      photo_url: String(formData.get("photo_url") ?? "").trim() || null,
      franchise: String(formData.get("franchise") ?? "").trim() || null,
      tags: parseTags(formData.get("tags")),
      coin_tier: coinTier,
      coin_value_silver_equivalent: coinTier
        ? silverEquivalentForTier(coinTier)
        : null,
      makerworld_link:
        String(formData.get("makerworld_link") ?? "").trim() || null,
      stock_count: Number(formData.get("stock_count") ?? 0),
      status: (formData.get("status") as PrizeStatus) || "in_stock",
      updated_at: new Date().toISOString(),
    })
    .eq("id", prizeId);

  if (error) throw new Error(error.message);

  revalidatePath("/catalog");
  revalidatePath(`/catalog/${prizeId}`);
  redirect("/catalog");
}

export async function deletePrize(prizeId: string) {
  const supabase = createServerClient();
  const { error } = await supabase.from("prizes").delete().eq("id", prizeId);
  if (error) throw new Error(error.message);
  revalidatePath("/catalog");
  redirect("/catalog");
}

// Quick one-click checkout, callable straight from the catalog grid.
export async function quickCheckout(prizeId: string) {
  const supabase = createServerClient();

  const { error: checkoutError } = await supabase.from("checkouts").insert({
    prize_id: prizeId,
    date_checked_out: new Date().toISOString().slice(0, 10),
  });
  if (checkoutError) throw new Error(checkoutError.message);

  const { data: prize, error: fetchError } = await supabase
    .from("prizes")
    .select("stock_count")
    .eq("id", prizeId)
    .single();
  if (fetchError) throw new Error(fetchError.message);

  const newStock = Math.max(0, (prize?.stock_count ?? 1) - 1);
  const { error: updateError } = await supabase
    .from("prizes")
    .update({
      stock_count: newStock,
      status: newStock === 0 ? "out_of_stock" : undefined,
    })
    .eq("id", prizeId);
  if (updateError) throw new Error(updateError.message);

  revalidatePath("/catalog");
  revalidatePath("/checkouts");
}
