begin;
-- Storage stays private; only club managers/global admins can read these assets.
-- Public delivery will be defined with the public site, without public buckets.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('club-assets','club-assets',false,2097152,array['image/png','image/jpeg','image/webp']);

create function private.can_manage_asset(object_name text) returns boolean
language sql stable security invoker set search_path='' as $$
  select case when object_name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/(logo|cover)/[0-9a-f-]{36}\.(png|jpg|webp)$'
    then private.can_manage_club(split_part(object_name,'/',1)::uuid)
      and exists(select 1 from public.clubs where id=split_part(object_name,'/',1)::uuid and status<>'archived')
    else false end;
$$;
revoke all on function private.can_manage_asset(text) from public,anon,authenticated,service_role;
grant execute on function private.can_manage_asset(text) to authenticated;
create policy club_assets_read on storage.objects for select to authenticated
using (bucket_id='club-assets' and private.can_manage_asset(name));
create policy club_assets_insert on storage.objects for insert to authenticated
with check (bucket_id='club-assets' and private.can_manage_asset(name));
-- No update/move/delete policy: versioned uploads cannot overwrite other objects.

create function private.protect_archived_settings() returns trigger
language plpgsql security invoker set search_path='' as $$
declare club_status text;
begin
  select status into club_status from public.clubs where id=new.club_id for update;
  if club_status is null or club_status='archived' then
    raise exception 'Club identity is not editable' using errcode='42501';
  end if;
  return new;
end;
$$;
revoke all on function private.protect_archived_settings() from public,anon,authenticated,service_role;
create trigger protect_archived_settings before update on public.club_settings
for each row execute function private.protect_archived_settings();

create function public.club_save_identity(p_club_id uuid,p_expected_club timestamptz,p_expected_settings timestamptz,p_values jsonb)
returns void language plpgsql security invoker set search_path='' as $$
declare c public.clubs; s public.club_settings;
begin
  if (select auth.uid()) is null or not private.can_manage_club(p_club_id) then
    raise exception 'Club management required' using errcode='42501';
  end if;
  select * into c from public.clubs where id=p_club_id for update;
  if not found or c.status='archived' then raise exception 'Club not editable' using errcode='42501'; end if;
  select * into s from public.club_settings where club_id=p_club_id for update;
  if not found or p_expected_club is distinct from c.updated_at or p_expected_settings is distinct from s.updated_at then
    raise exception 'Identity changed; reload' using errcode='40001';
  end if;
  if jsonb_typeof(p_values) is distinct from 'object' or exists(
    select 1 from jsonb_object_keys(p_values) k where k not in ('name','primary_sport','city','state','description','primary_color','secondary_color','public_email','public_phone','website_url','instagram_url','facebook_url')
  ) then raise exception 'Invalid identity fields' using errcode='23514'; end if;
  update public.clubs set name=p_values->>'name',primary_sport=p_values->>'primary_sport',city=p_values->>'city',state=p_values->>'state' where id=p_club_id;
  update public.club_settings set description=p_values->>'description',primary_color=p_values->>'primary_color',secondary_color=p_values->>'secondary_color',public_email=nullif(p_values->>'public_email',''),public_phone=nullif(p_values->>'public_phone',''),website_url=nullif(p_values->>'website_url',''),instagram_url=nullif(p_values->>'instagram_url',''),facebook_url=nullif(p_values->>'facebook_url','') where club_id=p_club_id;
end;
$$;
create function public.club_set_image(p_club_id uuid,p_kind text,p_path text,p_expected_settings timestamptz)
returns void language plpgsql security invoker set search_path='' as $$
declare s public.club_settings; club_status text;
begin
  if (select auth.uid()) is null or not private.can_manage_club(p_club_id) then raise exception 'Club management required' using errcode='42501'; end if;
  select status into club_status from public.clubs where id=p_club_id for update;
  if not found or club_status='archived' then raise exception 'Club not editable' using errcode='42501'; end if;
  select * into s from public.club_settings where club_id=p_club_id for update;
  if not found or p_expected_settings is distinct from s.updated_at then raise exception 'Identity changed; reload' using errcode='40001'; end if;
  if p_kind is null or p_kind not in ('logo','cover') then raise exception 'Invalid image kind' using errcode='23514'; end if;
  if p_path is not null and (
    not private.can_manage_asset(p_path) or split_part(p_path,'/',1)<>p_club_id::text or split_part(p_path,'/',2)<>p_kind
    or not exists(select 1 from storage.objects where bucket_id='club-assets' and name=p_path)
  ) then raise exception 'Uploaded club image required' using errcode='23514'; end if;
  if p_kind='logo' then update public.club_settings set logo_path=p_path where club_id=p_club_id;
  else update public.club_settings set cover_path=p_path where club_id=p_club_id; end if;
end;
$$;
revoke all on function public.club_save_identity(uuid,timestamptz,timestamptz,jsonb), public.club_set_image(uuid,text,text,timestamptz) from public,anon,authenticated,service_role;
grant execute on function public.club_save_identity(uuid,timestamptz,timestamptz,jsonb), public.club_set_image(uuid,text,text,timestamptz) to authenticated;
commit;
