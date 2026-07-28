// Hand-written types mirroring supabase/schema.sql.
// (If you later install the Supabase CLI you can replace this with
// `supabase gen types typescript` output.)

export type CoinTier = "silver" | "gold" | "obsidian";

export type PrizeStatus =
  | "in_stock"
  | "low_stock"
  | "out_of_stock"
  | "print_on_request";

export type RequestStatus = "pending" | "printed" | "fulfilled" | "cancelled";

export interface Prize {
  id: string;
  name: string;
  photo_url: string | null;
  franchise: string | null;
  tags: string[];
  coin_tier: CoinTier | null;
  coin_value_silver_equivalent: number | null;
  makerworld_link: string | null;
  stock_count: number;
  status: PrizeStatus;
  created_at: string;
  updated_at: string;
}

export interface PrizeRequest {
  id: string;
  student_name: string;
  prize_id: string | null;
  free_text_prize: string | null;
  date_requested: string;
  status: RequestStatus;
  notes: string | null;
  created_at: string;
  // populated via join
  prize?: Pick<Prize, "id" | "name" | "photo_url"> | null;
}

export interface Checkout {
  id: string;
  prize_id: string;
  date_checked_out: string;
  created_at: string;
  prize?: Pick<Prize, "id" | "name" | "photo_url" | "franchise"> | null;
}

export interface Filament {
  id: string;
  color_name: string;
  material_type: string | null;
  stock_level: number | null;
  stock_unit: string;
  low_stock_threshold: number | null;
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
