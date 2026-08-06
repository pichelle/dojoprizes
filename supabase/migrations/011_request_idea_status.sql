-- Adds an "idea" status ahead of "pending" in the request lifecycle, for
-- things that aren't a real request yet (a sensei's idea, a themed print
-- planned for an upcoming holiday) -- these get moved into Pending once
-- someone commits to actually printing them, or Cancelled if dropped.
alter table requests drop constraint if exists requests_status_check;
alter table requests add constraint requests_status_check
  check (status in ('idea', 'pending', 'printed', 'fulfilled', 'cancelled'));
