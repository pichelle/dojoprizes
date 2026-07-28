import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import PrizeForm from "../PrizeForm";
import { updatePrize, deletePrize } from "../actions";

export default async function EditPrizePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createServerClient();

  const { data: prize } = await supabase
    .from("prizes")
    .select("*")
    .eq("id", id)
    .single();

  if (!prize) notFound();

  const { data: links } = await supabase
    .from("prize_filament")
    .select("filament:filaments(id, color_name, material_type)")
    .eq("prize_id", id);

  const boundUpdate = updatePrize.bind(null, id);
  const boundDelete = deletePrize.bind(null, id);

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Edit prize</h1>
        <Link href="/catalog" className="text-sm text-neutral-500 hover:underline">
          ← Back to catalog
        </Link>
      </div>

      <div className="bg-white border border-neutral-200 rounded-xl p-6">
        <PrizeForm action={boundUpdate} initial={prize} submitLabel="Save changes" />
      </div>

      <div className="bg-white border border-neutral-200 rounded-xl p-6">
        <h2 className="font-medium mb-2">Filament colors this prize needs</h2>
        {links && links.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {links.map((l, i) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const f = l.filament as any;
              return (
                <li
                  key={i}
                  className="text-xs px-2 py-1 rounded-full bg-neutral-100 text-neutral-700"
                >
                  {f?.color_name}
                  {f?.material_type ? ` (${f.material_type})` : ""}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-neutral-500">No filament colors linked yet.</p>
        )}
        <Link
          href="/filament"
          className="mt-3 inline-block text-sm text-neutral-600 hover:underline"
        >
          Manage filament links →
        </Link>
      </div>

      <form
        action={async () => {
          "use server";
          await boundDelete();
        }}
      >
        <button
          type="submit"
          className="text-sm text-red-600 hover:underline"
        >
          Delete this prize
        </button>
      </form>
    </div>
  );
}
