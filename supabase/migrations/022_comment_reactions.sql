-- Emoji reactions on comments -- lighter-weight than a reply, lets a
-- sensei acknowledge a comment without opening the composer. No login
-- system, so `actor` is the same free-typed/active-profile name pattern
-- used everywhere else (request_comments.author, requests.requested_by).
--
-- The unique constraint is what makes a click "toggle" -- the app deletes
-- the matching row instead of inserting a duplicate when the same person
-- clicks the same emoji again.
create table if not exists comment_reactions (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references request_comments (id) on delete cascade,
  emoji text not null,
  actor text,
  created_at timestamptz not null default now(),
  unique (comment_id, emoji, actor)
);

create index if not exists comment_reactions_comment_id_idx on comment_reactions (comment_id);

alter table comment_reactions enable row level security;

drop policy if exists "anon full access" on comment_reactions;
create policy "anon full access" on comment_reactions for all
  using (true) with check (true);
