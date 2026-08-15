import { createServerClient } from "@/lib/supabase/server";
import FilamentBoard from "./FilamentBoard";
import ErrorNote from "@/components/ErrorNote";
import { compareByHue } from "@/lib/colorSort";

export default async function FilamentPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const params = await searchParams;
  // Defaults to a color-wheel sort (dark-to-light reds, then oranges,
  // yellows, greens, blues, purples...) rather than alphabetical, since
  // that's how you'd actually scan a shelf of filament for a match.
  const sort = params.sort ?? "hue";
  const supabase = createServerClient();

  const [{ data: prizes }, { data: filamentsRaw, error }] = await Promise.all([
    supabase.from("prizes").select("id, name").order("name"),
    supabase
      .from("filaments")
      .select("*, prize_filament(prize:prizes(id, name))")
      .order("color_name"),
  ]);

  const filaments = (filamentsRaw ?? []).map((f) => ({
    ...f,
    linkedPrizes: (
      (f.prize_filament as { prize: { id: string; name: string } }[]) ?? []
    ).map((pf) => pf.prize),
  }));

  if (sort === "hue") {
    filaments.sort(compareByHue);
  } else if (sort === "most_used") {
    filaments.sort((a, b) => b.linkedPrizes.length - a.linkedPrizes.length);
  } else if (sort === "least_used") {
    filaments.sort((a, b) => a.linkedPrizes.length - b.linkedPrizes.length);
  }

  return (
    <div className="space-y-6">
      {error && (
        <ErrorNote>Couldn&apos;t load filament: {error.message}</ErrorNote>
      )}
      <FilamentBoard filaments={filaments} prizes={prizes ?? []} sort={sort} />
    </div>
  );
}
