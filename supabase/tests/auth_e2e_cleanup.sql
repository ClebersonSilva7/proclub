-- Development only: remove exactly the synthetic Etapa03 fixtures.
-- Permission audit history is deliberately preserved.
begin;
set local proclub.operator = 'stage3-synthetic-test';
set local proclub.reason = 'remove temporary authentication integration fixture';
delete from auth.sessions where user_id in (
 '88888888-0000-4000-8000-000000000001','88888888-0000-4000-8000-000000000002','88888888-0000-4000-8000-000000000003','88888888-0000-4000-8000-000000000004','88888888-0000-4000-8000-000000000005');
delete from public.club_staff where club_id in ('88888888-0000-4000-8000-000000000101','88888888-0000-4000-8000-000000000102');
delete from public.platform_admins where user_id = '88888888-0000-4000-8000-000000000004';
delete from public.clubs where id in ('88888888-0000-4000-8000-000000000101','88888888-0000-4000-8000-000000000102');
delete from auth.users where id in (
 '88888888-0000-4000-8000-000000000001','88888888-0000-4000-8000-000000000002','88888888-0000-4000-8000-000000000003','88888888-0000-4000-8000-000000000004','88888888-0000-4000-8000-000000000005');
commit;
