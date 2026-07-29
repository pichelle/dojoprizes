-- Lets a checkout record who took the prize (asked via a quick modal when
-- staff clicks "Sold!"), and lets a request carry its own reference photo
-- separate from the catalog (handy for custom/not-yet-catalogued prizes).
alter table checkouts add column if not exists bought_by text;
alter table requests add column if not exists photo_url text;
