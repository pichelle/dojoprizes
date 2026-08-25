// Server-only helpers for writing to prize_activity. Mirrors
// src/lib/activityLog.ts (requests) -- same curated-diff approach, kept
// as a separate file/table rather than sharing code with requests since
// the fields being compared are entirely different.
import { createServerClient } from "@/lib/supabase/server";
import type { PrizeActivityEventType, RequestActivityChange, RequestSize } from "@/lib/types";
import { formatSize } from "@/lib/requestFormatting";
import { coinPriceToBreakdown } from "@/lib/coins";

type Supabase = ReturnType<typeof createServerClient>;

export async function logPrizeActivity(
  supabase: Supabase,
  prizeId: string,
  actor: string | null,
  eventType: PrizeActivityEventType,
  changes: RequestActivityChange[] = [],
) {
  if (eventType === "edited" && changes.length === 0) return;
  const { error } = await supabase
    .from("prize_activity")
    .insert({ prize_id: prizeId, actor: actor?.trim() || null, event_type: eventType, changes });
  // Best-effort, same as request activity logging -- shouldn't roll back
  // or fail the prize mutation that triggered it.
  if (error) console.error("Failed to log prize activity:", error.message);
}

// The row shape performUpdatePrize already has on hand before it writes
// the update, plus the resolved names for whatever's currently linked
// (filaments, theme tags) since those live in join tables.
export type PrizeSnapshot = {
  name: string;
  photo_url: string | null;
  coin_price: number | null;
  makerworld_link: string | null;
  stock_count: number;
  size: RequestSize | null;
  notes: string | null;
  colorNames: string[];
  themeNames: string[];
};

function priceLabel(coinPrice: number | null) {
  const b = coinPriceToBreakdown(coinPrice);
  const parts = [
    b.obsidian > 0 ? `${b.obsidian} Obsidian` : null,
    b.gold > 0 ? `${b.gold} Gold` : null,
    b.silver > 0 ? `${b.silver} Silver` : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}

function listLabel(names: string[]) {
  return names.length > 0 ? names.join(", ") : null;
}

// Curated diff between the prize row before and after an edit.
export function computePrizeEditChanges(
  before: PrizeSnapshot,
  after: PrizeSnapshot,
): RequestActivityChange[] {
  const changes: RequestActivityChange[] = [];

  function push(field: string, label: string, from: string | null, to: string | null) {
    if (from === to) return;
    changes.push({ field, label, from, to });
  }

  push("name", "Name", before.name || null, after.name || null);
  push("price", "Price", priceLabel(before.coin_price), priceLabel(after.coin_price));
  push("stock_count", "Stock count", String(before.stock_count), String(after.stock_count));
  push("size", "Size", formatSize(before.size), formatSize(after.size));
  push("color", "Color", listLabel(before.colorNames), listLabel(after.colorNames));
  push("theme", "Theme", listLabel(before.themeNames), listLabel(after.themeNames));
  push("photo_url", "Photo", before.photo_url ? "set" : null, after.photo_url ? "set" : null);
  push("makerworld_link", "MakerWorld link", before.makerworld_link, after.makerworld_link);
  push("notes", "Notes", before.notes, after.notes);

  return changes;
}
