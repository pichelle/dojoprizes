-- DojoPrizes — full schema (fresh install)
-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query)
-- for a brand new project. Safe to re-run. If your project already has the
-- original tables and you're catching up, run the files in
-- supabase/migrations/ in order instead.

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────────────────
-- Prizes
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists prizes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  photo_url text,
  franchise text,
  coin_tier text check (coin_tier in ('silver', 'gold', 'obsidian')),
  coin_value_silver_equivalent integer,
  -- Purely informational: the coin price staff intended to charge, kept
  -- separate from coin_tier so it can be compared against what a prize
  -- actually sold for. Not used in any calculation.
  coin_price numeric,
  makerworld_link text,
  stock_count integer not null default 0,
  status text not null default 'in_stock'
    check (status in ('in_stock', 'low_stock', 'out_of_stock', 'print_on_request')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists prizes_franchise_idx on prizes (franchise);
create index if not exists prizes_status_idx on prizes (status);

-- ─────────────────────────────────────────────────────────────────────────
-- Filament (created before requests/prize_filament since both reference it)
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists filaments (
  id uuid primary key default gen_random_uuid(),
  color_name text not null,
  material_type text,
  stock_level numeric,
  stock_unit text not null default 'spools',
  low_stock_threshold numeric,
  created_at timestamptz not null default now()
);

-- Many-to-many join between prizes and filaments
create table if not exists prize_filament (
  prize_id uuid not null references prizes (id) on delete cascade,
  filament_id uuid not null references filaments (id) on delete cascade,
  primary key (prize_id, filament_id)
);

-- ─────────────────────────────────────────────────────────────────────────
-- Requests
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists requests (
  id uuid primary key default gen_random_uuid(),
  student_name text not null,
  prize_id uuid references prizes (id) on delete set null,
  free_text_prize text,
  franchise text,
  size text check (size in ('small', 'medium', 'large', 'xlarge')),
  color_filament_id uuid references filaments (id) on delete set null,
  links text,
  date_requested date not null default current_date,
  status text not null default 'pending'
    check (status in ('pending', 'printed', 'fulfilled', 'cancelled')),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists requests_status_idx on requests (status);
create index if not exists requests_date_idx on requests (date_requested);
create index if not exists requests_color_filament_idx on requests (color_filament_id);
create index if not exists requests_franchise_idx on requests (franchise);

-- ─────────────────────────────────────────────────────────────────────────
-- Checkouts
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists checkouts (
  id uuid primary key default gen_random_uuid(),
  prize_id uuid not null references prizes (id) on delete cascade,
  date_checked_out date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists checkouts_prize_idx on checkouts (prize_id);
create index if not exists checkouts_date_idx on checkouts (date_checked_out);

-- ─────────────────────────────────────────────────────────────────────────
-- updated_at trigger for prizes
-- ─────────────────────────────────────────────────────────────────────────
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists prizes_set_updated_at on prizes;
create trigger prizes_set_updated_at
  before update on prizes
  for each row
  execute function set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- Row Level Security
--
-- This app has no per-user Supabase Auth — it's a single internal tool
-- protected by an app-level shared password (see src/proxy.ts) and talks
-- to Supabase using the anon key from server-only code (Server
-- Components / Server Actions), never from the browser. RLS is enabled
-- with policies that allow full access to the anon role so the app works,
-- since the anon key is not exposed to the client. If you ever add a
-- client-side Supabase call, revisit these policies first.
-- ─────────────────────────────────────────────────────────────────────────
alter table prizes enable row level security;
alter table requests enable row level security;
alter table checkouts enable row level security;
alter table filaments enable row level security;
alter table prize_filament enable row level security;

drop policy if exists "anon full access" on prizes;
create policy "anon full access" on prizes for all
  using (true) with check (true);

drop policy if exists "anon full access" on requests;
create policy "anon full access" on requests for all
  using (true) with check (true);

drop policy if exists "anon full access" on checkouts;
create policy "anon full access" on checkouts for all
  using (true) with check (true);

drop policy if exists "anon full access" on filaments;
create policy "anon full access" on filaments for all
  using (true) with check (true);

drop policy if exists "anon full access" on prize_filament;
create policy "anon full access" on prize_filament for all
  using (true) with check (true);
