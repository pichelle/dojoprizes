import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { createFilament } from "./actions";
import FilamentForm from "./FilamentForm";

export default async function FilamentPage({
  searchParams,
}: {
  searchParams: Promise<{ add?: string }>;
}) {
  const params = await searchParams;
  const supabase = createServerClient();

  const { data: prizes } = await supabase
    .from("prizes")
    .select("id, name")
    .order("name");

  const { data: filaments, error } = await supabase
    .from("filaments")
    .select("*, prize_filament(prize:prizes(id, name))")
    .order("color_name");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Filament Inventory</h1>
          <p className="text-sm text-neutral-500 max-w-2xl">
            Standalone-but-linked to the prize catalog — see which prizes a
            color affects before you run out.
          </p>
        </div>
        <Link
          href={params.add ? "/filament" : "/filament?add=1"}
          className="rounded-md bg-neutral-900 text-white text-sm font-medium px-4 py-2 hover:bg-neutral-800"
        >
          {params.add ? "Cancel" : "+ Add Filament"}
        </Link>
      </div>

      {params.add && (
        <div className="bg-white border border-neutral-200 rounded-xl p-6">
          <h2 className="font-medium mb-4">Add a filament color</h2>
          <FilamentForm
            action={createFilament}
            allPrizes={prizes ?? []}
            submitLabel="Add filament"
          />
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600">
          Couldn&apos;t load filament: {error.message}
        </p>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filaments?.map((f) => {
          const isLow =
            f.low_stock_threshold != null &&
            f.stock_level != null &&
            f.stock_level <= f.low_stock_threshold;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const linkedPrizes = (f.prize_filament as any[])?.map(
            (pf) => pf.prize,
          ) ?? [];

          return (
            <Link
              href={`/filament/${f.id}`}
              key={f.id}
              className="bg-white border border-neutral-200 rounded-xl p-4 hover:border-neutral-300 flex flex-col gap-2"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium">{f.color_name}</span>
                {isLow && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-800 whitespace-nowrap">
                    Low stock
                  </span>
                )}
              </div>
              <div className="text-sm text-neutral-500">
                {f.material_type ?? "Material not set"}
              </div>
              <div className="text-sm text-neutral-600">
                {f.stock_level ?? "—"} {f.stock_unit}
                {f.low_stock_threshold != null && (
                  <span className="text-neutral-400">
                    {" "}
                    (low below {f.low_stock_threshold})
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1 pt-1">
                {linkedPrizes.length === 0 && (
                  <span className="text-xs text-neutral-400">
                    No prizes linked
                  </span>
                )}
                {linkedPrizes.map((p) => (
                  <span
                    key={p.id}
                    className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600"
                  >
                    {p.name}
                  </span>
                ))}
              </div>
            </Link>
          );
        })}
      </div>

      {filaments?.length === 0 && !error && (
        <p className="text-sm text-neutral-500">
          No filament colors yet. Click &quot;+ Add Filament&quot; to add one.
        </p>
      )}
    </div>
  );
}
