-- Adds an explicit "Any" option for a request's size and color, so staff
-- can signal "no preference" on purpose instead of the field just being
-- left blank (which reads as "forgotten" rather than "intentional").
-- Requests only -- prizes in the catalog always need a concrete size.
alter table requests drop constraint if exists requests_size_check;
alter table requests add constraint requests_size_check
  check (size in ('small', 'medium', 'large', 'xlarge', 'true_to_size', 'any'));

alter table requests add column if not exists color_any boolean not null default false;
