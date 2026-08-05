import Link from "next/link";
import { Check, Clock, Plus } from "lucide-react";
import { createServerClient } from "@/lib/supabase/server";
import { updateRequestStatus, deleteRequest } from "./actions";
import RequestsFilterBar from "./RequestsFilterBar";
import ErrorNote from "@/components/ErrorNote";
import RequestsKanban from "./RequestsKanban";

// Force dynamic rendering (belt-and-suspenders alongside reading
// searchParams below) so this page always reflects the latest requests
// instead of any build-time snapshot.
export const dynamic = "force-dynamic";

function daysAgo(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24)));
}

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{
    color?: string;
    size?: string;
    q?: string;
  }>;
}) {
  const params = await searchParams;
  const selectedColors = params.color ? params.color.split(",").filter(Boolean) : [];
  const selectedSizes = params.size ? params.size.split(",").filter(Boolean) : [];
  const supabase = createServerClient();

  const [
    { data: filaments },
    { count: fulfilledCount },
    { data: allTagLinks },
    { data: franchiseTagRows },
    { data: prizes },
    { data: allFilamentLinks },
  ] = await Promise.all([
    supabase.from("filaments").select("id, color_name, swatch_hex").order("color_name"),
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

  if (requestIdsForColor) query = query.in("id", requestIdsForColor);
  if (selectedSizes.length > 0) query = query.in("size", selectedSizes);

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

  const oldestPendingDays = requests
    .filter((r) => r.status === "pending")
    .reduce<number | null>((max, r) => {
      const age = daysAgo(r.date_requested);
      if (age === null) return max;
      return max === null || age > max ? age : max;
    }, null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl text-ink">Request log</h1>
          <p className="text-sm text-muted mt-1">Track pending prints and see what to make next.</p>
        </div>
        <div className="flex gap-3">
          <div className="bg-nav border border-border-warm rounded-xl px-4 py-2.5 text-center">
            <p className="flex items-center justify-center gap-1.5 text-xs text-muted">
              <Check size={13} aria-hidden="true" />
              Total fulfilled
            </p>
            <p className="text-lg font-medium text-ink mt-0.5">{fulfilledCount ?? 0} prints</p>
          </div>
          <div className="bg-nav border border-border-warm rounded-xl px-4 py-2.5 text-center">
            <p className="flex items-center justify-center gap-1.5 text-xs text-muted">
              <Clock size={13} aria-hidden="true" />
              Oldest waiting
            </p>
            <p className="text-lg font-medium text-ink mt-0.5">
              {oldestPendingDays === null ? "—" : `${oldestPendingDays} days`}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/requests/new"
            className="flex items-center gap-1.5 rounded-md bg-ink text-page px-4 py-2 text-sm font-medium hover:opacity-90 shrink-0"
          >
            <Plus size={15} strokeWidth={2.5} aria-hidden="true" />
            Add a request
          </Link>
          <RequestsFilterBar
            colorOptions={(filaments ?? []).map((f) => ({
              value: f.id,
              label: f.color_name,
              swatch: f.swatch_hex,
            }))}
          />
        </div>

        {error && <ErrorNote>Couldn&apos;t load requests: {error.message}</ErrorNote>}

        <RequestsKanban
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
