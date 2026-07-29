import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import type { Prize } from "@/lib/types";
import { quickCheckout } from "./actions";
import PrizeCard from "./PrizeCard";
import CatalogFilterBar from "./CatalogFilterBar";
import FilterSidebar from "@/components/FilterSidebar";
import ErrorNote from "@/components/ErrorNote";

const STATUS_FILTER_OPTIONS = [
  { value: "in_stock", label: "In stock" },
  { value: "low_stock", label: "Low stock" },
  { value: "out_of_stock", label: "Out of stock" },
  { value: "print_on_request", label: "Print-on-request" },
];

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    q?: string;
    theme?: string;
    color?: string;
    sort?: string;
  }>;
}) {
  const params = await searchParams;
  const selectedThemes = params.theme ? params.theme.split(",").filter(Boolean) : [];
  const selectedColors = params.color ? params.color.split(",").filter(Boolean) : [];
  const selectedStatuses = params.status ? params.status.split(",").filter(Boolean) : [];
  const supabase = createServerClient();

  // Stats row is always computed across ALL prizes/checkouts, independent
  // of whatever filters are currently applied below. These queries don't
  // depend on each other, so fetch them together.
  const [
    { count: totalPrizes },
    { count: totalCheckedOut },
    { data: allTagLinks },
    { data: checkoutRows },
    { data: franchiseTagRows },
    { data: filamentOptions },
  ] = await Promise.all([
    supabase.from("prizes").select("*", { count: "exact", head: true }),
    supabase.from("checkouts").select("*", { count: "exact", head: true }),
    supabase.from("prize_franchise_tags").select("prize_id, tag:franchise_tags(id, name)"),
    supabase.from("checkouts").select("prize_id"),
    supabase.from("franchise_tags").select("id, name").order("name"),
    supabase.from("filaments").select("id, color_name, swatch_hex").order("color_name"),
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

  const franchiseOccurrences: string[] = [];
  for (const row of checkoutRows ?? []) {
    const tags = tagsByPrizeId.get(row.prize_id) ?? [];
    for (const t of tags) franchiseOccurrences.push(t.name);
  }
  const mostPopularFranchise = mostCommon(franchiseOccurrences);

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

  const statLine = `${totalPrizes ?? 0} prize${totalPrizes === 1 ? "" : "s"} · ${totalCheckedOut ?? 0} bought · ${mostPopularFranchise ?? "no checkouts yet"}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl text-ink">Prize catalog</h1>
          <p className="text-sm text-muted mt-1">{statLine}</p>
        </div>
        <Link
          href="/catalog/new"
          className="rounded-md bg-ink text-page text-sm font-medium px-4 py-2 hover:opacity-90"
        >
          Add a prize
        </Link>
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
              key: "status",
              label: "Status",
              type: "checkbox",
              options: STATUS_FILTER_OPTIONS,
            },
          ]}
        />

        <div className="space-y-6 min-w-0">
          <CatalogFilterBar />

          {error && (
            <ErrorNote>
              Couldn&apos;t load prizes: {error.message}. Have you run
              supabase/schema.sql in your Supabase project yet?
            </ErrorNote>
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
            <p className="text-sm text-muted">
              Nothing here yet. Add your first prize to get started.
            </p>
          )}
        </div>
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
