begin;
-- PostgREST 14 retries 40001 indefinitely; optimistic conflicts are HTTP 409.
create or replace function private.platform_save_club(
  p_club_id uuid, p_name text, p_slug text, p_primary_sport text,
  p_city text, p_state text, p_status text, p_expected_updated_at timestamptz, p_reason text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare previous public.clubs; saved public.clubs;
begin
  perform private.admin_audit_context(p_reason);
  if p_status is null or p_status not in ('draft','active','suspended','archived') then
    raise exception 'Invalid club status' using errcode='23514';
  end if;
  if p_club_id is null then
    if p_status <> 'draft' then raise exception 'New clubs start as draft' using errcode='23514'; end if;
    insert into public.clubs(name,slug,primary_sport,city,state,status)
      values(btrim(p_name),p_slug,btrim(p_primary_sport),btrim(p_city),p_state,'draft') returning * into saved;
  else
    select * into previous from public.clubs where id = p_club_id for update;
    if not found then raise exception 'Club not found' using errcode='P0002'; end if;
    if p_expected_updated_at is null or p_expected_updated_at <> previous.updated_at then
      raise exception 'Club changed; reload before saving' using errcode='PT409';
    end if;
    if previous.status='archived' then raise exception 'Archived club is read-only' using errcode='23514'; end if;
    if p_slug is distinct from previous.slug then raise exception 'Slug cannot be changed' using errcode='23514'; end if;
    if p_status <> previous.status and not (
      (previous.status='draft' and p_status in ('active','archived')) or
      (previous.status='active' and p_status in ('suspended','archived')) or
      (previous.status='suspended' and p_status in ('active','archived'))
    ) then raise exception 'Invalid status transition' using errcode='23514'; end if;
    if p_status='active' and not exists (
      select 1 from public.club_staff where club_id=p_club_id and role='owner' and status='active'
    ) then raise exception 'Active club requires an active owner' using errcode='23514'; end if;
    update public.clubs set name=btrim(p_name),primary_sport=btrim(p_primary_sport),city=btrim(p_city),state=p_state,status=p_status
      where id=p_club_id returning * into saved;
  end if;
  insert into private.permission_audit(database_actor,operator,reason,entity,operation,old_data,new_data)
    values(session_user,(select auth.uid())::text,btrim(p_reason),'clubs',case when p_club_id is null then 'INSERT' else 'UPDATE' end,
      case when p_club_id is not null then to_jsonb(previous) end,to_jsonb(saved));
  return saved.id;
end;
$$;
create or replace function private.platform_set_staff(
  p_club_id uuid, p_email text, p_role text, p_status text, p_reason text,
  p_expected_role text, p_expected_status text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare target uuid; club_status text; previous public.club_staff;
begin
  perform private.admin_audit_context(p_reason);
  if p_role is null or p_role not in ('owner','manager','staff') or p_status is null or p_status not in ('active','revoked')
    or p_email is null or length(p_email)>254 then raise exception 'Invalid staff values' using errcode='23514'; end if;
  -- All staff changes serialize on the club row, protecting the final owner.
  select status into club_status from public.clubs where id=p_club_id for update;
  if not found then raise exception 'Club not found' using errcode='P0002'; end if;
  if club_status='archived' then raise exception 'Archived club is read-only' using errcode='23514'; end if;
  select id into target from auth.users where lower(email)=lower(btrim(p_email))
    and email_confirmed_at is not null and not is_anonymous and deleted_at is null
    and (banned_until is null or banned_until<=now());
  if not found then raise exception 'Confirmed account not found' using errcode='P0002'; end if;
  select * into previous from public.club_staff where club_id=p_club_id and user_id=target for update;
  if previous.user_id is null then
    if p_expected_role is not null or p_expected_status is not null or p_status<>'active' then
      raise exception 'Staff changed; reload before saving' using errcode='PT409';
    end if;
  elsif p_expected_role is distinct from previous.role or p_expected_status is distinct from previous.status then
    raise exception 'Staff changed; reload before saving' using errcode='PT409';
  end if;
  if club_status='active' and previous.role='owner' and previous.status='active'
    and (p_role<>'owner' or p_status<>'active') and not exists (
      select 1 from public.club_staff where club_id=p_club_id and user_id<>target and role='owner' and status='active'
    ) then raise exception 'Cannot remove the final active owner' using errcode='23514'; end if;
  insert into public.profiles(id) values(target) on conflict (id) do nothing;
  insert into public.club_staff(club_id,user_id,role,status) values(p_club_id,target,p_role,p_status)
    on conflict (club_id,user_id) do update set role=excluded.role,status=excluded.status;
  return target;
end;
$$;
create or replace function public.club_save_identity(p_club_id uuid,p_expected_club timestamptz,p_expected_settings timestamptz,p_values jsonb)
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
    raise exception 'Identity changed; reload' using errcode='PT409';
  end if;
  if jsonb_typeof(p_values) is distinct from 'object' or exists(
    select 1 from jsonb_object_keys(p_values) k where k not in ('name','primary_sport','city','state','description','primary_color','secondary_color','public_email','public_phone','website_url','instagram_url','facebook_url')
  ) then raise exception 'Invalid identity fields' using errcode='23514'; end if;
  update public.clubs set name=p_values->>'name',primary_sport=p_values->>'primary_sport',city=p_values->>'city',state=p_values->>'state' where id=p_club_id;
  update public.club_settings set description=p_values->>'description',primary_color=p_values->>'primary_color',secondary_color=p_values->>'secondary_color',public_email=nullif(p_values->>'public_email',''),public_phone=nullif(p_values->>'public_phone',''),website_url=nullif(p_values->>'website_url',''),instagram_url=nullif(p_values->>'instagram_url',''),facebook_url=nullif(p_values->>'facebook_url','') where club_id=p_club_id;
end;
$$;
create or replace function public.club_set_image(p_club_id uuid,p_kind text,p_path text,p_expected_settings timestamptz)
returns void language plpgsql security invoker set search_path='' as $$
declare s public.club_settings; club_status text;
begin
  if (select auth.uid()) is null or not private.can_manage_club(p_club_id) then raise exception 'Club management required' using errcode='42501'; end if;
  select status into club_status from public.clubs where id=p_club_id for update;
  if not found or club_status='archived' then raise exception 'Club not editable' using errcode='42501'; end if;
  select * into s from public.club_settings where club_id=p_club_id for update;
  if not found or p_expected_settings is distinct from s.updated_at then raise exception 'Identity changed; reload' using errcode='PT409'; end if;
  if p_kind is null or p_kind not in ('logo','cover') then raise exception 'Invalid image kind' using errcode='23514'; end if;
  if p_path is not null and (
    not private.can_manage_asset(p_path) or split_part(p_path,'/',1)<>p_club_id::text or split_part(p_path,'/',2)<>p_kind
    or not exists(select 1 from storage.objects where bucket_id='club-assets' and name=p_path)
  ) then raise exception 'Uploaded club image required' using errcode='23514'; end if;
  if p_kind='logo' then update public.club_settings set logo_path=p_path where club_id=p_club_id;
  else update public.club_settings set cover_path=p_path where club_id=p_club_id; end if;
end;
$$;
commit;
