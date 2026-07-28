-- DojoPrizes — migration 003
-- Run this in the Supabase SQL Editor AFTER migration 002. Paste the whole
-- file in and hit Run. Safe to re-run.
--
-- Turns "franchise" from a free-text field on prizes/requests into a shared,
-- reusable, multi-select tag list -- so "Pokemon" and "pokémon" don't end up
-- as two different values, and a prize/request can carry more than one tag.

create table if not exists franchise_tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists prize_franchise_tags (
  prize_id uuid not null references prizes (id) on delete cascade,
  tag_id uuid not null references franchise_tags (id) on delete cascade,
  primary key (prize_id, tag_id)
);

create table if not exists request_franchise_tags (
  request_id uuid not null references requests (id) on delete cascade,
  tag_id uuid not null references franchise_tags (id) on delete cascade,
  primary key (request_id, tag_id)
);

-- Backfill: turn any existing free-text franchise values into tags and link
-- them up, so nothing already entered gets lost.
insert into franchise_tags (name)
select distinct trim(franchise) from prizes
where franchise is not null and trim(franchise) <> ''
on conflict (name) do nothing;

insert into franchise_tags (name)
select distinct trim(franchise) from requests
where franchise is not null and trim(franchise) <> ''
on conflict (name) do nothing;

insert into prize_franchise_tags (prize_id, tag_id)
select p.id, t.id
from prizes p
join franchise_tags t on t.name = trim(p.franchise)
where p.franchise is not null and trim(p.franchise) <> ''
on conflict do nothing;

insert into request_franchise_tags (request_id, tag_id)
select r.id, t.id
from requests r
join franchise_tags t on t.name = trim(r.franchise)
where r.franchise is not null and trim(r.franchise) <> ''
on conflict do nothing;

alter table prizes drop column if exists franchise;
alter table requests drop column if exists franchise;

alter table franchise_tags enable row level security;
alter table prize_franchise_tags enable row level security;
alter table request_franchise_tags enable row level security;

drop policy if exists "anon full access" on franchise_tags;
create policy "anon full access" on franchise_tags for all
  using (true) with check (true);

drop policy if exists "anon full access" on prize_franchise_tags;
create policy "anon full access" on prize_franchise_tags for all
  using (true) with check (true);

drop policy if exists "anon full access" on request_franchise_tags;
create policy "anon full access" on request_franchise_tags for all
  using (true) with check (true);
