-- Lets a request carry the actual price it sold for, set when a request
-- moves to Fulfilled (prefilled from the prize's catalog coin_price, but
-- editable since actual size/color availability can change what it goes
-- for). Non-destructive, purely additive.
alter table requests add column if not exists sale_price numeric;
