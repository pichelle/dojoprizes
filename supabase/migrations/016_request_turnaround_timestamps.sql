-- Adds timestamps for the two moments the "average turnaround time" stat
-- needs: when a request entered the pending queue, and when it was marked
-- fulfilled. Neither was tracked before now -- the app only ever stored the
-- current status, not a history of when it changed.

alter table requests add column if not exists pending_at timestamptz;
alter table requests add column if not exists fulfilled_at timestamptz;

-- Backfill for requests that are already sitting in pending (or have moved
-- past it to printed/fulfilled) as of this migration -- we don't know the
-- exact time they entered the queue, so we estimate using the date they
-- were requested at 3pm Pacific, which is when the dojo opens and requests
-- start coming in. Already-fulfilled requests are intentionally left with
-- no pending_at/fulfilled_at here (see below) since we have no reliable
-- "fulfilled" timestamp to pair it with -- they're excluded from the
-- average until the app captures both ends going forward.
update requests
set pending_at = (date_requested::text || ' 15:00:00')::timestamp at time zone 'America/Los_Angeles'
where status in ('pending', 'printed')
  and pending_at is null;
