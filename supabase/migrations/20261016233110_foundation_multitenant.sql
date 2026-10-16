begin;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated, service_role;
grant usage on schema private to authenticated;

create table public.clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 2 and 120),
  slug text not null unique check (length(slug) between 2 and 80 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  primary_sport text not null default 'volleyball' check (length(btrim(primary_sport)) between 2 and 60),
  city text not null check (length(btrim(city)) between 2 and 120),
  state text not null check (state in ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO')),
  status text not null default 'draft' check (status in ('draft','active','suspended','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.club_settings (
  club_id uuid primary key references public.clubs(id) on delete cascade,
  primary_color text not null default '#21543c' check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  secondary_color text not null default '#ffffff' check (secondary_color ~ '^#[0-9A-Fa-f]{6}$'),
  logo_path text check (length(logo_path) <= 500 and logo_path like club_id::text || '/%' and logo_path !~ '(^|/)\.\.(/|$)'),
  cover_path text check (length(cover_path) <= 500 and cover_path like club_id::text || '/%' and cover_path !~ '(^|/)\.\.(/|$)'),
  description text not null default '' check (length(description) <= 5000),
  public_email text check (length(public_email) <= 254 and public_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  public_phone text check (length(public_phone) <= 30),
  website_url text check (length(website_url) <= 2048 and website_url ~ '^https://[^[:space:]]+$'),
  instagram_url text check (length(instagram_url) <= 2048 and instagram_url ~ '^https://[^[:space:]]+$'),
  facebook_url text check (length(facebook_url) <= 2048 and facebook_url ~ '^https://[^[:space:]]+$'),
  updated_at timestamptz not null default now()
);
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (length(display_name) <= 120),
  avatar_path text check (length(avatar_path) <= 500 and avatar_path like id::text || '/%' and avatar_path !~ '(^|/)\.\.(/|$)'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.club_staff (
  club_id uuid not null references public.clubs(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete restrict,
  role text not null check (role in ('owner','manager','staff')),
  status text not null default 'active' check (status in ('active','revoked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (club_id, user_id)
);
create table public.club_fans (
  club_id uuid not null references public.clubs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  fan_id uuid not null unique default gen_random_uuid(),
  status text not null default 'active' check (status in ('active','left')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (club_id,user_id)
);
create table public.platform_admins (
  user_id uuid primary key references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);
-- Immutable history for API roles; database operators remain trusted.
create table private.permission_audit (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  database_actor text not null,
  operator text not null,
  reason text not null,
  entity text not null,
  operation text not null,
  old_data jsonb,
  new_data jsonb
);
alter table private.permission_audit enable row level security;
revoke all on private.permission_audit from public, anon, authenticated, service_role;

create index club_staff_user_idx on public.club_staff(user_id,club_id) where status = 'active';
create index club_fans_user_idx on public.club_fans(user_id,club_id);
create index clubs_status_idx on public.clubs(status);

create function private.is_platform_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.platform_admins where user_id = (select auth.uid())
  );
$$;
create function private.can_manage_club(target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null and (
    private.is_platform_admin() or exists (
      select 1 from public.club_staff s join public.clubs c on c.id = s.club_id
      where s.club_id = target and s.user_id = (select auth.uid())
        and s.status = 'active' and s.role in ('owner','manager') and c.status = 'active'
    )
  );
$$;
create function private.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end;
$$;
create function private.audit_permission_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  operator_name text := nullif(btrim(current_setting('proclub.operator',true)), '');
  change_reason text := nullif(btrim(current_setting('proclub.reason',true)), '');
begin
  if operator_name is null or change_reason is null then
    raise exception 'Permission changes require proclub.operator and proclub.reason' using errcode = '23514';
  end if;
  insert into private.permission_audit(database_actor,operator,reason,entity,operation,old_data,new_data)
    values(session_user,operator_name,change_reason,tg_table_name,tg_op,
      case when tg_op <> 'INSERT' then to_jsonb(old) end,
      case when tg_op <> 'DELETE' then to_jsonb(new) end);
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
-- No user metadata is copied or interpreted. Profiles can be created on first login.
create function private.initialize_club_settings() returns trigger
language plpgsql security definer set search_path = '' as $$
begin insert into public.club_settings(club_id) values(new.id); return new; end;
$$;
create trigger initialize_settings after insert on public.clubs
  for each row execute function private.initialize_club_settings();

-- Revoke PostgreSQL's default PUBLIC execute, including trigger functions.
revoke all on all functions in schema private from public, anon, authenticated, service_role;
grant execute on function private.is_platform_admin(), private.can_manage_club(uuid) to authenticated;

create trigger audit_staff after insert or update or delete on public.club_staff
  for each row execute function private.audit_permission_change();
create trigger audit_admins after insert or update or delete on public.platform_admins
  for each row execute function private.audit_permission_change();
create trigger touch_clubs before update on public.clubs for each row execute function private.touch_updated_at();
create trigger touch_club_settings before update on public.club_settings for each row execute function private.touch_updated_at();
create trigger touch_profiles before update on public.profiles for each row execute function private.touch_updated_at();
create trigger touch_club_staff before update on public.club_staff for each row execute function private.touch_updated_at();
create trigger touch_club_fans before update on public.club_fans for each row execute function private.touch_updated_at();
alter table public.clubs enable row level security;
revoke all on public.clubs from public, anon, authenticated, service_role;
alter table public.club_settings enable row level security;
revoke all on public.club_settings from public, anon, authenticated, service_role;
alter table public.profiles enable row level security;
revoke all on public.profiles from public, anon, authenticated, service_role;
alter table public.club_staff enable row level security;
revoke all on public.club_staff from public, anon, authenticated, service_role;
alter table public.club_fans enable row level security;
revoke all on public.club_fans from public, anon, authenticated, service_role;
alter table public.platform_admins enable row level security;
revoke all on public.platform_admins from public, anon, authenticated, service_role;

grant usage on schema public to anon, authenticated, service_role;
grant select on public.clubs, public.club_settings to anon, authenticated;
grant select on public.profiles, public.club_staff, public.club_fans, public.platform_admins to authenticated;
grant insert (id,display_name,avatar_path) on public.profiles to authenticated;
grant update (display_name,avatar_path) on public.profiles to authenticated;
grant update (name,primary_sport,city,state) on public.clubs to authenticated;
grant update (primary_color,secondary_color,logo_path,cover_path,description,public_email,public_phone,website_url,instagram_url,facebook_url) on public.club_settings to authenticated;
grant insert (club_id,user_id) on public.club_fans to authenticated;
grant update (status) on public.club_fans to authenticated;
-- Service credentials are server-only; permission tables are SQL-operator-only.
grant all on public.clubs, public.club_settings, public.profiles, public.club_fans to service_role;
grant select on public.club_staff, public.platform_admins to service_role;

create policy clubs_public on public.clubs for select to anon, authenticated using (status = 'active');
create policy clubs_management_read on public.clubs for select to authenticated using (private.can_manage_club(id));
create policy clubs_management_update on public.clubs for update to authenticated
  using (private.can_manage_club(id)) with check (private.can_manage_club(id));
create policy settings_public on public.club_settings for select to anon, authenticated
  using (exists (select 1 from public.clubs c where c.id = club_id and c.status = 'active'));
create policy settings_management_read on public.club_settings for select to authenticated using (private.can_manage_club(club_id));
create policy settings_management_update on public.club_settings for update to authenticated
  using (private.can_manage_club(club_id)) with check (private.can_manage_club(club_id));
create policy profiles_self_read on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy profiles_self_insert on public.profiles for insert to authenticated with check (id = (select auth.uid()));
create policy profiles_self_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy staff_read on public.club_staff for select to authenticated
  using (user_id = (select auth.uid()) or private.can_manage_club(club_id));
create policy fans_read on public.club_fans for select to authenticated
  using (user_id = (select auth.uid()) or private.can_manage_club(club_id));
create policy fans_self_insert on public.club_fans for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (
    select 1 from public.clubs c where c.id = club_id and c.status = 'active'
  ));
create policy fans_self_update on public.club_fans for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy admins_self_read on public.platform_admins for select to authenticated using (user_id = (select auth.uid()));
commit;
