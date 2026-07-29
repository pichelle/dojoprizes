-- Lets a request ask for more than one filament color (the color select on
-- the request form is now a multiselect). Existing single-color data is
-- backfilled into the new join table; the old requests.color_filament_id
-- column is left in place (unused going forward) rather than dropped, so
-- this migration is non-destructive.
create table if not exists request_filaments (
  request_id uuid not null references requests (id) on delete cascade,
  filament_id uuid not null references filaments (id) on delete cascade,
  primary key (request_id, filament_id)
);

insert into request_filaments (request_id, filament_id)
select id, color_filament_id from requests
where color_filament_id is not null
on conflict do nothing;

alter table request_filaments enable row level security;

drop policy if exists "anon full access" on request_filaments;
create policy "anon full access" on request_filaments for all
  using (true) with check (true);
