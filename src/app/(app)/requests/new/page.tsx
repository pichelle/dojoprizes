import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import RequestForm from "../RequestForm";
import { createRequest } from "../actions";

// Always fetch fresh prize/filament/tag lists rather than a build-time
// snapshot.
export const dynamic = "force-dynamic";

export default async function NewRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ prize_id?: string }>;
}) {
  const { prize_id: prizeId } = await searchParams;
  const supabase = createServerClient();

  const { data: prizes } = await supabase
    .from("prizes")
    .select("id, name")
    .order("name");

  const { data: filaments } = await supabase
    .from("filaments")
    .select("id, color_name, swatch_hex")
    .order("color_name");

  const { data: franchiseTags } = await supabase
    .from("franchise_tags")
    .select("id, name")
    .order("name");

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl text-ink">Log a request</h1>
        <Link
          href="/requests"
          className="text-sm text-ink border border-border-warm-strong rounded-md px-3 py-1.5 hover:bg-card"
        >
          Back to requests
        </Link>
      </div>

      <div className="bg-card border border-border-warm rounded-xl p-6">
        <RequestForm
          prizes={prizes ?? []}
          filaments={filaments ?? []}
          allFranchiseTags={franchiseTags ?? []}
          initialPrizeId={prizeId}
          action={createRequest}
        />
      </div>
    </div>
  );
}
