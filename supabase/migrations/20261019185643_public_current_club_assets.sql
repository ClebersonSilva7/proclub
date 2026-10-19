begin;
-- The bucket remains private. Publish only the currently referenced image of
-- an active club; old/unattached uploads remain invisible to the public.
create index club_settings_logo_path_idx on public.club_settings(logo_path) where logo_path is not null;
create index club_settings_cover_path_idx on public.club_settings(cover_path) where cover_path is not null;
create policy club_assets_current_public on storage.objects for select to anon,authenticated
using (
  bucket_id='club-assets'
  and exists (
    select 1 from public.club_settings s join public.clubs c on c.id=s.club_id
    where c.status='active' and (
      (s.logo_path=storage.objects.name and storage.objects.name like c.id::text || '/logo/%')
      or (s.cover_path=storage.objects.name and storage.objects.name like c.id::text || '/cover/%')
    )
  )
);
commit;
