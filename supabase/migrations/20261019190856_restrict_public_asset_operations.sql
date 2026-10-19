begin;
-- SELECT also authorizes list/sign in Storage. Anonymous visitors need only
-- authenticated object download/info; no new signed capability may be issued.
alter policy club_assets_current_public on storage.objects using (
  bucket_id='club-assets'
  and storage.allow_any_operation(array['object.get_authenticated','object.get_authenticated_info'])
  and exists (
    select 1 from public.club_settings s join public.clubs c on c.id=s.club_id
    where c.status='active' and (
      (s.logo_path=storage.objects.name and storage.objects.name like c.id::text || '/logo/%')
      or (s.cover_path=storage.objects.name and storage.objects.name like c.id::text || '/cover/%')
    )
  )
);
commit;
