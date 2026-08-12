"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { breakdownToCoinPrice } from "@/lib/coins";
import { resolveFranchiseTagIds } from "@/lib/franchiseTags";
import { NONE_VALUE } from "@/lib/constants";
import type { PrizeStatus, RequestSize } from "@/lib/types";

export type PrizeFormState = { error: string | null; success?: boolean; id?: string };

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

function sizeFromForm(formData: FormData): RequestSize | null {
  const raw = String(formData.get("size") ?? "").trim();
  return raw && raw !== NONE_VALUE ? (raw as RequestSize) : null;
}

// Status is fully derived from stock count -- there's no manual status
// picker in the form anymore. 0 means Print-on-request (staff can always
// print another on request); anything above 0 is In stock. "Low stock"
// was removed as a status entirely (see migration 014).
function statusFromStock(stockCount: number): PrizeStatus {
  return stockCount === 0 ? "print_on_request" : "in_stock";
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

// Core logic, shared by the side-peek (non-redirecting) actions below.
// Never throws -- DB errors come back as form state instead of crashing.

async function performCreatePrize(formData: FormData): Promise<PrizeFormState> {
  const supabase = createServerClient();
  try {
    const stockCount = Number(formData.get("stock_count") ?? 1);

    const { data: prize, error } = await supabase
      .from("prizes")
      .insert({
        name: String(formData.get("name") ?? "").trim(),
        photo_url: String(formData.get("photo_url") ?? "").trim() || null,
        coin_price: coinPriceFromForm(formData),
        makerworld_link: String(formData.get("makerworld_link") ?? "").trim() || null,
        stock_count: stockCount,
        status: statusFromStock(stockCount),
        size: sizeFromForm(formData),
      })
      .select("id")
      .single();

    if (error) return { error: error.message };

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
    return { error: null, success: true, id: prize?.id };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Something went wrong. Please try again.",
    };
  }
}

async function performUpdatePrize(
  prizeId: string,
  formData: FormData,
): Promise<PrizeFormState> {
  const supabase = createServerClient();
  try {
    const stockCount = Number(formData.get("stock_count") ?? 0);

    const { error } = await supabase
      .from("prizes")
      .update({
        name: String(formData.get("name") ?? "").trim(),
        photo_url: String(formData.get("photo_url") ?? "").trim() || null,
        coin_price: coinPriceFromForm(formData),
        makerworld_link: String(formData.get("makerworld_link") ?? "").trim() || null,
        stock_count: stockCount,
        status: statusFromStock(stockCount),
        size: sizeFromForm(formData),
        updated_at: new Date().toISOString(),
      })
      .eq("id", prizeId);

    if (error) return { error: error.message };

    await syncFilamentLinks(supabase, prizeId, parseFilamentIds(formData));
    const tagIds = await resolveFranchiseTagIds(
      supabase,
      parseFranchiseTagNames(formData),
    );
    await syncFranchiseTagLinks(supabase, prizeId, tagIds);

    revalidatePath("/catalog");
    revalidatePath("/filament");
    revalidatePath("/requests");
    return { error: null, success: true, id: prizeId };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Something went wrong. Please try again.",
    };
  }
}

// Dedicated-page variant: redirects back to /catalog on success, for the
// "Add a prize" full page.
export async function createPrize(
  _prevState: PrizeFormState | null,
  formData: FormData,
): Promise<PrizeFormState> {
  const result = await performCreatePrize(formData);
  if (result.error) return result;
  redirect("/catalog");
}

export async function updatePrizeInline(
  prizeId: string,
  _prevState: PrizeFormState | null,
  formData: FormData,
): Promise<PrizeFormState> {
  return performUpdatePrize(prizeId, formData);
}

export async function deletePrize(prizeId: string) {
  const supabase = createServerClient();
  const { error } = await supabase.from("prizes").delete().eq("id", prizeId);
  if (error) throw new Error(error.message);
  revalidatePath("/catalog");
  revalidatePath("/filament");
}

// Renames a franchise tag in place (e.g. fixing a typo) -- since prizes
// and requests only ever link to a tag by id, this fixes every place
// that tag shows up, everywhere, with no separate cleanup needed.
export async function renameFranchiseTag(oldName: string, newName: string) {
  const supabase = createServerClient();
  const trimmed = newName.trim();
  if (!trimmed) throw new Error("Tag name can't be empty.");

  const { error } = await supabase
    .from("franchise_tags")
    .update({ name: trimmed })
    .ilike("name", oldName);
  if (error) throw new Error(error.message);

  revalidatePath("/catalog");
  revalidatePath("/requests");
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
      status: newStock === 0 ? "print_on_request" : undefined,
    })
    .eq("id", prizeId);
  if (updateError) throw new Error(updateError.message);

  revalidatePath("/catalog");
  revalidatePath("/checkouts");
}
