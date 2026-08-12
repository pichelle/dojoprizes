-- Adds "True to size" as a size option on both prizes and requests, for
-- prints where sizing isn't small/medium/large/xlarge (e.g. wearables
-- that just fit as designed).
alter table prizes drop constraint if exists prizes_size_check;
alter table prizes add constraint prizes_size_check
  check (size in ('small', 'medium', 'large', 'xlarge', 'true_to_size'));

alter table requests drop constraint if exists requests_size_check;
alter table requests add constraint requests_size_check
  check (size in ('small', 'medium', 'large', 'xlarge', 'true_to_size'));
