import { createServerClient } from "@/lib/supabase/server";

export type TrendingSnapshot = {
  theme: string | null;
  color: string | null;
  size: string | null;
};

function daysAgo(iso: string): number | null {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24)));
}

function topOne(values: string[]): string | null {
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

// Snapshot of what's trending (top theme/color/size) across both prize bin
// checkouts and fulfilled requests within the last `days` days. Powers the
// short callout on the Requests page -- the full three-panel breakdown
// lives on the Checkouts page.
export async function getTrendingSnapshot(days: number): Promise<TrendingSnapshot> {
  const supabase = createServerClient();

  const [
    { data: binCheckouts },
    { data: fulfilledRequests },
    { data: allPrizeTagLinks },
    { data: allPrizeFilamentLinks },
    { data: allRequestTagLinks },
    { data: allRequestFilamentLinks },
  ] = await Promise.all([
    supabase.from("checkouts").select("id, date_checked_out, prize_id, prize:prizes(size)"),
    supabase
      .from("requests")
      .select("id, date_requested, prize_id, size")
      .eq("status", "fulfilled"),
    supabase.from("prize_franchise_tags").select("prize_id, tag:franchise_tags(name)"),
    supabase.from("prize_filament").select("prize_id, filament:filaments(color_name)"),
    supabase.from("request_franchise_tags").select("request_id, tag:franchise_tags(name)"),
    supabase.from("request_filaments").select("request_id, filament:filaments(color_name)"),
  ]);

  const themesByPrizeId = new Map<string, string[]>();
  for (const link of (allPrizeTagLinks ?? []) as unknown as {
    prize_id: string;
    tag: { name: string } | null;
  }[]) {
    if (!link.tag) continue;
    const list = themesByPrizeId.get(link.prize_id) ?? [];
    list.push(link.tag.name);
    themesByPrizeId.set(link.prize_id, list);
  }

  const colorsByPrizeId = new Map<string, string[]>();
  for (const link of (allPrizeFilamentLinks ?? []) as unknown as {
    prize_id: string;
    filament: { color_name: string } | null;
  }[]) {
    if (!link.filament) continue;
    const list = colorsByPrizeId.get(link.prize_id) ?? [];
    list.push(link.filament.color_name);
    colorsByPrizeId.set(link.prize_id, list);
  }

  const themesByRequestId = new Map<string, string[]>();
  for (const link of (allRequestTagLinks ?? []) as unknown as {
    request_id: string;
    tag: { name: string } | null;
  }[]) {
    if (!link.tag) continue;
    const list = themesByRequestId.get(link.request_id) ?? [];
    list.push(link.tag.name);
    themesByRequestId.set(link.request_id, list);
  }

  const colorsByRequestId = new Map<string, string[]>();
  for (const link of (allRequestFilamentLinks ?? []) as unknown as {
    request_id: string;
    filament: { color_name: string } | null;
  }[]) {
    if (!link.filament) continue;
    const list = colorsByRequestId.get(link.request_id) ?? [];
    list.push(link.filament.color_name);
    colorsByRequestId.set(link.request_id, list);
  }

  const themeOccurrences: string[] = [];
  const colorOccurrences: string[] = [];
  const sizeOccurrences: string[] = [];

  for (const c of binCheckouts ?? []) {
    const age = daysAgo(c.date_checked_out);
    if (age === null || age > days) continue;
    themeOccurrences.push(...(themesByPrizeId.get(c.prize_id) ?? []));
    colorOccurrences.push(...(colorsByPrizeId.get(c.prize_id) ?? []));
    const size = (c.prize as unknown as { size: string | null } | null)?.size;
    if (size) sizeOccurrences.push(size);
  }

  for (const r of fulfilledRequests ?? []) {
    const age = daysAgo(r.date_requested);
    if (age === null || age > days) continue;
    const themes =
      (themesByRequestId.get(r.id) ?? []).length > 0
        ? themesByRequestId.get(r.id)!
        : themesByPrizeId.get(r.prize_id ?? "") ?? [];
    themeOccurrences.push(...themes);
    colorOccurrences.push(...(colorsByRequestId.get(r.id) ?? []));
    if (r.size) sizeOccurrences.push(r.size);
  }

  return {
    theme: topOne(themeOccurrences),
    color: topOne(colorOccurrences),
    size: topOne(sizeOccurrences),
  };
}
