import { createServerClient } from "@/lib/supabase/server";
import type { Prize } from "@/lib/types";
import { quickCheckout, renameFranchiseTag } from "./actions";
import CatalogBoard from "./CatalogBoard";
import FilterSidebar from "@/components/FilterSidebar";
import ErrorNote from "@/components/ErrorNote";

const STATUS_FILTER_OPTIONS = [
  { value: "in_stock", label: "In stock" },
  { value: "print_on_request", label: "Print-on-request" },
];

const SIZE_FILTER_OPTIONS = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
  { value: "xlarge", label: "X-Large" },
  { value: "true_to_size", label: "True to size" },
];

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    q?: string;
    theme?: string;
    color?: string;
    size?: string;
    sort?: string;
  }>;
}) {
  const params = await searchParams;
  const selectedThemes = params.theme ? params.theme.split(",").filter(Boolean) : [];
  const selectedColors = params.color ? params.color.split(",").filter(Boolean) : [];
  const selectedSizes = params.size ? params.size.split(",").filter(Boolean) : [];
  const selectedStatuses = params.status ? params.status.split(",").filter(Boolean) : [];
  const filtersActive = Boolean(
    selectedThemes.length > 0 ||
      selectedColors.length > 0 ||
      selectedSizes.length > 0 ||
      selectedStatuses.length > 0 ||
      params.q,
  );
  const supabase = createServerClient();

  // Stats row is always computed across ALL prizes/checkouts, independent
  // of whatever filters are currently applied below. These queries don't
  // depend on each other, so fetch them together.
  //
  // "Prizes" counts distinct catalog entries (rows), not physical units on
  // the shelf -- a prize with stock_count 5 still counts as 1 here.
  const [
    { count: totalPrizes },
    { data: allTagLinks },
    { data: franchiseTagRows },
    { data: filamentOptions },
    { data: allFilamentLinks },
    { data: recentCheckouts },
    { data: allComments },
    { data: allActivity },
    { data: allReactions },
  ] = await Promise.all([
    supabase.from("prizes").select("*", { count: "exact", head: true }),
    supabase.from("prize_franchise_tags").select("prize_id, tag:franchise_tags(id, name)"),
    supabase.from("franchise_tags").select("id, name").order("name"),
    supabase.from("filaments").select("id, color_name, swatch_hex").order("color_name"),
    supabase.from("prize_filament").select("prize_id, filament:filaments(id, color_name)"),
    supabase
      .from("checkouts")
      .select("prize_id, date_checked_out")
      .order("date_checked_out", { ascending: false })
      .order("created_at", { ascending: false }),
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

  const tagsByPrizeId = new Map<string, { id: string; name: string }[]>();
  for (const link of (allTagLinks ?? []) as unknown as {
    prize_id: string;
    tag: { id: string; name: string } | null;
  }[]) {
    if (!link.tag) continue;
    const list = tagsByPrizeId.get(link.prize_id) ?? [];
    list.push(link.tag);
    tagsByPrizeId.set(link.prize_id, list);
  }

  const filamentsByPrizeId = new Map<string, { id: string; color_name: string }[]>();
  for (const link of (allFilamentLinks ?? []) as unknown as {
    prize_id: string;
    filament: { id: string; color_name: string } | null;
  }[]) {
    if (!link.filament) continue;
    const list = filamentsByPrizeId.get(link.prize_id) ?? [];
    list.push(link.filament);
    filamentsByPrizeId.set(link.prize_id, list);
  }

  // Most recent checkout date per prize -- rows already ordered newest
  // first above, so the first hit per prize_id wins.
  const latestCheckoutByPrize: Record<string, string> = {};
  for (const c of (recentCheckouts ?? []) as { prize_id: string; date_checked_out: string }[]) {
    if (!(c.prize_id in latestCheckoutByPrize)) {
      latestCheckoutByPrize[c.prize_id] = c.date_checked_out;
    }
  }

  const franchiseOptions = (franchiseTagRows ?? []).map((t) => t.name);

  // Main filtered/sorted query
  let prizeIdsForColor: string[] | null = null;
  if (selectedColors.length > 0) {
    const { data: links } = await supabase
      .from("prize_filament")
      .select("prize_id")
      .in("filament_id", selectedColors);
    prizeIdsForColor = (links ?? []).map((l) => l.prize_id);
  }

  let prizeIdsForFranchise: string[] | null = null;
  if (selectedThemes.length > 0) {
    const selectedLower = selectedThemes.map((t) => t.toLowerCase());
    const tagIds = (franchiseTagRows ?? [])
      .filter((t) => selectedLower.includes(t.name.toLowerCase()))
      .map((t) => t.id);
    prizeIdsForFranchise = Array.from(tagsByPrizeId.entries())
      .filter(([, tags]) => tags.some((t) => tagIds.includes(t.id)))
      .map(([prizeId]) => prizeId);
  }

  let query = supabase.from("prizes").select("*");

  if (selectedStatuses.length > 0) query = query.in("status", selectedStatuses);
  if (selectedSizes.length > 0) query = query.in("size", selectedSizes);
  if (params.q) query = query.ilike("name", `%${params.q}%`);
  if (prizeIdsForColor) query = query.in("id", prizeIdsForColor);
  if (prizeIdsForFranchise) query = query.in("id", prizeIdsForFranchise);

  if (params.sort === "price_asc") {
    query = query.order("coin_price", { ascending: true, nullsFirst: false });
  } else if (params.sort === "price_desc") {
    query = query.order("coin_price", { ascending: false, nullsFirst: false });
  } else if (params.sort === "date_asc") {
    query = query.order("created_at", { ascending: true });
  } else {
    // Default: newest added first.
    query = query.order("created_at", { ascending: false });
  }

  const { data: prizesRaw, error } = await query;

  const reactionsByCommentId = new Map<
    string,
    { id: string; comment_id: string; emoji: string; actor: string | null; created_at: string }[]
  >();
  for (const reaction of allReactions ?? []) {
    const list = reactionsByCommentId.get(reaction.comment_id) ?? [];
    list.push(reaction);
    reactionsByCommentId.set(reaction.comment_id, list);
  }

  const commentsByPrizeId = new Map<
    string,
    {
      id: string;
      prize_id: string;
      author: string | null;
      body: string;
      created_at: string;
      reactions: { id: string; comment_id: string; emoji: string; actor: string | null; created_at: string }[];
    }[]
  >();
  for (const comment of allComments ?? []) {
    const list = commentsByPrizeId.get(comment.prize_id) ?? [];
    list.push({ ...comment, reactions: reactionsByCommentId.get(comment.id) ?? [] });
    commentsByPrizeId.set(comment.prize_id, list);
  }

  const activityByPrizeId = new Map<
    string,
    {
      id: string;
      prize_id: string;
      actor: string | null;
      event_type: "created" | "edited" | "reprinted";
      changes: { field: string; label: string; from: string | null; to: string | null }[];
      created_at: string;
    }[]
  >();
  for (const entry of allActivity ?? []) {
    const list = activityByPrizeId.get(entry.prize_id) ?? [];
    list.push(entry as (typeof list)[number]);
    activityByPrizeId.set(entry.prize_id, list);
  }

  const prizes = (prizesRaw ?? []).map((p) => ({
    ...p,
    franchiseTags: tagsByPrizeId.get(p.id) ?? [],
    filaments: filamentsByPrizeId.get(p.id) ?? [],
    comments: commentsByPrizeId.get(p.id) ?? [],
    activity: activityByPrizeId.get(p.id) ?? [],
  }));

  async function handleCheckout(prizeId: string, boughtBy: string | null) {
    "use server";
    await quickCheckout(prizeId, boughtBy);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl text-ink">Prize Bin</h1>
          <p className="text-sm text-muted mt-1">
            Full prize bin history: see what&apos;s currently in stock, what&apos;s
            been printed before.
          </p>
        </div>
        <div className="flex gap-3">
          <div className="bg-nav border border-border-warm rounded-xl px-4 py-2.5 text-left">
            <p className="text-xs text-muted">Unique prizes</p>
            <p className="text-lg font-bold text-ink mt-0.5">{totalPrizes ?? 0}</p>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-[200px_1fr] gap-6 items-start">
        <FilterSidebar
          basePath="/catalog"
          extraParams={["q", "sort"]}
          groups={[
            {
              key: "theme",
              label: "Theme",
              type: "checkbox",
              options: franchiseOptions.map((f) => ({ value: f, label: f })),
              onRenameOption: renameFranchiseTag,
            },
            {
              key: "color",
              label: "Color",
              type: "checkbox",
              options: (filamentOptions ?? []).map((f) => ({
                value: f.id,
                label: f.color_name,
                swatch: f.swatch_hex,
              })),
            },
            {
              key: "size",
              label: "Size",
              type: "checkbox",
              options: SIZE_FILTER_OPTIONS,
            },
            {
              key: "status",
              label: "Status",
              type: "checkbox",
              options: STATUS_FILTER_OPTIONS,
            },
          ]}
        />

        <div className="space-y-6 min-w-0">
          {error && (
            <ErrorNote>
              Couldn&apos;t load prizes: {error.message}. Have you run
              supabase/schema.sql in your Supabase project yet?
            </ErrorNote>
          )}

          <CatalogBoard
            prizes={prizes as Prize[]}
            allFilaments={filamentOptions ?? []}
            allFranchiseTags={franchiseTagRows ?? []}
            latestCheckoutByPrize={latestCheckoutByPrize}
            onCheckout={handleCheckout}
            filtersActive={filtersActive}
          />
        </div>
      </div>
    </div>
  );
}
