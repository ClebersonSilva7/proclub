-- Supabase development only. Run as SQL operator; all fixtures are rolled back.
begin;
set local proclub.operator = 'synthetic-smoke-test';
set local proclub.reason = 'validate real Supabase RLS with rollback';
insert into auth.users(id) values
 ('77777777-0000-4000-8000-000000000001'),('77777777-0000-4000-8000-000000000002'),
 ('77777777-0000-4000-8000-000000000003'),('77777777-0000-4000-8000-000000000004');
insert into public.profiles(id,display_name) select id,'Synthetic smoke' from auth.users
 where id::text like '77777777-%';
insert into public.clubs(id,name,slug,city,state,status) values
 ('77777777-0000-4000-8000-000000000101','Azul sintético','smoke-azul','Campinas','SP','active'),
 ('77777777-0000-4000-8000-000000000102','Vermelho sintético','smoke-vermelho','Recife','PE','active');
insert into public.club_staff(club_id,user_id,role) values
 ('77777777-0000-4000-8000-000000000101','77777777-0000-4000-8000-000000000001','manager'),
 ('77777777-0000-4000-8000-000000000102','77777777-0000-4000-8000-000000000002','manager');
insert into public.club_fans(club_id,user_id) values
 ('77777777-0000-4000-8000-000000000101','77777777-0000-4000-8000-000000000003'),
 ('77777777-0000-4000-8000-000000000102','77777777-0000-4000-8000-000000000004');
set local role authenticated;
set local request.jwt.claim.sub = '77777777-0000-4000-8000-000000000001';
do $$ declare affected integer; begin
  assert (select count(*) from public.club_fans) = 1, 'Azul must see only its fan';
  assert (select count(*) from public.club_staff) = 1, 'Azul must see only its staff';
  assert (select count(*) from public.profiles) = 1, 'Profiles must remain private';
  update public.club_settings set description='Allowed' where club_id='77777777-0000-4000-8000-000000000101';
  get diagnostics affected = row_count; assert affected = 1, 'Own update must work';
  update public.club_settings set description='Attack' where club_id='77777777-0000-4000-8000-000000000102';
  get diagnostics affected = row_count; assert affected = 0, 'Cross club update must fail';
end $$;
set local request.jwt.claim.sub = '77777777-0000-4000-8000-000000000002';
do $$ declare affected integer; begin
  assert (select count(*) from public.club_fans) = 1, 'Vermelho must see only its fan';
  update public.club_settings set description='Attack' where club_id='77777777-0000-4000-8000-000000000101';
  get diagnostics affected = row_count; assert affected = 0, 'Reverse isolation must hold';
end $$;
set local request.jwt.claim.sub = '77777777-0000-4000-8000-000000000003';
set local request.jwt.claims = '{"sub":"77777777-0000-4000-8000-000000000003","user_metadata":{"role":"owner","platform_admin":true}}';
do $$ begin
  assert (select count(*) from public.club_staff) = 0, 'Metadata cannot authorize';
  begin
    insert into public.club_staff(club_id,user_id,role) values
      ('77777777-0000-4000-8000-000000000101','77777777-0000-4000-8000-000000000003','owner');
    raise exception 'Unexpected staff privilege escalation';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.platform_admins(user_id) values ('77777777-0000-4000-8000-000000000003');
    raise exception 'Unexpected global privilege escalation';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'passed: Supabase development isolation and escalation smoke test; fixtures rolled back' as result;
rollback;
