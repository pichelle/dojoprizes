"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { breakdownToCoinPrice } from "@/lib/coins";
import { resolveFranchiseTagIds } from "@/lib/franchiseTags";
import { NONE_VALUE } from "@/lib/constants";
import type { PrizeStatus, RequestSize } from "@/lib/types";
import {
  computePrizeEditChanges,
  logPrizeActivity,
  type PrizeSnapshot,
} from "@/lib/prizeActivityLog";

export type PrizeFormState = { error: string | null; success?: boolean; id?: string };

function parseFilamentIds(formData: FormData): string[] {
  return formData.getAll("filament_ids").map(String).filter(Boolean);
}

function parseFranchiseTagNames(formData: FormData): string[] {
  return formData.getAll("franchise_tag_names").map(String).filter(Boolean);
}

// Who's making this change -- a hidden field on the form set from the
// active profile (see ProfileContext), same pattern as RequestForm.
function actorFromForm(formData: FormData): string | null {
  return String(formData.get("actor") ?? "").trim() || null;
}

async function namesForFilamentIds(
  supabase: ReturnType<typeof createServerClient>,
  filamentIds: string[],
): Promise<string[]> {
  if (filamentIds.length === 0) return [];
  const { data } = await supabase.from("filaments").select("color_name").in("id", filamentIds);
  return (data ?? []).map((f) => f.color_name);
}

// Snapshot of a prize's current state (row + resolved link names) for the
// edit-activity diff -- fetched before the update is applied.
async function snapshotPrize(
  supabase: ReturnType<typeof createServerClient>,
  prizeId: string,
): Promise<PrizeSnapshot | null> {
  const [{ data: prize }, { data: filamentLinks }, { data: tagLinks }] = await Promise.all([
    supabase
      .from("prizes")
      .select("name, photo_url, coin_price, makerworld_link, stock_count, size, notes")
      .eq("id", prizeId)
      .single(),
    supabase.from("prize_filament").select("filament:filaments(color_name)").eq("prize_id", prizeId),
    supabase.from("prize_franchise_tags").select("tag:franchise_tags(name)").eq("prize_id", prizeId),
  ]);
  if (!prize) return null;
  return {
    name: prize.name,
    photo_url: prize.photo_url,
    coin_price: prize.coin_price,
    makerworld_link: prize.makerworld_link,
    stock_count: prize.stock_count,
    size: prize.size,
    notes: prize.notes,
    colorNames: ((filamentLinks ?? []) as unknown as { filament: { color_name: string } | null }[])
      .map((l) => l.filament?.color_name)
      .filter((v): v is string => Boolean(v)),
    themeNames: ((tagLinks ?? []) as unknown as { tag: { name: string } | null }[])
      .map((l) => l.tag?.name)
      .filter((v): v is string => Boolean(v)),
  };
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

function notesFromForm(formData: FormData): string | null {
  return String(formData.get("notes") ?? "").trim() || null;
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
        notes: notesFromForm(formData),
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
      await logPrizeActivity(supabase, prize.id, actorFromForm(formData), "created");
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
    const before = await snapshotPrize(supabase, prizeId);
    const stockCount = Number(formData.get("stock_count") ?? 0);
    const filamentIds = parseFilamentIds(formData);
    const themeNames = parseFranchiseTagNames(formData);

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
        notes: notesFromForm(formData),
        updated_at: new Date().toISOString(),
      })
      .eq("id", prizeId);

    if (error) return { error: error.message };

    await syncFilamentLinks(supabase, prizeId, filamentIds);
    const tagIds = await resolveFranchiseTagIds(supabase, themeNames);
    await syncFranchiseTagLinks(supabase, prizeId, tagIds);

    if (before) {
      const after: PrizeSnapshot = {
        name: String(formData.get("name") ?? "").trim(),
        photo_url: String(formData.get("photo_url") ?? "").trim() || null,
        coin_price: coinPriceFromForm(formData),
        makerworld_link: String(formData.get("makerworld_link") ?? "").trim() || null,
        stock_count: stockCount,
        size: sizeFromForm(formData),
        notes: notesFromForm(formData),
        colorNames: await namesForFilamentIds(supabase, filamentIds),
        themeNames,
      };
      const changes = computePrizeEditChanges(before, after);
      await logPrizeActivity(supabase, prizeId, actorFromForm(formData), "edited", changes);
    }

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

// Duplicates a prize's design-identity fields (name, photo, price, size,
// colors, themes) into a brand-new row -- for reprints of an improved
// design, so the whole form doesn't have to be re-typed from scratch. The
// copy deliberately starts unstocked (it hasn't actually been printed yet)
// and leaves behind comments/activity/checkout history, since those
// describe what happened to the *original* physical item, not the design.
export async function duplicatePrize(prizeId: string, actor: string | null): Promise<string> {
  const supabase = createServerClient();

  const { data: original, error: fetchError } = await supabase
    .from("prizes")
    .select("name, photo_url, coin_price, makerworld_link, size")
    .eq("id", prizeId)
    .single();
  if (fetchError || !original) throw new Error(fetchError?.message ?? "Prize not found.");

  const [{ data: filamentLinks }, { data: tagLinks }] = await Promise.all([
    supabase.from("prize_filament").select("filament_id").eq("prize_id", prizeId),
    supabase.from("prize_franchise_tags").select("tag_id").eq("prize_id", prizeId),
  ]);

  const { data: copy, error } = await supabase
    .from("prizes")
    .insert({
      name: `${original.name} (copy)`,
      photo_url: original.photo_url,
      coin_price: original.coin_price,
      makerworld_link: original.makerworld_link,
      size: original.size,
      stock_count: 0,
      status: statusFromStock(0),
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  if (!copy) throw new Error("Something went wrong duplicating that prize.");

  const filamentIds = ((filamentLinks ?? []) as { filament_id: string }[]).map((l) => l.filament_id);
  const tagIds = ((tagLinks ?? []) as { tag_id: string }[]).map((l) => l.tag_id);
  if (filamentIds.length > 0) {
    const { error: filamentError } = await supabase
      .from("prize_filament")
      .insert(filamentIds.map((filament_id) => ({ prize_id: copy.id, filament_id })));
    if (filamentError) throw new Error(filamentError.message);
  }
  if (tagIds.length > 0) {
    const { error: tagError } = await supabase
      .from("prize_franchise_tags")
      .insert(tagIds.map((tag_id) => ({ prize_id: copy.id, tag_id })));
    if (tagError) throw new Error(tagError.message);
  }

  await logPrizeActivity(supabase, copy.id, actor, "created");

  revalidatePath("/catalog");
  revalidatePath("/filament");
  revalidatePath("/requests");
  return copy.id;
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

// Manual "Log a reprint" action from the prize peek -- see
// prizeActivityLog.ts for why this is a deliberate click rather than
// inferred from stock edits. The running "reprinted N times" count shown
// in the UI is just a count of these activity entries.
export async function logPrizeReprint(prizeId: string, actor: string | null) {
  const supabase = createServerClient();
  await logPrizeActivity(supabase, prizeId, actor, "reprinted");
  revalidatePath("/catalog");
}

// Comments: same free-text-author pattern as request_comments (see
// requests/actions.ts).
export async function addPrizeComment(prizeId: string, author: string | null, body: string) {
  const trimmedBody = body.trim();
  if (!trimmedBody) throw new Error("Comment can't be empty.");
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("prize_comments")
    .insert({ prize_id: prizeId, author: author?.trim() || null, body: trimmedBody })
    .select("id, prize_id, author, body, created_at")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/catalog");
  return data;
}

export async function updatePrizeComment(commentId: string, body: string) {
  const trimmedBody = body.trim();
  if (!trimmedBody) throw new Error("Comment can't be empty.");
  const supabase = createServerClient();
  const { error } = await supabase
    .from("prize_comments")
    .update({ body: trimmedBody })
    .eq("id", commentId);
  if (error) throw new Error(error.message);
  revalidatePath("/catalog");
}

export async function deletePrizeComment(commentId: string) {
  const supabase = createServerClient();
  const { error } = await supabase.from("prize_comments").delete().eq("id", commentId);
  if (error) throw new Error(error.message);
  revalidatePath("/catalog");
}

// Reactions: same toggle-via-unique-constraint pattern as
// toggleCommentReaction in requests/actions.ts.
export async function togglePrizeCommentReaction(
  commentId: string,
  emoji: string,
  actor: string | null,
) {
  const supabase = createServerClient();
  const normalizedActor = actor?.trim() || null;

  let existingQuery = supabase
    .from("prize_comment_reactions")
    .select("id")
    .eq("comment_id", commentId)
    .eq("emoji", emoji);
  existingQuery = normalizedActor
    ? existingQuery.eq("actor", normalizedActor)
    : existingQuery.is("actor", null);
  const { data: existing } = await existingQuery.maybeSingle();

  if (existing) {
    const { error } = await supabase.from("prize_comment_reactions").delete().eq("id", existing.id);
    if (error) throw new Error(error.message);
    revalidatePath("/catalog");
    return null;
  }

  const { data, error } = await supabase
    .from("prize_comment_reactions")
    .insert({ comment_id: commentId, emoji, actor: normalizedActor })
    .select("id, comment_id, emoji, actor, created_at")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/catalog");
  return data;
}
