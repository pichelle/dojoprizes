import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { createFilament } from "./actions";
import FilamentForm from "./FilamentForm";
import SortSelect from "./SortSelect";

export default async function FilamentPage({
  searchParams,
}: {
  searchParams: Promise<{ add?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const sort = params.sort ?? "name";
  const supabase = createServerClient();

  const { data: prizes } = await supabase
    .from("prizes")
    .select("id, name")
    .order("name");

  const { data: filamentsRaw, error } = await supabase
    .from("filaments")
    .select("*, prize_filament(prize:prizes(id, name))")
    .order("color_name");

  const filaments = (filamentsRaw ?? []).map((f) => ({
    ...f,
    linkedPrizes: (
      (f.prize_filament as { prize: { id: string; name: string } }[]) ?? []
    ).map((pf) => pf.prize),
  }));

  if (sort === "most_used") {
    filaments.sort((a, b) => b.linkedPrizes.length - a.linkedPrizes.length);
  } else if (sort === "least_used") {
    filaments.sort((a, b) => a.linkedPrizes.length - b.linkedPrizes.length);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl text-ink">Filament inventory</h1>
          <p className="text-sm text-muted max-w-2xl mt-1">
            Standalone-but-linked to the prize catalog — see which prizes a
            color affects before you run out, and which colors are actually
            worth restocking.
          </p>
        </div>
        <Link
          href={params.add ? "/filament" : "/filament?add=1"}
          className="rounded-md bg-ink text-page text-sm font-medium px-4 py-2 hover:opacity-90"
        >
          {params.add ? "Cancel" : "Add a color"}
        </Link>
      </div>

      {params.add && (
        <div className="bg-card border border-border-warm rounded-xl p-6">
          <h2 className="font-medium text-ink mb-4">Add a filament color</h2>
          <FilamentForm
            action={createFilament}
            allPrizes={prizes ?? []}
            submitLabel="Add filament"
          />
        </div>
      )}

      {error && (
        <p className="text-sm text-rust">
          Couldn&apos;t load filament: {error.message}
        </p>
      )}

      <SortSelect sort={sort} />

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filaments.map((f) => {
          const isLow =
            f.low_stock_threshold != null &&
            f.stock_level != null &&
            f.stock_level <= f.low_stock_threshold;

          return (
            <Link
              href={`/filament/${f.id}`}
              key={f.id}
              className="card-hover bg-card border border-border-warm rounded-xl p-4 hover:border-border-warm-strong flex flex-col gap-2"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium text-ink">{f.color_name}</span>
                <div className="flex flex-col items-end gap-1">
                  {isLow && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-rust/10 text-rust whitespace-nowrap">
                      Low stock
                    </span>
                  )}
                  <span className="text-xs px-2 py-0.5 rounded-full bg-page text-muted whitespace-nowrap">
                    Used by {f.linkedPrizes.length}{" "}
                    {f.linkedPrizes.length === 1 ? "prize" : "prizes"}
                  </span>
                </div>
              </div>
              <div className="text-sm text-muted">
                {f.material_type ?? "Material not set"}
              </div>
              <div className="text-sm text-ink">
                {f.stock_level ?? "—"} {f.stock_unit}
                {f.low_stock_threshold != null && (
                  <span className="text-muted">
                    {" "}
                    (low below {f.low_stock_threshold})
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1 pt-1">
                {f.linkedPrizes.length === 0 && (
                  <span className="text-xs text-muted">
                    No prizes linked
                  </span>
                )}
                {f.linkedPrizes.map((p: { id: string; name: string }) => (
                  <span
                    key={p.id}
                    className="text-xs px-2 py-0.5 rounded-full bg-page text-muted"
                  >
                    {p.name}
                  </span>
                ))}
              </div>
            </Link>
          );
        })}
      </div>

      {filaments.length === 0 && !error && (
        <p className="text-sm text-muted">
          No filament colors yet — add your first one to get started.
        </p>
      )}
    </div>
  );
}
