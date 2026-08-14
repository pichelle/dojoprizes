import { Clock, Timer } from "lucide-react";
import { createServerClient } from "@/lib/supabase/server";
import { updateRequestStatus, deleteRequest, clearCancelledRequests } from "./actions";
import ErrorNote from "@/components/ErrorNote";
import RequestsView from "./RequestsView";

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
    status?: string;
    q?: string;
  }>;
}) {
  const params = await searchParams;
  const selectedColors = params.color ? params.color.split(",").filter(Boolean) : [];
  const selectedSizes = params.size ? params.size.split(",").filter(Boolean) : [];
  const selectedStatuses = params.status ? params.status.split(",").filter(Boolean) : [];
  const filtersActive = Boolean(
    selectedColors.length > 0 || selectedSizes.length > 0 || selectedStatuses.length > 0 || params.q,
  );
  const supabase = createServerClient();

  const [
    { data: filaments },
    { data: turnaroundRows },
    { data: allTagLinks },
    { data: franchiseTagRows },
    { data: prizes },
    { data: allFilamentLinks },
    { data: allComments },
  ] = await Promise.all([
    supabase.from("filaments").select("id, color_name, swatch_hex").order("color_name"),
    supabase
      .from("requests")
      .select("pending_at, fulfilled_at")
      .eq("status", "fulfilled")
      .not("pending_at", "is", null)
      .not("fulfilled_at", "is", null),
    supabase.from("request_franchise_tags").select("request_id, tag:franchise_tags(id, name)"),
    supabase.from("franchise_tags").select("id, name").order("name"),
    supabase.from("prizes").select("id, name").order("name"),
    supabase.from("request_filaments").select("request_id, filament:filaments(id, color_name, swatch_hex)"),
    supabase
      .from("request_comments")
      .select("id, request_id, author, body, created_at")
      .order("created_at", { ascending: true }),
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
  if (selectedStatuses.length > 0) query = query.in("status", selectedStatuses);

  const { data: requestsRaw, error } = await query;

  const commentsByRequestId = new Map<
    string,
    { id: string; request_id: string; author: string | null; body: string; created_at: string }[]
  >();
  for (const comment of allComments ?? []) {
    const list = commentsByRequestId.get(comment.request_id) ?? [];
    list.push(comment);
    commentsByRequestId.set(comment.request_id, list);
  }

  let requests = (requestsRaw ?? []).map((r) => ({
    ...r,
    franchiseTags: tagsByRequestId.get(r.id) ?? [],
    colorFilaments: filamentsByRequestId.get(r.id) ?? [],
    comments: commentsByRequestId.get(r.id) ?? [],
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

  const turnaroundDaysList = (turnaroundRows ?? [])
    .map((r) => {
      const start = new Date(r.pending_at as string).getTime();
      const end = new Date(r.fulfilled_at as string).getTime();
      if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null;
      return (end - start) / (1000 * 60 * 60 * 24);
    })
    .filter((n): n is number => n !== null);
  const avgTurnaroundDays =
    turnaroundDaysList.length > 0
      ? turnaroundDaysList.reduce((sum, n) => sum + n, 0) / turnaroundDaysList.length
      : null;

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
          <div className="bg-nav border border-border-warm rounded-xl px-4 py-2.5 text-left">
            <p className="flex items-center gap-1.5 text-xs text-muted">
              <Timer size={13} aria-hidden="true" />
              Avg. turnaround
            </p>
            <p className="text-lg font-bold text-ink mt-0.5">
              {avgTurnaroundDays === null ? "—" : `${avgTurnaroundDays.toFixed(1)} days`}
            </p>
          </div>
          <div className="bg-nav border border-border-warm rounded-xl px-4 py-2.5 text-left">
            <p className="flex items-center gap-1.5 text-xs text-muted">
              <Clock size={13} aria-hidden="true" />
              Oldest waiting
            </p>
            <p className="text-lg font-bold text-ink mt-0.5">
              {oldestPendingDays === null ? "—" : `${oldestPendingDays} days`}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {error && <ErrorNote>Couldn&apos;t load requests: {error.message}</ErrorNote>}

        <RequestsView
          requests={requests}
          prizes={prizes ?? []}
          filaments={filaments ?? []}
          allFranchiseTags={franchiseTagRows ?? []}
          colorOptions={(filaments ?? []).map((f) => ({
            value: f.id,
            label: f.color_name,
            swatch: f.swatch_hex,
          }))}
          onStatusChange={updateRequestStatus}
          onDelete={deleteRequest}
          onClearCancelled={clearCancelledRequests}
          filtersActive={filtersActive}
        />
      </div>
    </div>
  );
}
