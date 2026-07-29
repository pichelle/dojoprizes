-- Lets a request be flagged as 3D Print Club (highest priority, sorts to
-- the top of the queue), and lets a filament color carry a hex swatch so
-- the UI can show a real color dot instead of just the name.
alter table requests add column if not exists is_print_club boolean not null default false;
alter table filaments add column if not exists swatch_hex text;
