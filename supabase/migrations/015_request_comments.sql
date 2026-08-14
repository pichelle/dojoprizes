-- Card comments -- a running thread of timestamped notes on a request,
-- distinct from the existing single `notes` field (which stays as one
-- freeform field, unchanged). There's no login system, so `author` is a
-- free-typed sensei name, same pattern as requests.requested_by.
create table if not exists request_comments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references requests (id) on delete cascade,
  author text,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists request_comments_request_id_idx on request_comments (request_id);

alter table request_comments enable row level security;

drop policy if exists "anon full access" on request_comments;
create policy "anon full access" on request_comments for all
  using (true) with check (true);
