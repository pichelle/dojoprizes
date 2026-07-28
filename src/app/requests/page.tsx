import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import type { RequestSize, RequestStatus } from "@/lib/types";
import { updateRequestStatus, deleteRequest } from "./actions";
import StatusSelect from "./StatusSelect";
import RequestsFilterBar from "./RequestsFilterBar";

const STATUS_STYLES: Record<RequestStatus, string> = {
  pending: "bg-amber-100 text-amber-800",
  printed: "bg-blue-100 text-blue-800",
  fulfilled: "bg-green-100 text-green-800",
  cancelled: "bg-neutral-200 text-neutral-600",
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
    franchise?: string;
    color?: string;
    sort?: string;
  }>;
}) {
  const params = await searchParams;
  const supabase = createServerClient();

  const { data: filaments } = await supabase
    .from("filaments")
    .select("id, color_name")
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
  if (params.franchise) {
    const tag = (franchiseTagRows ?? []).find(
      (t) => t.name.toLowerCase() === params.franchise!.toLowerCase(),
    );
    requestIdsForFranchise = tag
      ? Array.from(tagsByRequestId.entries())
          .filter(([, tags]) => tags.some((t) => t.id === tag.id))
          .map(([requestId]) => requestId)
      : [];
  }

  let query = supabase
    .from("requests")
    .select(
      "*, prize:prizes(id, name, photo_url, coin_price), color_filament:filaments(id, color_name)",
    )
    .order("date_requested", { ascending: false })
    .order("created_at", { ascending: false });

  if (params.status) query = query.eq("status", params.status);
  if (params.color) query = query.eq("color_filament_id", params.color);
  if (requestIdsForFranchise) query = query.in("id", requestIdsForFranchise);

  const { data: requestsRaw, error } = await query;

  let requests = (requestsRaw ?? []).map((r) => ({
    ...r,
    franchiseTags: tagsByRequestId.get(r.id) ?? [],
  }));

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Request Log</h1>
          <p className="text-sm text-neutral-500">
            One shared, running list — nothing gets lost or forgotten.
          </p>
        </div>
        <Link
          href="/requests/new"
          className="rounded-md bg-neutral-900 text-white text-sm font-medium px-4 py-2 hover:bg-neutral-800"
        >
          + Log Request
        </Link>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard label="Pending requests" value={pendingCount ?? 0} />
        <StatCard label="Fulfilled (all time)" value={fulfilledCount ?? 0} />
        <StatCard
          label="Most requested franchise"
          value={mostRequestedFranchise ?? "No requests yet"}
          small={!mostRequestedFranchise}
        />
      </div>

      <RequestsFilterBar
        franchiseOptions={franchiseOptions}
        colorOptions={(filaments ?? []).map((f) => ({ id: f.id, name: f.color_name }))}
      />

      {error && (
        <p className="text-sm text-red-600">
          Couldn&apos;t load requests: {error.message}
        </p>
      )}

      <div className="bg-white border border-neutral-200 rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-neutral-500 text-left">
            <tr>
              <th className="px-4 py-2 font-medium">Student</th>
              <th className="px-4 py-2 font-medium">Prize</th>
              <th className="px-4 py-2 font-medium">Theme</th>
              <th className="px-4 py-2 font-medium">Size</th>
              <th className="px-4 py-2 font-medium">Color</th>
              <th className="px-4 py-2 font-medium">Date</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Links / Notes</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id} className="border-t border-neutral-100 align-top">
                <td className="px-4 py-2 font-medium whitespace-nowrap">
                  {r.student_name}
                </td>
                <td className="px-4 py-2">
                  {r.prize?.name ?? r.free_text_prize ?? (
                    <span className="text-neutral-400">—</span>
                  )}
                </td>
                <td className="px-4 py-2 text-neutral-500">
                  {r.franchiseTags.length > 0 ? (
                    <div className="flex flex-wrap gap-1 max-w-[10rem]">
                      {r.franchiseTags.map((t: { id: string; name: string }) => (
                        <span
                          key={t.id}
                          className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 whitespace-nowrap"
                        >
                          {t.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-2 text-neutral-500 whitespace-nowrap">
                  {r.size ? SIZE_LABELS[r.size as RequestSize] : "—"}
                </td>
                <td className="px-4 py-2 text-neutral-500 whitespace-nowrap">
                  {r.color_filament?.color_name ?? "—"}
                </td>
                <td className="px-4 py-2 text-neutral-500 whitespace-nowrap">
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
                <td className="px-4 py-2 text-neutral-500 max-w-[16rem]">
                  {r.links && (
                    <div className="flex flex-col gap-0.5 mb-1">
                      {r.links.split("\n").filter(Boolean).map((link: string, i: number) => (
                        <a
                          key={i}
                          href={link.trim()}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline truncate block max-w-[16rem]"
                        >
                          {link.trim()}
                        </a>
                      ))}
                    </div>
                  )}
                  {r.notes && <div className="truncate">{r.notes}</div>}
                </td>
                <td className="px-4 py-2 text-right">
                  <form
                    action={async () => {
                      "use server";
                      await deleteRequest(r.id);
                    }}
                  >
                    <button
                      type="submit"
                      className="text-xs text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {requests.length === 0 && !error && (
          <p className="p-4 text-sm text-neutral-500">No requests match these filters.</p>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  small,
}: {
  label: string;
  value: string | number;
  small?: boolean;
}) {
  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-4">
      <div className="text-xs text-neutral-500">{label}</div>
      <div className={small ? "text-sm font-medium mt-1" : "text-2xl font-semibold mt-1"}>
        {value}
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
