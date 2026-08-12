-- "Low stock" is removed as a prize status. Status is now fully derived
-- from stock_count (0 = Print-on-request, anything above = In stock) --
-- there's no more manual status picker in the add/edit prize form, so
-- "Low stock" can no longer be set and any existing rows are folded into
-- In stock.
update prizes set status = 'in_stock' where status = 'low_stock';

alter table prizes drop constraint if exists prizes_status_check;
alter table prizes add constraint prizes_status_check
  check (status in ('in_stock', 'print_on_request'));
