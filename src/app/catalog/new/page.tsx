import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import PrizeForm from "../PrizeForm";
import { createPrize } from "../actions";

// Always fetch fresh filament/tag lists rather than a build-time snapshot.
export const dynamic = "force-dynamic";

export default async function NewPrizePage() {
  const supabase = createServerClient();

  const { data: filaments } = await supabase
    .from("filaments")
    .select("id, color_name")
    .order("color_name");

  const { data: franchiseTags } = await supabase
    .from("franchise_tags")
    .select("id, name")
    .order("name");

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Add a new prize</h1>
        <Link href="/catalog" className="text-sm text-neutral-500 hover:underline">
          ← Back to catalog
        </Link>
      </div>

      <div className="bg-white border border-neutral-200 rounded-xl p-6">
        <PrizeForm
          action={createPrize}
          allFilaments={filaments ?? []}
          allFranchiseTags={franchiseTags ?? []}
          submitLabel="Add prize"
        />
      </div>
    </div>
  );
}
