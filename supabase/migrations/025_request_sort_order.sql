-- Manual drag position within a board column, scoped to whichever Print
-- Club/regular partition the row is currently in (is_print_club always
-- sorts first within a column -- this only orders rows within that split,
-- never across it). Null until someone actually drags a card in that
-- column; null rows fall back to date_requested order and always sort
-- after any manually-positioned ones.
alter table requests add column if not exists sort_order double precision;
