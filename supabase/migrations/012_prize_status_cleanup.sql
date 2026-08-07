-- "Out of stock" is folded into "Print-on-request": once a prize's stock
-- hits 0, it's automatically labeled Print-on-request instead of Out of
-- stock (staff can still print another on request, so "out of stock"
-- undersold what was actually possible). This updates any existing rows
-- and removes out_of_stock as an allowed value going forward.
update prizes set status = 'print_on_request' where status = 'out_of_stock';

alter table prizes drop constraint if exists prizes_status_check;
alter table prizes add constraint prizes_status_check
  check (status in ('in_stock', 'low_stock', 'print_on_request'));
