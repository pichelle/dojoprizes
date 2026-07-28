import { createServerClient } from "@/lib/supabase/server";
import type { PrizeRequest, RequestStatus } from "@/lib/types";
import { createRequest, updateRequestStatus, deleteRequest } from "./actions";
import RequestForm from "./RequestForm";
import StatusSelect from "./StatusSelect";

const STATUS_STYLES: Record<RequestStatus, string> = {
  pending: "bg-amber-100 text-amber-800",
  printed: "bg-blue-100 text-blue-800",
  fulfilled: "bg-green-100 text-green-800",
  cancelled: "bg-neutral-200 text-neutral-600",
};

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const supabase = createServerClient();

  const { data: prizes } = await supabase
    .from("prizes")
    .select("id, name")
    .order("name");

  let query = supabase
    .from("requests")
    .select("*, prize:prizes(id, name, photo_url)")
    .order("date_requested", { ascending: false })
    .order("created_at", { ascending: false });

  if (params.status) {
    query = query.eq("status", params.status);
  }

  const { data: requests, error } = await query;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Request Log</h1>
        <p className="text-sm text-neutral-500">
          One shared, running list — nothing gets lost or forgotten.
        </p>
      </div>

      <div className="bg-white border border-neutral-200 rounded-xl p-6">
        <h2 className="font-medium mb-4">Log a new request</h2>
        <RequestForm prizes={prizes ?? []} action={createRequest} />
      </div>

      <div className="flex gap-2 text-sm">
        {["", "pending", "printed", "fulfilled", "cancelled"].map((s) => (
          <a
            key={s || "all"}
            href={s ? `/requests?status=${s}` : "/requests"}
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

      {error && (
        <p className="text-sm text-red-600">
          Couldn&apos;t load requests: {error.message}
        </p>
      )}

      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-neutral-500 text-left">
            <tr>
              <th className="px-4 py-2 font-medium">Student</th>
              <th className="px-4 py-2 font-medium">Prize</th>
              <th className="px-4 py-2 font-medium">Date</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Notes</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {requests?.map((r: PrizeRequest) => (
              <tr key={r.id} className="border-t border-neutral-100">
                <td className="px-4 py-2 font-medium">{r.student_name}</td>
                <td className="px-4 py-2">
                  {r.prize?.name ?? r.free_text_prize ?? (
                    <span className="text-neutral-400">—</span>
                  )}
                </td>
                <td className="px-4 py-2 text-neutral-500">
                  {r.date_requested}
                </td>
                <td className="px-4 py-2">
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
                <td className="px-4 py-2 text-neutral-500 max-w-[16rem] truncate">
                  {r.notes}
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
        {requests?.length === 0 && !error && (
          <p className="p-4 text-sm text-neutral-500">No requests logged yet.</p>
        )}
      </div>
    </div>
  );
}
