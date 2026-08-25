import { createServerClient } from "@/lib/supabase/server";
import { createCheckout, deleteCheckout } from "./actions";
import { deleteRequest } from "../requests/actions";
import Select from "@/components/Select";
import { NONE_VALUE } from "@/lib/constants";
import ErrorNote from "@/components/ErrorNote";
import type { Prize, PrizeRequest } from "@/lib/types";
import CheckoutsTable, { type MergedCheckoutRow } from "./CheckoutsTable";

// Always fetch fresh data -- this page has no searchParams/cookies to force
// dynamic rendering on its own, and without this it can get statically
// cached at build/deploy time instead of showing live checkouts.
export const dynamic = "force-dynamic";

export default async function CheckoutsPage() {
  const supabase = createServerClient();

  const [
    { data: prizes },
    { data: binCheckouts, error: binError },
    { data: fulfilledRequests, error: reqError },
    { data: allPrizeTagLinks },
    { data: allPrizeFilamentLinks },
    { data: allRequestTagLinks },
    { data: allRequestFilamentLinks },
    { data: filaments },
    { data: franchiseTagRows },
    { data: allRequestComments },
    { data: allRequestActivity },
    { data: allRequestReactions },
    { data: allPrizeComments },
    { data: allPrizeActivity },
    { data: allPrizeReactions },
  ] = await Promise.all([
    supabase.from("prizes").select("id, name").order("name"),
    supabase
      .from("checkouts")
      .select("*, prize:prizes(id, name, photo_url, coin_price, size, makerworld_link, notes)")
      .order("date_checked_out", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("requests")
      .select("*, prize:prizes(id, name, photo_url, coin_price, makerworld_link)")
      .eq("status", "fulfilled")
      .order("date_requested", { ascending: false })
      .limit(500),
    supabase.from("prize_franchise_tags").select("prize_id, tag:franchise_tags(id, name)"),
    supabase.from("prize_filament").select("prize_id, filament:filaments(id, color_name, swatch_hex)"),
    supabase.from("request_franchise_tags").select("request_id, tag:franchise_tags(id, name)"),
    supabase.from("request_filaments").select("request_id, filament:filaments(id, color_name, swatch_hex)"),
    // Needed for the request edit form reused on this page (same fields
    // RequestForm needs everywhere else it's rendered).
    supabase.from("filaments").select("id, color_name, swatch_hex").order("color_name"),
    supabase.from("franchise_tags").select("id, name").order("name"),
    // Comments/activity for both sources, so a checkout entry can carry
    // over the full discussion/history it had before it was checked out --
    // same unfiltered-then-map-by-id pattern requests/page.tsx and
    // catalog/page.tsx already use.
    supabase
      .from("request_comments")
      .select("id, request_id, author, body, created_at")
      .order("created_at", { ascending: true }),
    supabase
      .from("request_activity")
      .select("id, request_id, actor, event_type, changes, created_at")
      .order("created_at", { ascending: true }),
    supabase
      .from("comment_reactions")
      .select("id, comment_id, emoji, actor, created_at")
      .order("created_at", { ascending: true }),
    supabase
      .from("prize_comments")
      .select("id, prize_id, author, body, created_at")
      .order("created_at", { ascending: true }),
    supabase
      .from("prize_activity")
      .select("id, prize_id, actor, event_type, changes, created_at")
      .order("created_at", { ascending: true }),
    supabase
      .from("prize_comment_reactions")
      .select("id, comment_id, emoji, actor, created_at")
      .order("created_at", { ascending: true }),
  ]);

  type Tag = { id: string; name: string };
  type ColorRef = { id: string; color_name: string; swatch_hex: string | null };

  const tagsByPrizeId = new Map<string, Tag[]>();
  for (const link of (allPrizeTagLinks ?? []) as unknown as { prize_id: string; tag: Tag | null }[]) {
    if (!link.tag) continue;
    const list = tagsByPrizeId.get(link.prize_id) ?? [];
    list.push(link.tag);
    tagsByPrizeId.set(link.prize_id, list);
  }

  const colorsByPrizeId = new Map<string, ColorRef[]>();
  for (const link of (allPrizeFilamentLinks ?? []) as unknown as { prize_id: string; filament: ColorRef | null }[]) {
    if (!link.filament) continue;
    const list = colorsByPrizeId.get(link.prize_id) ?? [];
    list.push(link.filament);
    colorsByPrizeId.set(link.prize_id, list);
  }

  const tagsByRequestId = new Map<string, Tag[]>();
  for (const link of (allRequestTagLinks ?? []) as unknown as { request_id: string; tag: Tag | null }[]) {
    if (!link.tag) continue;
    const list = tagsByRequestId.get(link.request_id) ?? [];
    list.push(link.tag);
    tagsByRequestId.set(link.request_id, list);
  }

  const colorsByRequestId = new Map<string, ColorRef[]>();
  for (const link of (allRequestFilamentLinks ?? []) as unknown as { request_id: string; filament: ColorRef | null }[]) {
    if (!link.filament) continue;
    const list = colorsByRequestId.get(link.request_id) ?? [];
    list.push(link.filament);
    colorsByRequestId.set(link.request_id, list);
  }

  const reactionsByRequestCommentId = new Map<
    string,
    { id: string; comment_id: string; emoji: string; actor: string | null; created_at: string }[]
  >();
  for (const reaction of allRequestReactions ?? []) {
    const list = reactionsByRequestCommentId.get(reaction.comment_id) ?? [];
    list.push(reaction);
    reactionsByRequestCommentId.set(reaction.comment_id, list);
  }

  const requestCommentsByRequestId = new Map<string, NonNullable<PrizeRequest["comments"]>>();
  for (const comment of allRequestComments ?? []) {
    const list = requestCommentsByRequestId.get(comment.request_id) ?? [];
    list.push({ ...comment, reactions: reactionsByRequestCommentId.get(comment.id) ?? [] });
    requestCommentsByRequestId.set(comment.request_id, list);
  }

  const requestActivityByRequestId = new Map<string, NonNullable<PrizeRequest["activity"]>>();
  for (const entry of allRequestActivity ?? []) {
    const list = requestActivityByRequestId.get(entry.request_id) ?? [];
    list.push(entry as (typeof list)[number]);
    requestActivityByRequestId.set(entry.request_id, list);
  }

  const reactionsByPrizeCommentId = new Map<
    string,
    { id: string; comment_id: string; emoji: string; actor: string | null; created_at: string }[]
  >();
  for (const reaction of allPrizeReactions ?? []) {
    const list = reactionsByPrizeCommentId.get(reaction.comment_id) ?? [];
    list.push(reaction);
    reactionsByPrizeCommentId.set(reaction.comment_id, list);
  }

  const prizeCommentsByPrizeId = new Map<string, NonNullable<Prize["comments"]>>();
  for (const comment of allPrizeComments ?? []) {
    const list = prizeCommentsByPrizeId.get(comment.prize_id) ?? [];
    list.push({ ...comment, reactions: reactionsByPrizeCommentId.get(comment.id) ?? [] });
    prizeCommentsByPrizeId.set(comment.prize_id, list);
  }

  const prizeActivityByPrizeId = new Map<string, NonNullable<Prize["activity"]>>();
  for (const entry of allPrizeActivity ?? []) {
    const list = prizeActivityByPrizeId.get(entry.prize_id) ?? [];
    list.push(entry as (typeof list)[number]);
    prizeActivityByPrizeId.set(entry.prize_id, list);
  }

  // Keyed by prize id (not checkout id) -- a bin checkout's comments/
  // activity live on the prize itself, so every checkout of the same prize
  // shares the same discussion/history, same as the Prize Bin peek shows.
  const prizeExtrasByPrizeId: Record<string, { comments: NonNullable<Prize["comments"]>; activity: NonNullable<Prize["activity"]> }> = {};
  for (const p of prizes ?? []) {
    prizeExtrasByPrizeId[p.id] = {
      comments: prizeCommentsByPrizeId.get(p.id) ?? [],
      activity: prizeActivityByPrizeId.get(p.id) ?? [],
    };
  }

  const binRows: MergedCheckoutRow[] = (binCheckouts ?? []).map((c) => ({
    id: `bin-${c.id}`,
    rawId: c.id,
    source: "bin",
    prizeId: c.prize_id,
    date: c.date_checked_out,
    itemName: c.prize?.name ?? "(deleted prize)",
    who: c.bought_by,
    requestedBy: null,
    size: c.prize?.size ?? null,
    colors: colorsByPrizeId.get(c.prize_id) ?? [],
    themeTags: tagsByPrizeId.get(c.prize_id) ?? [],
    price: c.prize?.coin_price ?? null,
    makerworldLink: c.prize?.makerworld_link ?? null,
    photoUrl: c.prize?.photo_url ?? null,
    isPrintClub: false,
    notes: c.prize?.notes ?? null,
  }));

  const requestRows: MergedCheckoutRow[] = (fulfilledRequests ?? []).map((r) => ({
    id: `req-${r.id}`,
    rawId: r.id,
    source: "request",
    prizeId: null,
    date: r.date_requested,
    itemName: r.prize?.name ?? r.free_text_prize ?? "Untitled print",
    who: r.student_name,
    requestedBy: r.requested_by,
    size: r.size,
    colors: colorsByRequestId.get(r.id) ?? [],
    themeTags:
      tagsByRequestId.get(r.id) && tagsByRequestId.get(r.id)!.length > 0
        ? tagsByRequestId.get(r.id)!
        : tagsByPrizeId.get(r.prize_id ?? "") ?? [],
    price: r.sale_price ?? null,
    makerworldLink: r.links || r.prize?.makerworld_link || null,
    photoUrl: r.photo_url || r.prize?.photo_url || null,
    isPrintClub: r.is_print_club,
    notes: r.notes ?? null,
  }));

  const merged = [...binRows, ...requestRows];

  const allColors = new Map<string, ColorRef>();
  for (const row of merged) {
    for (const c of row.colors) allColors.set(c.id, c);
  }

  // Full raw request rows, keyed by id -- the flattened MergedCheckoutRow
  // above is just enough to render the table/summary DetailRows, but
  // editing a request-sourced row reuses the same RequestForm every other
  // request edit uses, which needs the actual PrizeRequest shape
  // (franchiseTags/colorFilaments included) rather than the flattened one.
  const requestsById: Record<string, PrizeRequest> = {};
  for (const r of fulfilledRequests ?? []) {
    requestsById[r.id] = {
      ...r,
      franchiseTags: tagsByRequestId.get(r.id) ?? [],
      colorFilaments: colorsByRequestId.get(r.id) ?? [],
      comments: requestCommentsByRequestId.get(r.id) ?? [],
      activity: requestActivityByRequestId.get(r.id) ?? [],
    } as PrizeRequest;
  }

  async function handleRemove(row: { source: "bin" | "request"; rawId: string }) {
    "use server";
    if (row.source === "bin") {
      await deleteCheckout(row.rawId);
    } else {
      await deleteRequest(row.rawId);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-ink">Checkouts</h1>
        <p className="text-sm text-muted mt-1">
          Every sale, from the prize bin and from printed requests, in one
          place.
        </p>
      </div>

      <details className="bg-card border border-border-warm rounded-xl">
        <summary className="cursor-pointer font-medium text-ink px-6 py-4">
          Log a prize bin checkout
        </summary>
        <div className="px-6 pb-6">
          <form action={createCheckout} className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-sm font-medium text-ink">Prize</label>
              <Select
                name="prize_id"
                defaultValue={NONE_VALUE}
                className="min-w-[16rem]"
                options={[
                  { value: NONE_VALUE, label: "Select a prize..." },
                  ...(prizes ?? []).map((p) => ({ value: p.id, label: p.name })),
                ]}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink">Date</label>
              <input
                type="date"
                name="date_checked_out"
                defaultValue={new Date().toISOString().slice(0, 10)}
                className="mt-1 rounded-md border border-border-warm-strong bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink">Bought by</label>
              <input
                name="bought_by"
                placeholder="Ninja name"
                className="mt-1 rounded-md border border-border-warm-strong bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage"
              />
            </div>
            <button
              type="submit"
              className="rounded-md bg-ink text-page text-sm font-medium px-4 py-2 hover:opacity-90"
            >
              Sold!
            </button>
          </form>
        </div>
      </details>

      {(binError || reqError) && (
        <ErrorNote>
          Couldn&apos;t load checkouts: {binError?.message ?? reqError?.message}
        </ErrorNote>
      )}

      <CheckoutsTable
        rows={merged}
        colorOptions={Array.from(allColors.values())}
        onRemove={handleRemove}
        prizes={prizes ?? []}
        filaments={filaments ?? []}
        allFranchiseTags={franchiseTagRows ?? []}
        requestsById={requestsById}
        prizeExtrasByPrizeId={prizeExtrasByPrizeId}
      />
    </div>
  );
}
