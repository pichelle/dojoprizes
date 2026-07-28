import { createServerClient } from "@/lib/supabase/server";
import type { Checkout } from "@/lib/types";
import { createCheckout, deleteCheckout } from "./actions";

// Always fetch fresh data -- this page has no searchParams/cookies to force
// dynamic rendering on its own, and without this it can get statically
// cached at build/deploy time instead of showing live checkouts.
export const dynamic = "force-dynamic";

export default async function CheckoutsPage() {
  const supabase = createServerClient();

  const { data: prizes } = await supabase
    .from("prizes")
    .select("id, name")
    .order("name");

  const { data: checkouts, error } = await supabase
    .from("checkouts")
    .select("*, prize:prizes(id, name, photo_url)")
    .order("date_checked_out", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200);

  const prizeIds = Array.from(
    new Set((checkouts ?? []).map((c) => c.prize_id).filter(Boolean)),
  );
  const tagLinksResult = prizeIds.length
    ? await supabase
        .from("prize_franchise_tags")
        .select("prize_id, tag:franchise_tags(id, name)")
        .in("prize_id", prizeIds)
    : { data: [] };
  const tagLinks = tagLinksResult.data as unknown as {
    prize_id: string;
    tag: { id: string; name: string } | null;
  }[];

  const tagsByPrizeId = new Map<string, { id: string; name: string }[]>();
  for (const link of tagLinks ?? []) {
    if (!link.tag) continue;
    const list = tagsByPrizeId.get(link.prize_id) ?? [];
    list.push(link.tag);
    tagsByPrizeId.set(link.prize_id, list);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-ink">Checkouts</h1>
        <p className="text-sm text-muted max-w-2xl mt-1">
          Separate from requests — this captures what actually leaves the
          shelf, including grab-and-go prizes that run out without ever
          generating a request.
        </p>
      </div>

      <div className="bg-card border border-border-warm rounded-xl p-6">
        <h2 className="font-medium text-ink mb-4">Log a checkout</h2>
        <form action={createCheckout} className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-sm font-medium text-ink">
              Prize
            </label>
            <select
              name="prize_id"
              required
              className="mt-1 rounded-md border border-border-warm-strong px-3 py-2 text-sm bg-card min-w-[16rem]"
            >
              <option value="">Select a prize...</option>
              {prizes?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink">
              Date
            </label>
            <input
              type="date"
              name="date_checked_out"
              defaultValue={new Date().toISOString().slice(0, 10)}
              className="mt-1 rounded-md border border-border-warm-strong bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-clay"
            />
          </div>
          <button
            type="submit"
            className="rounded-md bg-ink text-page text-sm font-medium px-4 py-2 hover:opacity-90"
          >
            Bought!
          </button>
        </form>
      </div>

      {error && (
        <p className="text-sm text-rust">
          Couldn&apos;t load checkouts: {error.message}
        </p>
      )}

      <div className="bg-card border border-border-warm rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-page text-muted text-left">
            <tr>
              <th className="px-4 py-2 font-medium">Prize</th>
              <th className="px-4 py-2 font-medium">Theme</th>
              <th className="px-4 py-2 font-medium">Date checked out</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {checkouts?.map((c: Checkout) => (
              <tr key={c.id} className="border-t border-border-warm">
                <td className="px-4 py-2 font-medium text-ink">
                  {c.prize?.name ?? "(deleted prize)"}
                </td>
                <td className="px-4 py-2 text-muted">
                  {(tagsByPrizeId.get(c.prize_id) ?? []).length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {(tagsByPrizeId.get(c.prize_id) ?? []).map((t) => (
                        <span
                          key={t.id}
                          className="text-xs px-2 py-0.5 rounded-full bg-page text-muted"
                        >
                          {t.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-2 text-muted">
                  {c.date_checked_out}
                </td>
                <td className="px-4 py-2 text-right">
                  <form
                    action={async () => {
                      "use server";
                      await deleteCheckout(c.id);
                    }}
                  >
                    <button
                      type="submit"
                      className="text-xs text-rust hover:underline"
                    >
                      Remove
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {checkouts?.length === 0 && !error && (
          <p className="p-4 text-sm text-muted">
            No checkouts logged yet.
          </p>
        )}
      </div>
    </div>
  );
}
