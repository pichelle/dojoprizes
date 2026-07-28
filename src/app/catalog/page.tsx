import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import type { Prize } from "@/lib/types";
import { COIN_TIER_LABELS, COIN_TIER_STYLES } from "@/lib/coins";
import { createPrize, quickCheckout } from "./actions";
import PrizeForm from "./PrizeForm";

const STATUS_STYLES: Record<Prize["status"], string> = {
  in_stock: "bg-green-100 text-green-800",
  low_stock: "bg-amber-100 text-amber-800",
  out_of_stock: "bg-red-100 text-red-800",
  print_on_request: "bg-blue-100 text-blue-800",
};

const STATUS_LABELS: Record<Prize["status"], string> = {
  in_stock: "In stock",
  low_stock: "Low stock",
  out_of_stock: "Out of stock",
  print_on_request: "Print-on-request",
};

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ add?: string; status?: string; q?: string }>;
}) {
  const params = await searchParams;
  const supabase = createServerClient();

  let query = supabase
    .from("prizes")
    .select("*")
    .order("name", { ascending: true });

  if (params.status) {
    query = query.eq("status", params.status);
  }
  if (params.q) {
    query = query.ilike("name", `%${params.q}%`);
  }

  const { data: prizes, error } = await query;
  const { data: filaments } = await supabase
    .from("filaments")
    .select("id, color_name")
    .order("color_name");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Prize Catalog</h1>
          <p className="text-sm text-neutral-500">
            {prizes?.length ?? 0} prize{prizes?.length === 1 ? "" : "s"}
          </p>
        </div>
        <Link
          href={params.add ? "/catalog" : "/catalog?add=1"}
          className="rounded-md bg-neutral-900 text-white text-sm font-medium px-4 py-2 hover:bg-neutral-800"
        >
          {params.add ? "Cancel" : "+ Add Prize"}
        </Link>
      </div>

      <form className="flex flex-wrap gap-2 items-center text-sm">
        <input
          type="text"
          name="q"
          placeholder="Search by name..."
          defaultValue={params.q ?? ""}
          className="rounded-md border border-neutral-300 px-3 py-1.5"
        />
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
        <button
          type="submit"
          className="rounded-md border border-neutral-300 px-3 py-1.5 hover:bg-neutral-100"
        >
          Filter
        </button>
      </form>

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

      {error && (
        <p className="text-sm text-red-600">
          Couldn&apos;t load prizes: {error.message}. Have you run
          supabase/schema.sql in your Supabase project yet?
        </p>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {prizes?.map((prize: Prize) => (
          <div
            key={prize.id}
            className="bg-white border border-neutral-200 rounded-xl overflow-hidden flex flex-col"
          >
            <div className="h-36 bg-neutral-100 flex items-center justify-center">
              {prize.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={prize.photo_url}
                  alt={prize.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-4xl">🎁</span>
              )}
            </div>
            <div className="p-4 flex-1 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/catalog/${prize.id}`}
                  className="font-medium hover:underline"
                >
                  {prize.name}
                </Link>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${STATUS_STYLES[prize.status]}`}
                >
                  {STATUS_LABELS[prize.status]}
                </span>
              </div>
              <div className="text-sm text-neutral-500">
                {prize.franchise ?? "Uncategorized"}
              </div>
              <div className="flex flex-wrap gap-1">
                {prize.coin_tier && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full border ${COIN_TIER_STYLES[prize.coin_tier]}`}
                  >
                    {COIN_TIER_LABELS[prize.coin_tier]}
                  </span>
                )}
                {prize.coin_price != null && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600">
                    {prize.coin_price} coins listed
                  </span>
                )}
              </div>
              <div className="text-sm text-neutral-600">
                Stock: <span className="font-medium">{prize.stock_count}</span>
              </div>
              <div className="mt-auto pt-2 flex gap-2">
                <form
                  action={async () => {
                    "use server";
                    await quickCheckout(prize.id);
                  }}
                >
                  <button
                    type="submit"
                    className="text-xs rounded-md border border-neutral-300 px-3 py-1.5 hover:bg-neutral-100"
                    title="Log that a student took this off the shelf"
                  >
                    Check out ✅
                  </button>
                </form>
                <Link
                  href={`/catalog/${prize.id}`}
                  className="text-xs rounded-md border border-neutral-300 px-3 py-1.5 hover:bg-neutral-100"
                >
                  Edit
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {prizes?.length === 0 && !error && (
        <p className="text-sm text-neutral-500">
          No prizes yet. Click &quot;+ Add Prize&quot; to add your first one.
        </p>
      )}
    </div>
  );
}
