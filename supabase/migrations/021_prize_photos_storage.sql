-- Storage bucket for staff-uploaded prize/request photos, so photos can
-- be uploaded directly from a device instead of only linked from an
-- external URL. This also fixes the deferred bug where prize images on
-- request cards break because they point straight at Tinkercad (which
-- requires an active login) -- once a photo lives in this bucket, it's a
-- plain public URL the app fully controls, not a link into someone
-- else's site.
--
-- Public (not signed URLs): matches the trust model the rest of this app
-- already uses -- no per-user auth, RLS policies below allow full access
-- to the anon role the same way every other table's policies do (see the
-- note in supabase/schema.sql's RLS section).
insert into storage.buckets (id, name, public)
values ('prize-photos', 'prize-photos', true)
on conflict (id) do nothing;

drop policy if exists "anon full access on prize-photos" on storage.objects;
create policy "anon full access on prize-photos" on storage.objects for all
  using (bucket_id = 'prize-photos')
  with check (bucket_id = 'prize-photos');
