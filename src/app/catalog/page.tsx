import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import type { Prize } from "@/lib/types";
import { createPrize, quickCheckout } from "./actions";
import PrizeForm from "./PrizeForm";
import PrizeCard from "./PrizeCard";

const STATUS_LABELS: Record<Prize["status"], string> = {
  in_stock: "In stock",
  low_stock: "Low stock",
  out_of_stock: "Out of stock",
  print_on_request: "Print-on-request",
};

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{
    add?: string;
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

  const { data: checkoutFranchiseRows } = await supabase
    .from("checkouts")
    .select("prize:prizes(franchise)");

  const mostPopularFranchise = mostCommon(
    (checkoutFranchiseRows ?? [])
      .map((r) => (r.prize as unknown as { franchise: string | null })?.franchise)
      .filter((f): f is string => !!f),
  );

  // Filter option sources
  const { data: allPrizesForFranchise } = await supabase
    .from("prizes")
    .select("franchise");
  const franchiseOptions = Array.from(
    new Set(
      (allPrizesForFranchise ?? [])
        .map((p) => p.franchise)
        .filter((f): f is string => !!f),
    ),
  ).sort();

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

  let query = supabase.from("prizes").select("*");

  if (params.status) query = query.eq("status", params.status);
  if (params.q) query = query.ilike("name", `%${params.q}%`);
  if (params.franchise) query = query.eq("franchise", params.franchise);
  if (prizeIdsForColor) query = query.in("id", prizeIdsForColor);

  if (params.sort === "price_asc") {
    query = query.order("coin_price", { ascending: true, nullsFirst: false });
  } else if (params.sort === "price_desc") {
    query = query.order("coin_price", { ascending: false, nullsFirst: false });
  } else {
    query = query.order("name", { ascending: true });
  }

  const { data: prizes, error } = await query;
  const { data: filaments } = await supabase
    .from("filaments")
    .select("id, color_name")
    .order("color_name");

  async function handleCheckout(prizeId: string) {
    "use server";
    await quickCheckout(prizeId);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Prize Catalog</h1>
        </div>
        <Link
          href={params.add ? "/catalog" : "/catalog?add=1"}
          className="rounded-md bg-neutral-900 text-white text-sm font-medium px-4 py-2 hover:bg-neutral-800"
        >
          {params.add ? "Cancel" : "+ Add Prize"}
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

      {params.add && (
        <div className="bg-white border border-neutral-200 rounded-xl p-6">
          <h2 className="font-medium mb-4">Add a new prize</h2>
          <PrizeForm
            action={createPrize}
            allFilaments={filaments ?? []}
            submitLabel="Add prize"
          />
        </div>
      )}

      <form className="flex flex-wrap gap-2 items-center text-sm">
        <input
          type="text"
          name="q"
          placeholder="Search by name..."
          defaultValue={params.q ?? ""}
          className="rounded-md border border-neutral-300 px-3 py-1.5"
        />
        <select
          name="franchise"
          defaultValue={params.franchise ?? ""}
          className="rounded-md border border-neutral-300 px-3 py-1.5 bg-white"
        >
          <option value="">All themes</option>
          {franchiseOptions.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
        <select
          name="color"
          defaultValue={params.color ?? ""}
          className="rounded-md border border-neutral-300 px-3 py-1.5 bg-white"
        >
          <option value="">All colors</option>
          {filamentOptions?.map((f) => (
            <option key={f.id} value={f.id}>
              {f.color_name}
            </option>
          ))}
        </select>
        <select
          name="status"
          defaultValue={params.status ?? ""}
          className="rounded-md border border-neutral-300 px-3 py-1.5 bg-white"
        >
          <option value="">All statuses</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          name="sort"
          defaultValue={params.sort ?? ""}
          className="rounded-md border border-neutral-300 px-3 py-1.5 bg-white"
        >
          <option value="">Sort: Name (A–Z)</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
        </select>
        <button
          type="submit"
          className="rounded-md border border-neutral-300 px-3 py-1.5 hover:bg-neutral-100"
        >
          Filter
        </button>
      </form>

      {error && (
        <p className="text-sm text-red-600">
          Couldn&apos;t load prizes: {error.message}. Have you run
          supabase/schema.sql in your Supabase project yet?
        </p>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {prizes?.map((prize: Prize) => (
          <PrizeCard key={prize.id} prize={prize} onCheckout={handleCheckout} />
        ))}
      </div>

      {prizes?.length === 0 && !error && (
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
