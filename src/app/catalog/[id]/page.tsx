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

  const { data: filaments } = await supabase
    .from("filaments")
    .select("id, color_name")
    .order("color_name");

  const { data: links } = await supabase
    .from("prize_filament")
    .select("filament_id")
    .eq("prize_id", id);

  const linkedFilamentIds = links?.map((l) => l.filament_id) ?? [];

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
        <PrizeForm
          action={boundUpdate}
          initial={prize}
          allFilaments={filaments ?? []}
          linkedFilamentIds={linkedFilamentIds}
          submitLabel="Save changes"
        />
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
