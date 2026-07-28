import type { CoinTier } from "@/lib/types";

// Fixed conversion per PRD section 5.4: 5 Silver = 1 Gold, 5 Gold = 1 Obsidian
export const SILVER_PER_GOLD = 5;
export const SILVER_PER_OBSIDIAN = 25; // 5 gold * 5 silver/gold

export function silverEquivalentForTier(tier: CoinTier): number {
  switch (tier) {
    case "silver":
      return 1;
    case "gold":
      return SILVER_PER_GOLD;
    case "obsidian":
      return SILVER_PER_OBSIDIAN;
  }
}

export const COIN_TIER_LABELS: Record<CoinTier, string> = {
  silver: "Silver",
  gold: "Gold",
  obsidian: "Obsidian",
};

export const COIN_TIER_STYLES: Record<CoinTier, string> = {
  silver: "bg-slate-200 text-slate-800 border-slate-300",
  gold: "bg-amber-200 text-amber-900 border-amber-300",
  obsidian: "bg-neutral-800 text-neutral-100 border-neutral-700",
};

// Prizes' `coin_price` is stored as a total in Silver-equivalent units (same
// base unit as coin_value_silver_equivalent) so it can be broken back down
// into the fewest Obsidian/Gold/Silver coins for display, e.g. 30 -> "1
// Obsidian, 1 Gold". Purely a display helper -- the stored number never
// changes.
export function formatCoinPriceBreakdown(
  silverEquivalent: number | null | undefined,
): string | null {
  if (silverEquivalent == null || silverEquivalent <= 0) return null;

  let remaining = Math.round(silverEquivalent);
  const obsidian = Math.floor(remaining / SILVER_PER_OBSIDIAN);
  remaining -= obsidian * SILVER_PER_OBSIDIAN;
  const gold = Math.floor(remaining / SILVER_PER_GOLD);
  remaining -= gold * SILVER_PER_GOLD;
  const silver = remaining;

  const parts: string[] = [];
  if (obsidian > 0) parts.push(`${obsidian} Obsidian`);
  if (gold > 0) parts.push(`${gold} Gold`);
  if (silver > 0) parts.push(`${silver} Silver`);

  return parts.length > 0 ? parts.join(", ") : null;
}

export interface CoinBreakdown {
  obsidian: number;
  gold: number;
  silver: number;
}

// Same math as formatCoinPriceBreakdown, but as raw counts for pre-filling
// the Silver/Gold/Obsidian count inputs on the prize form.
export function coinPriceToBreakdown(
  silverEquivalent: number | null | undefined,
): CoinBreakdown {
  if (silverEquivalent == null || silverEquivalent <= 0) {
    return { obsidian: 0, gold: 0, silver: 0 };
  }
  let remaining = Math.round(silverEquivalent);
  const obsidian = Math.floor(remaining / SILVER_PER_OBSIDIAN);
  remaining -= obsidian * SILVER_PER_OBSIDIAN;
  const gold = Math.floor(remaining / SILVER_PER_GOLD);
  remaining -= gold * SILVER_PER_GOLD;
  return { obsidian, gold, silver: remaining };
}

// Inverse: staff enter how many Silver/Gold/Obsidian coins a prize costs,
// this collapses that into the single Silver-equivalent total we store.
export function breakdownToCoinPrice(breakdown: CoinBreakdown): number {
  return (
    (breakdown.obsidian || 0) * SILVER_PER_OBSIDIAN +
    (breakdown.gold || 0) * SILVER_PER_GOLD +
    (breakdown.silver || 0)
  );
}
