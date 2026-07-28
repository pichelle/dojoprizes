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
