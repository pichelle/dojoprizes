-- Ideas skip the Printed/Fulfilled pickup steps entirely -- an idea has no
-- student waiting on it, so once it's printed it just becomes catalog
-- stock. "in_prize_bin" is a new terminal status for that path, kept
-- distinct from "fulfilled" so it stays out of the Avg. turnaround stat
-- (which measures a student's wait time, not idea-to-print time) while
-- still disappearing from the visible board, same as fulfilled does today.
alter table requests drop constraint if exists requests_status_check;
alter table requests add constraint requests_status_check
  check (status in ('idea', 'pending', 'printed', 'fulfilled', 'cancelled', 'in_prize_bin'));

-- Whether a request started life as an idea -- set once at creation and
-- never changed afterward. Needed because once an idea moves past the
-- "idea" status it looks like any other row in the "pending" (Queue)
-- status, but its available next steps are different (straight to Prize
-- Bin, not Printed/Fulfilled) -- so the app needs to remember its origin
-- even after the status itself has moved on.
alter table requests add column if not exists originated_as_idea boolean not null default false;
update requests set originated_as_idea = true where status = 'idea';
