-- Internal notes on a prize, mirroring the single free-text `notes` field
-- requests already have. Intentionally not shown to ninjas anywhere --
-- same "staff-only" treatment as request notes.
alter table prizes add column if not exists notes text;
