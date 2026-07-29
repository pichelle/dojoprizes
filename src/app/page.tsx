import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { updateRequestStatus } from "./requests/actions";
import StickyNote from "@/components/StickyNote";
import QueueBoard, { type QueueRequest } from "@/components/QueueBoard";
import type { PrizeRequest } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = createServerClient();

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

  const mostRequestedFranchise = topCounts(
    Array.from(tagsByRequestId.values()).flatMap((tags) => tags.map((t) => t.name)),
    1,
  )[0]?.[0];

  const { data: queueRaw } = await supabase
    .from("requests")
    .select(
      "*, prize:prizes(id, name, photo_url, coin_price), color_filament:filaments(id, color_name)",
    )
    .in("status", ["pending", "printed"])
    .order("is_print_club", { ascending: false })
    .order("date_requested", { ascending: true })
    .order("created_at", { ascending: true });

  const queue = (queueRaw ?? []).map((r) => ({
    ...r,
    franchiseTags: tagsByRequestId.get(r.id) ?? [],
  }));

  const { data: recentCheckouts } = await supabase
    .from("checkouts")
    .select("id, date_checked_out, prize:prizes(id, name)")
    .order("date_checked_out", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(5);

  const { data: allCheckoutPrizeIds } = await supabase
    .from("checkouts")
    .select("prize_id");
  const checkoutPrizeIds = (allCheckoutPrizeIds ?? []).map((c) => c.prize_id);

  let themeOccurrences: string[] = [];
  if (checkoutPrizeIds.length > 0) {
    const { data: prizeTagLinks } = await supabase
      .from("prize_franchise_tags")
      .select("prize_id, tag:franchise_tags(name)")
      .in("prize_id", checkoutPrizeIds);

    const tagNameByPrizeId = new Map<string, string[]>();
    for (const link of (prizeTagLinks ?? []) as unknown as {
      prize_id: string;
      tag: { name: string } | null;
    }[]) {
      if (!link.tag) continue;
      const list = tagNameByPrizeId.get(link.prize_id) ?? [];
      list.push(link.tag.name);
      tagNameByPrizeId.set(link.prize_id, list);
    }
    themeOccurrences = checkoutPrizeIds.flatMap(
      (id) => tagNameByPrizeId.get(id) ?? [],
    );
  }
  const popularThemes = topCounts(themeOccurrences, 3);

  async function handleStatusChange(
    requestId: string,
    status: PrizeRequest["status"],
  ) {
    "use server";
    await updateRequestStatus(requestId, status);
  }

  const statLine = `${pendingCount ?? 0} pending · ${fulfilledCount ?? 0} fulfilled · ${mostRequestedFranchise ?? "no requests yet"}`;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl text-ink">Prizes in queue</h1>
          <p className="text-sm text-muted mt-1 max-w-md">
            What to print next, sorted by priority.
          </p>
        </div>
        <StickyNote rotate={-1} className="text-[13px] text-ink whitespace-nowrap">
          {statLine}
        </StickyNote>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/requests/new"
          className="rounded-md bg-ink text-page px-4 py-2 text-sm font-medium hover:opacity-90"
        >
          Add a request
        </Link>
        <a
          href="https://makerworld.com/en"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md border border-border-warm-strong bg-card px-4 py-2 text-sm text-ink hover:bg-page"
        >
          Search MakerWorld
        </a>
        <a
          href="https://www.tinkercad.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md border border-border-warm-strong bg-card px-4 py-2 text-sm text-ink hover:bg-page"
        >
          Open Tinkercad
        </a>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-card border border-border-warm rounded-xl p-4">
          <div className="text-xs text-muted mb-2">Recently bought</div>
          {recentCheckouts && recentCheckouts.length > 0 ? (
            <div className="space-y-1.5">
              {recentCheckouts.map((c) => (
                <div key={c.id} className="text-sm text-ink flex items-baseline justify-between gap-2">
                  <span className="truncate">
                    {(c.prize as unknown as { name: string } | null)?.name ?? "(deleted prize)"}
                  </span>
                  <span className="text-xs text-muted whitespace-nowrap">
                    {c.date_checked_out}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">Nothing bought yet.</p>
          )}
        </div>

        <div className="bg-card border border-border-warm rounded-xl p-4">
          <div className="text-xs text-muted mb-2">Most popular themes</div>
          {popularThemes.length > 0 ? (
            <div className="space-y-1.5">
              {popularThemes.map(([name, count]) => (
                <div key={name} className="text-sm text-ink flex items-baseline justify-between gap-2">
                  <span className="truncate">{name}</span>
                  <span className="text-xs text-sage whitespace-nowrap">{count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">Not enough data yet.</p>
          )}
        </div>
      </div>

      <div>
        <QueueBoard
          requests={queue as unknown as QueueRequest[]}
          onStatusChange={handleStatusChange}
        />
      </div>
    </div>
  );
}

function topCounts(values: string[], limit: number): [string, number][] {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}
