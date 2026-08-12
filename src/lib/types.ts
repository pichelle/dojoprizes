// Hand-written types mirroring supabase/schema.sql.
// (If you later install the Supabase CLI you can replace this with
// `supabase gen types typescript` output.)

export type CoinTier = "silver" | "gold" | "obsidian";

export type PrizeStatus = "in_stock" | "print_on_request";

export type RequestStatus = "idea" | "pending" | "printed" | "fulfilled" | "cancelled";

export type RequestSize = "small" | "medium" | "large" | "xlarge" | "true_to_size";

export interface FranchiseTag {
  id: string;
  name: string;
  created_at: string;
}

export interface Prize {
  id: string;
  name: string;
  photo_url: string | null;
  coin_tier: CoinTier | null;
  coin_value_silver_equivalent: number | null;
  // Informational only -- the coin price staff intended to charge, kept
  // separate from coin_tier so mismatches (someone sold it for a different
  // price) can be spotted. Not used in any calculation.
  coin_price: number | null;
  makerworld_link: string | null;
  stock_count: number;
  status: PrizeStatus;
  size: RequestSize | null;
  created_at: string;
  updated_at: string;
  filaments?: Pick<Filament, "id" | "color_name">[];
  franchiseTags?: FranchiseTag[];
}

export interface PrizeRequest {
  id: string;
  student_name: string;
  requested_by: string | null;
  prize_id: string | null;
  free_text_prize: string | null;
  size: RequestSize | null;
  color_filament_id: string | null;
  links: string | null;
  date_requested: string;
  status: RequestStatus;
  is_print_club: boolean;
  notes: string | null;
  photo_url: string | null;
  sale_price: number | null;
  created_at: string;
  // populated via join
  prize?: Pick<Prize, "id" | "name" | "photo_url" | "coin_price"> | null;
  color_filament?: Pick<Filament, "id" | "color_name"> | null;
  franchiseTags?: FranchiseTag[];
  colorFilaments?: Pick<Filament, "id" | "color_name" | "swatch_hex">[];
}

export interface Checkout {
  id: string;
  prize_id: string;
  date_checked_out: string;
  bought_by: string | null;
  created_at: string;
  prize?: Pick<Prize, "id" | "name" | "photo_url"> | null;
}

export interface Filament {
  id: string;
  color_name: string;
  swatch_hex: string | null;
  material_type: string | null;
  stock_level: number | null;
  stock_unit: string;
  low_stock_threshold: number | null;
  amazon_link: string | null;
  created_at: string;
  prizes?: Pick<Prize, "id" | "name">[];
}

export interface PrizeFilament {
  prize_id: string;
  filament_id: string;
}

// Minimal Database type so `createClient<Database>` type-checks without
// generating the full Supabase CLI types file.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any;
