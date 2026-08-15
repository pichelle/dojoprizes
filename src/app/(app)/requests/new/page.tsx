import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import RequestForm from "../RequestForm";
import type { RequestSize } from "@/lib/types";
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

  // "Print another" on a print-on-request catalog card links here with
  // ?prize_id= -- pull that prize's own details (image, size, color,
  // theme) so the request form arrives pre-filled instead of just the
  // prize dropdown.
  let prefillFromPrize: { photo_url: string | null; size: RequestSize | null } | null = null;
  let prefillFranchiseTags: string[] = [];
  let prefillColorFilamentIds: string[] = [];

  if (prizeId) {
    const [{ data: prizeRow }, { data: tagLinks }, { data: filamentLinks }] = await Promise.all([
      supabase.from("prizes").select("photo_url, size").eq("id", prizeId).maybeSingle(),
      supabase
        .from("prize_franchise_tags")
        .select("tag:franchise_tags(name)")
        .eq("prize_id", prizeId),
      supabase.from("prize_filament").select("filament_id").eq("prize_id", prizeId),
    ]);

    if (prizeRow) prefillFromPrize = prizeRow;
    prefillFranchiseTags = (
      (tagLinks ?? []) as unknown as { tag: { name: string } | null }[]
    )
      .map((l) => l.tag?.name)
      .filter((n): n is string => Boolean(n));
    prefillColorFilamentIds = (filamentLinks ?? []).map((l) => l.filament_id);
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl text-ink">Log a request</h1>
        <Link
          href="/requests"
          className="text-sm text-ink border border-border-warm-strong rounded-md px-3 py-1.5 hover:bg-nav-hover"
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
          initialPhotoUrl={prefillFromPrize?.photo_url}
          initialSize={prefillFromPrize?.size}
          initialFranchiseTags={prefillFranchiseTags}
          initialColorFilamentIds={prefillColorFilamentIds}
          action={createRequest}
        />
      </div>
    </div>
  );
}
