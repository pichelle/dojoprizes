"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { breakdownToCoinPrice, silverEquivalentForTier } from "@/lib/coins";
import { resolveFranchiseTagIds } from "@/lib/franchiseTags";
import type { CoinTier, PrizeStatus } from "@/lib/types";

function parseFilamentIds(formData: FormData): string[] {
  return formData.getAll("filament_ids").map(String).filter(Boolean);
}

function parseFranchiseTagNames(formData: FormData): string[] {
  return formData.getAll("franchise_tag_names").map(String).filter(Boolean);
}

function coinPriceFromForm(formData: FormData): number | null {
  const silver = Number(formData.get("coin_price_silver") || 0);
  const gold = Number(formData.get("coin_price_gold") || 0);
  const obsidian = Number(formData.get("coin_price_obsidian") || 0);
  if (!silver && !gold && !obsidian) return null;
  return breakdownToCoinPrice({ silver, gold, obsidian });
}

async function syncFilamentLinks(
  supabase: ReturnType<typeof createServerClient>,
  prizeId: string,
  filamentIds: string[],
) {
  const { error: deleteError } = await supabase
    .from("prize_filament")
    .delete()
    .eq("prize_id", prizeId);
  if (deleteError) throw new Error(deleteError.message);

  if (filamentIds.length > 0) {
    const { error: linkError } = await supabase.from("prize_filament").insert(
      filamentIds.map((filament_id) => ({ prize_id: prizeId, filament_id })),
    );
    if (linkError) throw new Error(linkError.message);
  }
}

async function syncFranchiseTagLinks(
  supabase: ReturnType<typeof createServerClient>,
  prizeId: string,
  tagIds: string[],
) {
  const { error: deleteError } = await supabase
    .from("prize_franchise_tags")
    .delete()
    .eq("prize_id", prizeId);
  if (deleteError) throw new Error(deleteError.message);

  if (tagIds.length > 0) {
    const { error: linkError } = await supabase
      .from("prize_franchise_tags")
      .insert(tagIds.map((tag_id) => ({ prize_id: prizeId, tag_id })));
    if (linkError) throw new Error(linkError.message);
  }
}

export async function createPrize(formData: FormData) {
  const supabase = createServerClient();
  const coinTier = (formData.get("coin_tier") as CoinTier) || null;

  const { data: prize, error } = await supabase
    .from("prizes")
    .insert({
      name: String(formData.get("name") ?? "").trim(),
      photo_url: String(formData.get("photo_url") ?? "").trim() || null,
      coin_tier: coinTier,
      coin_value_silver_equivalent: coinTier
        ? silverEquivalentForTier(coinTier)
        : null,
      coin_price: coinPriceFromForm(formData),
      makerworld_link: String(formData.get("makerworld_link") ?? "").trim() || null,
      stock_count: Number(formData.get("stock_count") ?? 0),
      status: (formData.get("status") as PrizeStatus) || "in_stock",
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  if (prize) {
    await syncFilamentLinks(supabase, prize.id, parseFilamentIds(formData));
    const tagIds = await resolveFranchiseTagIds(
      supabase,
      parseFranchiseTagNames(formData),
    );
    await syncFranchiseTagLinks(supabase, prize.id, tagIds);
  }

  revalidatePath("/catalog");
  revalidatePath("/filament");
  revalidatePath("/requests");
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
      coin_tier: coinTier,
      coin_value_silver_equivalent: coinTier
        ? silverEquivalentForTier(coinTier)
        : null,
      coin_price: coinPriceFromForm(formData),
      makerworld_link:
        String(formData.get("makerworld_link") ?? "").trim() || null,
      stock_count: Number(formData.get("stock_count") ?? 0),
      status: (formData.get("status") as PrizeStatus) || "in_stock",
      updated_at: new Date().toISOString(),
    })
    .eq("id", prizeId);

  if (error) throw new Error(error.message);

  await syncFilamentLinks(supabase, prizeId, parseFilamentIds(formData));
  const tagIds = await resolveFranchiseTagIds(
    supabase,
    parseFranchiseTagNames(formData),
  );
  await syncFranchiseTagLinks(supabase, prizeId, tagIds);

  revalidatePath("/catalog");
  revalidatePath(`/catalog/${prizeId}`);
  revalidatePath("/filament");
  revalidatePath("/requests");
  redirect("/catalog");
}

export async function deletePrize(prizeId: string) {
  const supabase = createServerClient();
  const { error } = await supabase.from("prizes").delete().eq("id", prizeId);
  if (error) throw new Error(error.message);
  revalidatePath("/catalog");
  revalidatePath("/filament");
  redirect("/catalog");
}

// Quick one-click checkout, callable straight from the catalog grid.
export async function quickCheckout(prizeId: string, boughtBy: string | null) {
  const supabase = createServerClient();

  const { error: checkoutError } = await supabase.from("checkouts").insert({
    prize_id: prizeId,
    date_checked_out: new Date().toISOString().slice(0, 10),
    bought_by: boughtBy || null,
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
