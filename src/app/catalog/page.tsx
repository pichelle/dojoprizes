import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import type { Prize } from "@/lib/types";
import { quickCheckout } from "./actions";
import PrizeCard from "./PrizeCard";
import CatalogFilterBar from "./CatalogFilterBar";

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    q?: string;
    franchise?: string;
    color?: string;
    sort?: string;
  }>;
}) {
  const params = await searchParams;
  const supabase = createServerClient();

  // Stats row is always computed across ALL prizes/checkouts, independent
  // of whatever filters are currently applied below.
  const { count: totalPrizes } = await supabase
    .from("prizes")
    .select("*", { count: "exact", head: true });

  const { count: totalCheckedOut } = await supabase
    .from("checkouts")
    .select("*", { count: "exact", head: true });

  // All prize <-> franchise tag links, used both for the "most popular
  // franchise" stat and to decorate each card below.
  const { data: allTagLinks } = await supabase
    .from("prize_franchise_tags")
    .select("prize_id, tag:franchise_tags(id, name)");

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

  const { data: checkoutRows } = await supabase
    .from("checkouts")
    .select("prize_id");
  const franchiseOccurrences: string[] = [];
  for (const row of checkoutRows ?? []) {
    const tags = tagsByPrizeId.get(row.prize_id) ?? [];
    for (const t of tags) franchiseOccurrences.push(t.name);
  }
  const mostPopularFranchise = mostCommon(franchiseOccurrences);

  const { data: franchiseTagRows } = await supabase
    .from("franchise_tags")
    .select("id, name")
    .order("name");
  const franchiseOptions = (franchiseTagRows ?? []).map((t) => t.name);

  const { data: filamentOptions } = await supabase
    .from("filaments")
    .select("id, color_name")
    .order("color_name");

  // Main filtered/sorted query
  let prizeIdsForColor: string[] | null = null;
  if (params.color) {
    const { data: links } = await supabase
      .from("prize_filament")
      .select("prize_id")
      .eq("filament_id", params.color);
    prizeIdsForColor = (links ?? []).map((l) => l.prize_id);
  }

  let prizeIdsForFranchise: string[] | null = null;
  if (params.franchise) {
    const tag = (franchiseTagRows ?? []).find(
      (t) => t.name.toLowerCase() === params.franchise!.toLowerCase(),
    );
    prizeIdsForFranchise = tag
      ? Array.from(tagsByPrizeId.entries())
          .filter(([, tags]) => tags.some((t) => t.id === tag.id))
          .map(([prizeId]) => prizeId)
      : [];
  }

  let query = supabase.from("prizes").select("*");

  if (params.status) query = query.eq("status", params.status);
  if (params.q) query = query.ilike("name", `%${params.q}%`);
  if (prizeIdsForColor) query = query.in("id", prizeIdsForColor);
  if (prizeIdsForFranchise) query = query.in("id", prizeIdsForFranchise);

  if (params.sort === "price_asc") {
    query = query.order("coin_price", { ascending: true, nullsFirst: false });
  } else if (params.sort === "price_desc") {
    query = query.order("coin_price", { ascending: false, nullsFirst: false });
  } else {
    query = query.order("name", { ascending: true });
  }

  const { data: prizesRaw, error } = await query;
  const prizes = (prizesRaw ?? []).map((p) => ({
    ...p,
    franchiseTags: tagsByPrizeId.get(p.id) ?? [],
  }));

  async function handleCheckout(prizeId: string) {
    "use server";
    await quickCheckout(prizeId);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Prize Catalog</h1>
        <Link
          href="/catalog/new"
          className="rounded-md bg-neutral-900 text-white text-sm font-medium px-4 py-2 hover:bg-neutral-800"
        >
          + Add Prize
        </Link>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard label="Total prizes" value={totalPrizes ?? 0} />
        <StatCard label="Checked out (all time)" value={totalCheckedOut ?? 0} />
        <StatCard
          label="Most popular franchise"
          value={mostPopularFranchise ?? "No checkouts yet"}
          small={!mostPopularFranchise}
        />
      </div>

      <CatalogFilterBar
        franchiseOptions={franchiseOptions}
        colorOptions={(filamentOptions ?? []).map((f) => ({ id: f.id, name: f.color_name }))}
      />

      {error && (
        <p className="text-sm text-red-600">
          Couldn&apos;t load prizes: {error.message}. Have you run
          supabase/schema.sql in your Supabase project yet?
        </p>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {prizes.map((prize) => (
          <PrizeCard
            key={prize.id}
            prize={prize as Prize}
            onCheckout={handleCheckout}
          />
        ))}
      </div>

      {prizes.length === 0 && !error && (
        <p className="text-sm text-neutral-500">
          No prizes match these filters.
        </p>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  small,
}: {
  label: string;
  value: string | number;
  small?: boolean;
}) {
  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-4">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className={small ? "text-sm font-medium mt-1" : "text-2xl font-semibold mt-1"}>
        {value}
      </div>
    </div>
  );
}

function mostCommon(values: string[]): string | null {
  if (values.length === 0) return null;
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best: string | null = null;
  let bestCount = 0;
  for (const [v, c] of counts) {
    if (c > bestCount) {
      best = v;
      bestCount = c;
    }
  }
  return best;
}
