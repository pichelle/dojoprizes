import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import FilamentForm from "../FilamentForm";
import { updateFilament, deleteFilament } from "../actions";
import ActionButton from "@/components/ActionButton";
import AmazonLinkButton from "@/components/AmazonLinkButton";
import ErrorNote from "@/components/ErrorNote";

export default async function EditFilamentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error: errorMessage } = await searchParams;
  const supabase = createServerClient();

  const { data: filament } = await supabase
    .from("filaments")
    .select("*")
    .eq("id", id)
    .single();

  if (!filament) notFound();

  const { data: prizes } = await supabase
    .from("prizes")
    .select("id, name")
    .order("name");

  const { data: links } = await supabase
    .from("prize_filament")
    .select("prize_id")
    .eq("filament_id", id);

  const linkedPrizeIds = links?.map((l) => l.prize_id) ?? [];

  const boundUpdate = updateFilament.bind(null, id);
  const boundDelete = deleteFilament.bind(null, id);

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl text-ink">Edit filament</h1>
        <Link
          href="/filament"
          className="text-sm text-ink border border-border-warm-strong rounded-md px-3 py-1.5 hover:bg-page"
        >
          Back to filament
        </Link>
      </div>

      {errorMessage && <ErrorNote>{errorMessage}</ErrorNote>}

      <div className="bg-card border border-border-warm rounded-xl p-6">
        <FilamentForm
          action={boundUpdate}
          initial={filament}
          allPrizes={prizes ?? []}
          linkedPrizeIds={linkedPrizeIds}
          submitLabel="Save changes"
        />
      </div>

      <div className="flex items-center justify-between">
        {filament.amazon_link ? (
          <AmazonLinkButton href={filament.amazon_link} />
        ) : (
          <span />
        )}
        <ActionButton
          action={boundDelete}
          toastMessage="Filament color deleted"
          confirmMessage={`Delete ${filament.color_name}? This can't be undone.`}
          className="text-sm text-rust hover:underline"
        >
          Delete this filament color
        </ActionButton>
      </div>
    </div>
  );
}
