import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import type { RequestSize, RequestStatus } from "@/lib/types";
import { updateRequestStatus, deleteRequest } from "./actions";
import StatusSelect from "./StatusSelect";
import RequestsFilterBar from "./RequestsFilterBar";
import ActionButton from "@/components/ActionButton";
import FilterSidebar from "@/components/FilterSidebar";
import ErrorNote from "@/components/ErrorNote";

const STATUS_FILTER_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "printed", label: "Printed" },
  { value: "fulfilled", label: "Fulfilled" },
  { value: "cancelled", label: "Cancelled" },
];

const STATUS_STYLES: Record<RequestStatus, string> = {
  pending: "bg-amber/10 text-amber",
  printed: "bg-slate/10 text-slate",
  fulfilled: "bg-sage/10 text-sage",
  cancelled: "bg-taupe/10 text-taupe",
};

const SIZE_LABELS: Record<RequestSize, string> = {
  small: "Small",
  medium: "Medium",
  large: "Large",
  xlarge: "X-Large",
};

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    theme?: string;
    color?: string;
    sort?: string;
    q?: string;
  }>;
}) {
  const params = await searchParams;
  const selectedThemes = params.theme ? params.theme.split(",").filter(Boolean) : [];
  const selectedColors = params.color ? params.color.split(",").filter(Boolean) : [];
  const selectedStatuses = params.status ? params.status.split(",").filter(Boolean) : [];
  const supabase = createServerClient();

  const { data: filaments } = await supabase
    .from("filaments")
    .select("id, color_name, swatch_hex")
    .order("color_name");

  // Stats -- always across ALL requests, independent of filters below.
  const { count: pendingCount } = await supabase
    .from("requests")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");

  const { count: fulfilledCount } = await supabase
    .from("requests")
    .select("*", { count: "exact", head: true })
    .eq("status", "fulfilled");

  const { data: allTagLinks } = await supabase
    .from("request_franchise_tags")
    .select("request_id, tag:franchise_tags(id, name)");

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

  const mostRequestedFranchise = mostCommon(
    Array.from(tagsByRequestId.values()).flatMap((tags) => tags.map((t) => t.name)),
  );

  const { data: franchiseTagRows } = await supabase
    .from("franchise_tags")
    .select("id, name")
    .order("name");
  const franchiseOptions = (franchiseTagRows ?? []).map((t) => t.name);

  let requestIdsForFranchise: string[] | null = null;
  if (selectedThemes.length > 0) {
    const selectedLower = selectedThemes.map((t) => t.toLowerCase());
    const tagIds = (franchiseTagRows ?? [])
      .filter((t) => selectedLower.includes(t.name.toLowerCase()))
      .map((t) => t.id);
    requestIdsForFranchise = Array.from(tagsByRequestId.entries())
      .filter(([, tags]) => tags.some((t) => tagIds.includes(t.id)))
      .map(([requestId]) => requestId);
  }

  let query = supabase
    .from("requests")
    .select(
      "*, prize:prizes(id, name, photo_url, coin_price), color_filament:filaments(id, color_name)",
    )
    .order("date_requested", { ascending: false })
    .order("created_at", { ascending: false });

  if (selectedStatuses.length > 0) query = query.in("status", selectedStatuses);
  if (selectedColors.length > 0) query = query.in("color_filament_id", selectedColors);
  if (requestIdsForFranchise) query = query.in("id", requestIdsForFranchise);

  const { data: requestsRaw, error } = await query;

  let requests = (requestsRaw ?? []).map((r) => ({
    ...r,
    franchiseTags: tagsByRequestId.get(r.id) ?? [],
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

  if (params.sort === "price_asc" || params.sort === "price_desc") {
    const dir = params.sort === "price_asc" ? 1 : -1;
    requests = [...requests].sort((a, b) => {
      const pa = a.prize?.coin_price;
      const pb = b.prize?.coin_price;
      if (pa == null && pb == null) return 0;
      if (pa == null) return 1; // nulls last regardless of direction
      if (pb == null) return -1;
      return (pa - pb) * dir;
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
          className="rounded-md bg-ink text-page text-sm font-medium px-4 py-2 hover:opacity-90"
        >
          Log a request
        </Link>
      </div>

      <div className="grid sm:grid-cols-[200px_1fr] gap-6 items-start">
        <FilterSidebar
          basePath="/requests"
          extraParams={["sort", "q"]}
          groups={[
            {
              key: "theme",
              label: "Theme",
              type: "checkbox",
              options: franchiseOptions.map((f) => ({ value: f, label: f })),
            },
            {
              key: "color",
              label: "Color",
              type: "checkbox",
              options: (filaments ?? []).map((f) => ({
                value: f.id,
                label: f.color_name,
                swatch: f.swatch_hex,
              })),
            },
            {
              key: "status",
              label: "Status",
              type: "checkbox",
              options: STATUS_FILTER_OPTIONS,
            },
          ]}
        />

        <div className="space-y-6 min-w-0">
          <RequestsFilterBar />

          {error && (
            <ErrorNote>Couldn&apos;t load requests: {error.message}</ErrorNote>
          )}

          <div className="bg-card border border-border-warm rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
          <thead className="bg-page text-muted text-left">
            <tr>
              <th className="px-4 py-2 font-medium">Ninja name</th>
              <th className="px-4 py-2 font-medium">Requested by</th>
              <th className="px-4 py-2 font-medium">Prize</th>
              <th className="px-4 py-2 font-medium">Theme</th>
              <th className="px-4 py-2 font-medium">Size</th>
              <th className="px-4 py-2 font-medium">Color</th>
              <th className="px-4 py-2 font-medium">Date</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">MakerWorld / Notes</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id} className="border-t border-border-warm align-top">
                <td className="px-4 py-2 font-medium text-ink whitespace-nowrap">
                  {r.student_name}
                </td>
                <td className="px-4 py-2 text-muted whitespace-nowrap">
                  {r.requested_by ?? "-"}
                </td>
                <td className="px-4 py-2 text-ink">
                  {r.prize?.name ?? r.free_text_prize ?? (
                    <span className="text-muted">-</span>
                  )}
                </td>
                <td className="px-4 py-2 text-muted">
                  {r.franchiseTags.length > 0 ? (
                    <div className="flex flex-wrap gap-1 max-w-[10rem]">
                      {r.franchiseTags.map((t: { id: string; name: string }) => (
                        <span
                          key={t.id}
                          className="text-xs px-2 py-0.5 rounded-full bg-page text-muted whitespace-nowrap"
                        >
                          {t.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="px-4 py-2 text-muted whitespace-nowrap">
                  {r.size ? SIZE_LABELS[r.size as RequestSize] : "-"}
                </td>
                <td className="px-4 py-2 text-muted whitespace-nowrap">
                  {r.color_filament?.color_name ?? "-"}
                </td>
                <td className="px-4 py-2 text-muted whitespace-nowrap">
                  {r.date_requested}
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  <span
                    className={`inline-block mr-2 text-xs px-2 py-0.5 rounded-full capitalize ${STATUS_STYLES[r.status as RequestStatus]}`}
                  >
                    {r.status}
                  </span>
                  <StatusSelect
                    requestId={r.id}
                    status={r.status as RequestStatus}
                    onChange={updateRequestStatus}
                  />
                </td>
                <td className="px-4 py-2 text-muted max-w-[16rem]">
                  {r.links && (
                    <div className="flex flex-col gap-0.5 mb-1">
                      {r.links.split("\n").filter(Boolean).map((link: string, i: number) => (
                        <a
                          key={i}
                          href={link.trim()}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sage hover:underline truncate block max-w-[16rem]"
                        >
                          {link.trim()}
                        </a>
                      ))}
                    </div>
                  )}
                  {r.notes && <div className="truncate">{r.notes}</div>}
                </td>
                <td className="px-4 py-2 text-right whitespace-nowrap">
                  <Link
                    href={`/requests/${r.id}`}
                    className="text-xs text-ink hover:underline mr-3"
                  >
                    Edit
                  </Link>
                  <ActionButton
                    action={deleteRequest.bind(null, r.id)}
                    toastMessage="Request deleted"
                    className="text-xs text-rust hover:underline"
                  >
                    Delete
                  </ActionButton>
                </td>
              </tr>
            ))}
          </tbody>
            </table>
            {requests.length === 0 && !error && (
              <p className="p-4 text-sm text-muted">Nothing logged yet. Add the first request to get started.</p>
            )}
          </div>
        </div>
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
