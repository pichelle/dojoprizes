import { createServerClient } from "@/lib/supabase/server";
import FilamentBoard from "./FilamentBoard";
import ErrorNote from "@/components/ErrorNote";

export default async function FilamentPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const params = await searchParams;
  const sort = params.sort ?? "name";
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

  if (sort === "most_used") {
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
