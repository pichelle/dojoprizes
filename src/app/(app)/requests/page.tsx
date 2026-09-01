import { Clock, Timer } from "lucide-react";
import { createServerClient } from "@/lib/supabase/server";
import { updateRequestStatus, deleteRequest, duplicateRequest, clearCancelledRequests, reorderRequests } from "./actions";
import ErrorNote from "@/components/ErrorNote";
import RequestsView from "./RequestsView";
import { daysAgo, queueEntryDate } from "@/lib/requestFormatting";

// Force dynamic rendering (belt-and-suspenders alongside reading
// searchParams below) so this page always reflects the latest requests
// instead of any build-time snapshot.
export const dynamic = "force-dynamic";

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
    { data: allActivity },
    { data: allReactions },
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
    supabase
      .from("request_activity")
      .select("id, request_id, actor, event_type, changes, created_at")
      .order("created_at", { ascending: true }),
    supabase
      .from("comment_reactions")
      .select("id, comment_id, emoji, actor, created_at")
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

  const reactionsByCommentId = new Map<
    string,
    { id: string; comment_id: string; emoji: string; actor: string | null; created_at: string }[]
  >();
  for (const reaction of allReactions ?? []) {
    const list = reactionsByCommentId.get(reaction.comment_id) ?? [];
    list.push(reaction);
    reactionsByCommentId.set(reaction.comment_id, list);
  }

  const commentsByRequestId = new Map<
    string,
    {
      id: string;
      request_id: string;
      author: string | null;
      body: string;
      created_at: string;
      reactions: { id: string; comment_id: string; emoji: string; actor: string | null; created_at: string }[];
    }[]
  >();
  for (const comment of allComments ?? []) {
    const list = commentsByRequestId.get(comment.request_id) ?? [];
    list.push({ ...comment, reactions: reactionsByCommentId.get(comment.id) ?? [] });
    commentsByRequestId.set(comment.request_id, list);
  }

  const activityByRequestId = new Map<
    string,
    {
      id: string;
      request_id: string;
      actor: string | null;
      event_type: "created" | "status_changed" | "edited";
      changes: { field: string; label: string; from: string | null; to: string | null }[];
      created_at: string;
    }[]
  >();
  for (const entry of allActivity ?? []) {
    const list = activityByRequestId.get(entry.request_id) ?? [];
    list.push(entry as (typeof list)[number]);
    activityByRequestId.set(entry.request_id, list);
  }

  let requests = (requestsRaw ?? []).map((r) => ({
    ...r,
    franchiseTags: tagsByRequestId.get(r.id) ?? [],
    colorFilaments: filamentsByRequestId.get(r.id) ?? [],
    comments: commentsByRequestId.get(r.id) ?? [],
    activity: activityByRequestId.get(r.id) ?? [],
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
      const age = daysAgo(queueEntryDate(r));
      if (age === null) return max;
      return max === null || age > max ? age : max;
    }, null);

  return (
    // sm:h-[calc(100vh-6rem)] matches AppShell's own fixed main padding
    // (py-12 + pb-12 = 6rem at sm+) -- this, combined with sm:overflow-hidden
    // and the flex-1/min-h-0 chain below, means the *page* never scrolls at
    // sm+; only the individual kanban columns (or the table body) do. Below
    // sm: plain block layout, normal page scroll -- columns stack there
    // instead of sitting side by side, so there's nothing to protect.
    <div className="space-y-6 sm:flex sm:flex-col sm:h-[calc(100vh-6rem)] sm:overflow-hidden">
      {/* Stacks on mobile (title/subtext, then the two stat tiles full
          width below) instead of squeezing everything into one row --
          the old unwrapped row let the flex-shrink default compress the
          tiles unevenly, wrapping "Oldest waiting"'s value but not
          "Avg. turnaround"'s, purely from DOM order, not the data. */}
      <div className="shrink-0 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl text-ink">Request log</h1>
          <p className="text-sm text-muted mt-1">Track pending prints and see what to make next.</p>
        </div>
        <div className="flex gap-3">
          <div className="flex-1 sm:flex-initial bg-nav border border-border-warm rounded-xl px-4 py-2.5 text-left">
            <p className="flex items-center gap-1.5 text-xs text-muted whitespace-nowrap">
              <Timer size={13} aria-hidden="true" />
              Avg. turnaround
            </p>
            <p className="text-lg font-bold text-ink mt-0.5 whitespace-nowrap">
              {avgTurnaroundDays === null ? "—" : `${avgTurnaroundDays.toFixed(1)} days`}
            </p>
          </div>
          <div className="flex-1 sm:flex-initial bg-nav border border-border-warm rounded-xl px-4 py-2.5 text-left">
            <p className="flex items-center gap-1.5 text-xs text-muted whitespace-nowrap">
              <Clock size={13} aria-hidden="true" />
              Oldest waiting
            </p>
            <p className="text-lg font-bold text-ink mt-0.5 whitespace-nowrap">
              {oldestPendingDays === null ? "—" : `${oldestPendingDays} days`}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 sm:flex-1 sm:min-h-0 sm:flex sm:flex-col">
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
          onDuplicate={duplicateRequest}
          onClearCancelled={clearCancelledRequests}
          onReorder={reorderRequests}
          filtersActive={filtersActive}
        />
      </div>
    </div>
  );
}
