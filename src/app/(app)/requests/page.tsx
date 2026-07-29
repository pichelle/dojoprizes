import Link from "next/link";
import { Plus } from "lucide-react";
import { createServerClient } from "@/lib/supabase/server";
import { updateRequestStatus, deleteRequest } from "./actions";
import RequestsFilterBar from "./RequestsFilterBar";
import StatusTabs from "@/components/StatusTabs";
import ErrorNote from "@/components/ErrorNote";
import RequestsTable from "./RequestsTable";

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    color?: string;
    q?: string;
  }>;
}) {
  const params = await searchParams;
  const selectedColors = params.color ? params.color.split(",").filter(Boolean) : [];
  const supabase = createServerClient();

  const [
    { data: filaments },
    { count: pendingCount },
    { count: fulfilledCount },
    { data: allTagLinks },
    { data: franchiseTagRows },
    { data: prizes },
    { data: allFilamentLinks },
  ] = await Promise.all([
    supabase.from("filaments").select("id, color_name, swatch_hex").order("color_name"),
    supabase.from("requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("requests").select("*", { count: "exact", head: true }).eq("status", "fulfilled"),
    supabase.from("request_franchise_tags").select("request_id, tag:franchise_tags(id, name)"),
    supabase.from("franchise_tags").select("id, name").order("name"),
    supabase.from("prizes").select("id, name").order("name"),
    supabase.from("request_filaments").select("request_id, filament:filaments(id, color_name, swatch_hex)"),
  ]);

  const tagsByRequestId = new Map<string, { id: string; name: string }[]>();
  for (const link of (allTagLinks ?? []) as unknown as {
    request_id: string;
    tag: { id: string; name: string } | null;
  }[]) {
    if (!link.tag) continue;
    const list = tagsByRequestId.get(link.request_id) ?? [];
    list.push(link.tag);
    tagsByRequestId.set(link.request_id, list);
  }

  const filamentsByRequestId = new Map<
    string,
    { id: string; color_name: string; swatch_hex: string | null }[]
  >();
  for (const link of (allFilamentLinks ?? []) as unknown as {
    request_id: string;
    filament: { id: string; color_name: string; swatch_hex: string | null } | null;
  }[]) {
    if (!link.filament) continue;
    const list = filamentsByRequestId.get(link.request_id) ?? [];
    list.push(link.filament);
    filamentsByRequestId.set(link.request_id, list);
  }

  const mostRequestedFranchise = mostCommon(
    Array.from(tagsByRequestId.values()).flatMap((tags) => tags.map((t) => t.name)),
  );

  let requestIdsForColor: string[] | null = null;
  if (selectedColors.length > 0) {
    requestIdsForColor = Array.from(filamentsByRequestId.entries())
      .filter(([, colors]) => colors.some((c) => selectedColors.includes(c.id)))
      .map(([requestId]) => requestId);
  }

  let query = supabase
    .from("requests")
    .select("*, prize:prizes(id, name, photo_url, coin_price)")
    .order("date_requested", { ascending: false })
    .order("created_at", { ascending: false });

  if (params.status) query = query.eq("status", params.status);
  if (requestIdsForColor) query = query.in("id", requestIdsForColor);

  const { data: requestsRaw, error } = await query;

  let requests = (requestsRaw ?? []).map((r) => ({
    ...r,
    franchiseTags: tagsByRequestId.get(r.id) ?? [],
    colorFilaments: filamentsByRequestId.get(r.id) ?? [],
  }));

  if (params.q) {
    const term = params.q.toLowerCase();
    requests = requests.filter((r) => {
      const haystack = [
        r.student_name,
        r.requested_by,
        r.prize?.name,
        r.free_text_prize,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }

  const statLine = `${pendingCount ?? 0} pending · ${fulfilledCount ?? 0} fulfilled · ${mostRequestedFranchise ?? "no requests yet"}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl text-ink">Request log</h1>
          <p className="text-sm text-muted mt-1">{statLine}</p>
        </div>
        <Link
          href="/requests/new"
          className="flex items-center gap-1.5 rounded-md bg-ink text-page text-sm font-medium px-4 py-2 hover:opacity-90"
        >
          <Plus size={15} strokeWidth={2.5} aria-hidden="true" />
          Log a request
        </Link>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <StatusTabs basePath="/requests" />
          <RequestsFilterBar
            colorOptions={(filaments ?? []).map((f) => ({
              value: f.id,
              label: f.color_name,
              swatch: f.swatch_hex,
            }))}
          />
        </div>

        {error && (
          <ErrorNote>Couldn&apos;t load requests: {error.message}</ErrorNote>
        )}

        <RequestsTable
          requests={requests}
          prizes={prizes ?? []}
          filaments={filaments ?? []}
          allFranchiseTags={franchiseTagRows ?? []}
          onStatusChange={updateRequestStatus}
          onDelete={deleteRequest}
        />
      </div>
    </div>
  );
}

function mostCommon(values: string[]): string | null {
  if (values.length === 0) return null;
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best: string | null = null;
  let bestCount = 0;
  for (const [v, c] of counts) {
    if (c > bestCount) {
      best = v;
      bestCount = c;
    }
  }
  return best;
}
