begin;
-- Public RPCs are invokers; privileged implementations stay in private.
create function private.require_platform_admin() returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if (select auth.uid()) is null or not private.is_platform_admin() or not exists (
    select 1 from auth.users u where u.id = (select auth.uid())
      and not u.is_anonymous and u.email_confirmed_at is not null and u.deleted_at is null
      and (u.banned_until is null or u.banned_until <= now())
  ) then raise exception 'Platform administrator required' using errcode = '42501'; end if;
end;
$$;
create function private.admin_audit_context(reason text) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  perform private.require_platform_admin();
  if reason is null or length(btrim(reason)) not between 10 and 500 then
    raise exception 'A reason of 10 to 500 characters is required' using errcode = '23514';
  end if;
  perform set_config('proclub.operator', (select auth.uid())::text, true);
  perform set_config('proclub.reason', btrim(reason), true);
end;
$$;
create function private.platform_save_club(
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
      raise exception 'Club changed; reload before saving' using errcode='40001';
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
create function public.platform_save_club(
  p_club_id uuid, p_name text, p_slug text, p_primary_sport text,
  p_city text, p_state text, p_status text, p_expected_updated_at timestamptz, p_reason text
) returns uuid language sql security invoker set search_path = '' as $$
  select private.platform_save_club(p_club_id,p_name,p_slug,p_primary_sport,p_city,p_state,p_status,p_expected_updated_at,p_reason);
$$;

create function private.platform_set_staff(
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
      raise exception 'Staff changed; reload before saving' using errcode='40001';
    end if;
  elsif p_expected_role is distinct from previous.role or p_expected_status is distinct from previous.status then
    raise exception 'Staff changed; reload before saving' using errcode='40001';
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
create function public.platform_set_staff(
  p_club_id uuid, p_email text, p_role text, p_status text, p_reason text,
  p_expected_role text, p_expected_status text
) returns uuid language sql security invoker set search_path = '' as $$
  select private.platform_set_staff(p_club_id,p_email,p_role,p_status,p_reason,p_expected_role,p_expected_status);
$$;
create function private.platform_club_staff(p_club_id uuid)
returns table(user_id uuid,email text,role text,status text)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_platform_admin();
  return query select s.user_id,u.email::text,s.role,s.status from public.club_staff s
    join auth.users u on u.id=s.user_id where s.club_id=p_club_id order by u.email;
end;
$$;
create function public.platform_club_staff(p_club_id uuid)
returns table(user_id uuid,email text,role text,status text)
language sql stable security invoker set search_path = '' as $$ select * from private.platform_club_staff(p_club_id); $$;

revoke all on function private.require_platform_admin(),private.admin_audit_context(text) from public,anon,authenticated,service_role;
revoke all on function private.platform_save_club(uuid,text,text,text,text,text,text,timestamptz,text),public.platform_save_club(uuid,text,text,text,text,text,text,timestamptz,text),private.platform_set_staff(uuid,text,text,text,text,text,text),public.platform_set_staff(uuid,text,text,text,text,text,text),private.platform_club_staff(uuid),public.platform_club_staff(uuid) from public,anon,authenticated,service_role;
grant execute on function private.platform_save_club(uuid,text,text,text,text,text,text,timestamptz,text),public.platform_save_club(uuid,text,text,text,text,text,text,timestamptz,text),private.platform_set_staff(uuid,text,text,text,text,text,text),public.platform_set_staff(uuid,text,text,text,text,text,text),private.platform_club_staff(uuid),public.platform_club_staff(uuid) to authenticated;
commit;
