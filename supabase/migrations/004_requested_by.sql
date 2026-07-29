-- Adds requested_by so senseis can log which staff member made a request.
alter table requests add column if not exists requested_by text;
