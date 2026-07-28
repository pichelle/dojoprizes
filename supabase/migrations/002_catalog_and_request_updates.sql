-- DojoPrizes — migration 002
-- Run this in the Supabase SQL Editor AFTER schema.sql. Paste the whole
-- file in and hit Run. Safe to re-run.

-- Prizes: remove the free-text tags field, add an optional "listed price in
-- coins" field that's purely informational (not used in any calculation) so
-- staff can spot when something got sold for a different price than intended.
alter table prizes drop column if exists tags;
alter table prizes add column if not exists coin_price numeric;

-- Requests: size, a color pulled from the Filament Inventory list, a
-- free-text franchise tag, and a multi-line field for reference/idea links.
alter table requests
  add column if not exists size text
    check (size in ('small', 'medium', 'large', 'xlarge'));

alter table requests
  add column if not exists color_filament_id uuid references filaments (id) on delete set null;

alter table requests add column if not exists franchise text;
alter table requests add column if not exists links text;

create index if not exists requests_color_filament_idx on requests (color_filament_id);
create index if not exists requests_franchise_idx on requests (franchise);
