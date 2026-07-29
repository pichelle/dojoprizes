import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import PrizeForm from "../PrizeForm";
import { updatePrize, deletePrize } from "../actions";
import ActionButton from "@/components/ActionButton";

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

  const { data: franchiseTags } = await supabase
    .from("franchise_tags")
    .select("id, name")
    .order("name");

  const { data: tagLinks } = await supabase
    .from("prize_franchise_tags")
    .select("tag:franchise_tags(name)")
    .eq("prize_id", id);

  const initialFranchiseTags = (
    (tagLinks as { tag: { name: string } | null }[] | null) ?? []
  )
    .map((l) => l.tag?.name)
    .filter((n): n is string => !!n);

  const boundUpdate = updatePrize.bind(null, id);
  const boundDelete = deletePrize.bind(null, id);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl text-ink">Edit prize</h1>
        <Link
          href="/catalog"
          className="text-sm text-ink border border-border-warm-strong rounded-md px-3 py-1.5 hover:bg-page"
        >
          Back to catalog
        </Link>
      </div>

      <div className="bg-card border border-border-warm rounded-xl p-6">
        <PrizeForm
          action={boundUpdate}
          initial={prize}
          allFilaments={filaments ?? []}
          linkedFilamentIds={linkedFilamentIds}
          allFranchiseTags={franchiseTags ?? []}
          initialFranchiseTags={initialFranchiseTags}
          submitLabel="Save changes"
        />
      </div>

      <ActionButton
        action={boundDelete}
        toastMessage="Prize deleted"
        confirmMessage={`Delete ${prize.name}? This can't be undone.`}
        className="text-sm text-rust hover:underline"
      >
        Delete this prize
      </ActionButton>
    </div>
  );
}
