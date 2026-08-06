-- Formalizes a column that was added to production ad hoc (via a manual
-- catch-up script run directly in the Supabase SQL editor) but was never
-- captured as a tracked migration file. Written now, alongside the prize
-- catalog work that will actually read/write it, so the migration history
-- matches what's live. Safe to re-run.
alter table prizes add column if not exists size text
  check (size in ('small', 'medium', 'large', 'xlarge'));
