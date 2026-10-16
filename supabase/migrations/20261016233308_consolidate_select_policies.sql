begin;
-- One SELECT predicate per API role avoids repeated permissive policy checks.
drop policy clubs_public on public.clubs;
drop policy clubs_management_read on public.clubs;
create policy clubs_public on public.clubs for select to anon using (status = 'active');
create policy clubs_authenticated on public.clubs for select to authenticated
  using (status = 'active' or private.can_manage_club(id));
drop policy settings_public on public.club_settings;
drop policy settings_management_read on public.club_settings;
create policy settings_public on public.club_settings for select to anon
  using (exists (select 1 from public.clubs c where c.id = club_id and c.status = 'active'));
create policy settings_authenticated on public.club_settings for select to authenticated
  using (private.can_manage_club(club_id) or exists (
    select 1 from public.clubs c where c.id = club_id and c.status = 'active'
  ));
commit;
