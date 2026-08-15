-- "Who's logging in" profiles -- there's still no real per-user auth (the
-- shared password gate in middleware.ts is unchanged), this is purely a
-- per-browser identity layer so requests/comments can be auto-attributed
-- and the picker can show a friendly "Who's logging in?" screen. Storing
-- a real row (rather than just a hardcoded list) so profiles can be
-- created/edited/re-colored from the UI without a code change.
create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  -- Raw first name, no "Sensei" prefix stored -- formatSensei() adds that
  -- at display time, same convention as requests.requested_by.
  name text not null,
  -- Hex swatch used for the profile tile background/tint. Picked from the
  -- app's existing status-pill palette so new profile colors always match
  -- the rest of the design system instead of introducing new hues.
  color_hex text not null default '#e0edfb',
  -- Null = use the default ninja mascot icon (public/ninja.png). Profiles
  -- created from the picker's "+ Add profile" flow always get null here;
  -- only the two seeded profiles below have a custom uploaded icon.
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

drop policy if exists "anon full access" on profiles;
create policy "anon full access" on profiles for all
  using (true) with check (true);

-- Seed the two current staff profiles. Safe to re-run: skips if profiles
-- with these names already exist.
insert into profiles (name, color_hex, avatar_url)
select 'Michelle', '#fbf4dc', '/avatars/michelle.png'
where not exists (select 1 from profiles where name = 'Michelle');

insert into profiles (name, color_hex, avatar_url)
select 'John', '#e0edfb', '/avatars/john.png'
where not exists (select 1 from profiles where name = 'John');
