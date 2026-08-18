-- Comments (+ emoji reactions) and an activity log for prizes, mirroring
-- request_comments / comment_reactions / request_activity so the Prize
-- Bin's side peek can get the same Comments/Activity tabs as the Requests
-- peek. Kept as separate tables (not a shared/polymorphic one) so this
-- doesn't touch anything request-related.
--
-- Activity event types are 'created', 'edited', and 'reprinted' --
-- "reprinted" is a manual "Log a reprint" action in the peek (not
-- inferred from stock edits, since a stock correction isn't the same
-- thing as actually reprinting one), and the running "reprinted N times"
-- count shown in the UI is just a count of these entries -- no separate
-- counter column to keep in sync.
create table if not exists prize_comments (
  id uuid primary key default gen_random_uuid(),
  prize_id uuid not null references prizes (id) on delete cascade,
  author text,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists prize_comments_prize_id_idx on prize_comments (prize_id);

create table if not exists prize_comment_reactions (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references prize_comments (id) on delete cascade,
  emoji text not null,
  actor text,
  created_at timestamptz not null default now(),
  unique (comment_id, emoji, actor)
);

create index if not exists prize_comment_reactions_comment_id_idx on prize_comment_reactions (comment_id);

create table if not exists prize_activity (
  id uuid primary key default gen_random_uuid(),
  prize_id uuid not null references prizes (id) on delete cascade,
  actor text,
  event_type text not null check (event_type in ('created', 'edited', 'reprinted')),
  changes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists prize_activity_prize_id_idx on prize_activity (prize_id);

alter table prize_comments enable row level security;
alter table prize_comment_reactions enable row level security;
alter table prize_activity enable row level security;

drop policy if exists "anon full access" on prize_comments;
create policy "anon full access" on prize_comments for all
  using (true) with check (true);

drop policy if exists "anon full access" on prize_comment_reactions;
create policy "anon full access" on prize_comment_reactions for all
  using (true) with check (true);

drop policy if exists "anon full access" on prize_activity;
create policy "anon full access" on prize_activity for all
  using (true) with check (true);
