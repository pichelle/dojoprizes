-- Activity log -- a timestamped, attributed record of what happened to a
-- request/idea: creation, status moves, and edits to the fields that
-- actually matter to a sensei (prize, size, color, price, etc). Distinct
-- from request_comments (freeform discussion) -- this is system-generated,
-- not typed by hand. `actor` follows the same free-typed-name pattern as
-- request_comments.author and requests.requested_by (no login system).
--
-- `changes` is a small JSON array of { field, label, from, to } entries --
-- a curated diff of meaningful fields, not a full audit of every column.
-- For a 'created' or 'status_changed' event it holds a single "status"
-- entry; for an 'edited' event it holds one entry per changed field.
create table if not exists request_activity (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references requests (id) on delete cascade,
  actor text,
  event_type text not null check (event_type in ('created', 'status_changed', 'edited')),
  changes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists request_activity_request_id_idx on request_activity (request_id);

alter table request_activity enable row level security;

drop policy if exists "anon full access" on request_activity;
create policy "anon full access" on request_activity for all
  using (true) with check (true);
