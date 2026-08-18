// Hand-written types mirroring supabase/schema.sql.
// (If you later install the Supabase CLI you can replace this with
// `supabase gen types typescript` output.)

export type CoinTier = "silver" | "gold" | "obsidian";

export type PrizeStatus = "in_stock" | "print_on_request";

// "in_prize_bin" is the terminal status for an idea-origin request once
// it's printed -- it skips Printed/Fulfilled (there's no student waiting
// on an idea) and becomes catalog stock instead.
export type RequestStatus = "idea" | "pending" | "printed" | "fulfilled" | "cancelled" | "in_prize_bin";

export type RequestSize = "small" | "medium" | "large" | "xlarge" | "true_to_size";

// Requests (not prizes) additionally support an explicit "no preference"
// choice for size and color, so the field can be intentionally left open
// instead of just blank.
export type RequestSizeOrAny = RequestSize | "any";

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
  comments?: PrizeComment[];
  activity?: PrizeActivity[];
}

export interface PrizeRequest {
  id: string;
  student_name: string;
  requested_by: string | null;
  prize_id: string | null;
  free_text_prize: string | null;
  size: RequestSizeOrAny | null;
  color_filament_id: string | null;
  color_any: boolean;
  links: string | null;
  date_requested: string;
  status: RequestStatus;
  is_print_club: boolean;
  notes: string | null;
  photo_url: string | null;
  sale_price: number | null;
  pending_at: string | null;
  fulfilled_at: string | null;
  // Set once at creation, never changed afterward -- true if this row
  // started life as an idea (even after its status has moved past
  // "idea"). Determines whether its next status step is Printed/Fulfilled
  // or straight to the Prize Bin.
  originated_as_idea: boolean;
  created_at: string;
  // populated via join
  prize?: Pick<Prize, "id" | "name" | "photo_url" | "coin_price"> | null;
  color_filament?: Pick<Filament, "id" | "color_name"> | null;
  franchiseTags?: FranchiseTag[];
  colorFilaments?: Pick<Filament, "id" | "color_name" | "swatch_hex">[];
  comments?: RequestComment[];
  commentCount?: number;
  activity?: RequestActivity[];
}

export interface RequestComment {
  id: string;
  request_id: string;
  author: string | null;
  body: string;
  created_at: string;
  reactions?: CommentReaction[];
}

export interface CommentReaction {
  id: string;
  comment_id: string;
  emoji: string;
  actor: string | null;
  created_at: string;
}

export type RequestActivityEventType = "created" | "status_changed" | "edited";

// One curated field diff within an activity entry, e.g.
// { field: "size", label: "Size", from: "Medium", to: "Large" }.
// `from` is null for a value that was previously unset.
export interface RequestActivityChange {
  field: string;
  label: string;
  from: string | null;
  to: string | null;
}

export interface RequestActivity {
  id: string;
  request_id: string;
  actor: string | null;
  event_type: RequestActivityEventType;
  changes: RequestActivityChange[];
  created_at: string;
}

export interface PrizeComment {
  id: string;
  prize_id: string;
  author: string | null;
  body: string;
  created_at: string;
  reactions?: CommentReaction[];
}

// "reprinted" is a manual "Log a reprint" action (see
// supabase/migrations/024_prize_comments_activity.sql) -- not inferred
// from stock edits, so the running reprint count shown in the UI is just
// a count of entries with this event_type.
export type PrizeActivityEventType = "created" | "edited" | "reprinted";

export interface PrizeActivity {
  id: string;
  prize_id: string;
  actor: string | null;
  event_type: PrizeActivityEventType;
  // Reuses the same curated-diff shape as RequestActivityChange.
  changes: RequestActivityChange[];
  created_at: string;
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

export interface Profile {
  id: string;
  name: string;
  color_hex: string;
  avatar_url: string | null;
  created_at: string;
}

// Minimal Database type so `createClient<Database>` type-checks without
// generating the full Supabase CLI types file.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any;
