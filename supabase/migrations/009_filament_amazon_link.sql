-- Lets a filament color carry a link back to where it's bought (usually
-- Amazon), so restocking a color that's run out is a click away instead of
-- a re-search. Purely additive.
alter table filaments add column if not exists amazon_link text;
