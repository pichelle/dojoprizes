-- Lets a prize record the size it's normally printed at. Bin prizes are
-- printed on spec (not requested), but still have a size like custom
-- requests do -- this lets size-trending on the Checkouts page cover both
-- sources evenly.
alter table prizes add column if not exists size text
  check (size in ('small', 'medium', 'large', 'xlarge'));
