import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import type { PrizeRequest, RequestSize, RequestStatus } from "@/lib/types";
import { createRequest, updateRequestStatus, deleteRequest } from "./actions";
import RequestForm from "./RequestForm";
import StatusSelect from "./StatusSelect";

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
    add?: string;
    status?: string;
    franchise?: string;
    color?: string;
    sort?: string;
  }>;
}) {
  const params = await searchParams;
  const supabase = createServerClient();

  const { data: prizes } = await supabase
    .from("prizes")
    .select("id, name")
    .order("name");

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

  const { data: franchiseRows } = await supabase
    .from("requests")
    .select("franchise");
  const mostRequestedFranchise = mostCommon(
    (franchiseRows ?? []).map((r) => r.franchise).filter((f): f is string => !!f),
  );

  const franchiseOptions = Array.from(
    new Set((franchiseRows ?? []).map((r) => r.franchise).filter((f): f is string => !!f)),
  ).sort();

  let query = supabase
    .from("requests")
    .select(
      "*, prize:prizes(id, name, photo_url, coin_price), color_filament:filaments(id, color_name)",
    )
    .order("date_requested", { ascending: false })
    .order("created_at", { ascending: false });

  if (params.status) query = query.eq("status", params.status);
  if (params.franchise) query = query.eq("franchise", params.franchise);
  if (params.color) query = query.eq("color_filament_id", params.color);

  const { data: requestsRaw, error } = await query;

  let requests = requestsRaw ?? [];
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
          href={params.add ? "/requests" : "/requests?add=1"}
          className="rounded-md bg-neutral-900 text-white text-sm font-medium px-4 py-2 hover:bg-neutral-800"
        >
          {params.add ? "Cancel" : "+ Log Request"}
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

      {params.add && (
        <div className="bg-white border border-neutral-200 rounded-xl p-6">
          <h2 className="font-medium mb-4">Log a new request</h2>
          <RequestForm
            prizes={prizes ?? []}
            filaments={filaments ?? []}
            action={createRequest}
          />
        </div>
      )}

      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex gap-2 text-sm">
          {["", "pending", "printed", "fulfilled", "cancelled"].map((s) => (
            <a
              key={s || "all"}
              href={buildHref(params, { status: s || undefined })}
              className={`px-3 py-1.5 rounded-full border capitalize ${
                (params.status ?? "") === s
                  ? "bg-neutral-900 text-white border-neutral-900"
                  : "border-neutral-300 text-neutral-600 hover:bg-neutral-100"
              }`}
            >
              {s || "All"}
            </a>
          ))}
        </div>

        <form className="flex flex-wrap gap-2 items-center text-sm ml-auto">
          <input type="hidden" name="status" value={params.status ?? ""} />
          <select
            name="franchise"
            defaultValue={params.franchise ?? ""}
            className="rounded-md border border-neutral-300 px-3 py-1.5 bg-white"
          >
            <option value="">All themes</option>
            {franchiseOptions.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
          <select
            name="color"
            defaultValue={params.color ?? ""}
            className="rounded-md border border-neutral-300 px-3 py-1.5 bg-white"
          >
            <option value="">All colors</option>
            {filaments?.map((f) => (
              <option key={f.id} value={f.id}>
                {f.color_name}
              </option>
            ))}
          </select>
          <select
            name="sort"
            defaultValue={params.sort ?? ""}
            className="rounded-md border border-neutral-300 px-3 py-1.5 bg-white"
          >
            <option value="">Sort: Date (newest)</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
          </select>
          <button
            type="submit"
            className="rounded-md border border-neutral-300 px-3 py-1.5 hover:bg-neutral-100"
          >
            Filter
          </button>
        </form>
      </div>

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
              <th className="px-4 py-2 font-medium">Franchise</th>
              <th className="px-4 py-2 font-medium">Size</th>
              <th className="px-4 py-2 font-medium">Color</th>
              <th className="px-4 py-2 font-medium">Date</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Links / Notes</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r: PrizeRequest) => (
              <tr key={r.id} className="border-t border-neutral-100 align-top">
                <td className="px-4 py-2 font-medium whitespace-nowrap">
                  {r.student_name}
                </td>
                <td className="px-4 py-2">
                  {r.prize?.name ?? r.free_text_prize ?? (
                    <span className="text-neutral-400">—</span>
                  )}
                </td>
                <td className="px-4 py-2 text-neutral-500 whitespace-nowrap">
                  {r.franchise ?? "—"}
                </td>
                <td className="px-4 py-2 text-neutral-500 whitespace-nowrap">
                  {r.size ? SIZE_LABELS[r.size] : "—"}
                </td>
                <td className="px-4 py-2 text-neutral-500 whitespace-nowrap">
                  {r.color_filament?.color_name ?? "—"}
                </td>
                <td className="px-4 py-2 text-neutral-500 whitespace-nowrap">
                  {r.date_requested}
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  <span
                    className={`inline-block mr-2 text-xs px-2 py-0.5 rounded-full capitalize ${STATUS_STYLES[r.status]}`}
                  >
                    {r.status}
                  </span>
                  <StatusSelect
                    requestId={r.id}
                    status={r.status}
                    onChange={updateRequestStatus}
                  />
                </td>
                <td className="px-4 py-2 text-neutral-500 max-w-[16rem]">
                  {r.links && (
                    <div className="flex flex-col gap-0.5 mb-1">
                      {r.links.split("\n").filter(Boolean).map((link, i) => (
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

function buildHref(
  current: { franchise?: string; color?: string; sort?: string },
  overrides: { status?: string },
): string {
  const p = new URLSearchParams();
  if (overrides.status) p.set("status", overrides.status);
  if (current.franchise) p.set("franchise", current.franchise);
  if (current.color) p.set("color", current.color);
  if (current.sort) p.set("sort", current.sort);
  const qs = p.toString();
  return qs ? `/requests?${qs}` : "/requests";
}
