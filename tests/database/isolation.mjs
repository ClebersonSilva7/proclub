import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';

// Only a disposable database named proclub_test may use the native runner.
// Bootstrap simulates only the Supabase identity boundary; RLS is real PostgreSQL.
const url = process.env.PROCLUB_TEST_DATABASE_URL;
if (url && new URL(url).pathname !== '/proclub_test') throw new Error('Use disposable proclub_test database');
const engine = url ? new pg.Client({ connectionString: url }) : new PGlite();
if (url) await engine.connect();
const exec = async (sql) => url ? engine.query(sql) : engine.exec(sql);
const query = async (sql, params) => engine.query(sql, params);
const rows = async (sql) => (await query(sql)).rows;
const count = async (table, where = 'true') => Number((await rows(`select count(*) as n from ${table} where ${where}`))[0].n);
const u = (n) => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const blue = u(101), red = u(102), draft = u(103);
const manager = u(1), redManager = u(2), fan = u(3), redFan = u(4), staff = u(5), owner = u(6), admin = u(7), revoked = u(8), multi = u(9);
const as = async (role, id = '') => {
  await exec('reset role');
  await query(`select set_config('request.jwt.claim.sub', $1, false)`, [id]);
  await exec(`set role ${role}`);
};
const denied = async (sql, codes = ['42501']) => {
  await assert.rejects(exec(sql), e => codes.includes(e.code), sql);
};

await exec(`
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
  grant usage on schema auth to anon,authenticated,service_role;
  grant execute on function auth.uid() to anon,authenticated,service_role;
`);
for (const file of (await readdir(new URL('../../supabase/migrations/', import.meta.url))).sort()) {
  if (file.endsWith('.sql')) await exec(await readFile(new URL(`../../supabase/migrations/${file}`, import.meta.url), 'utf8'));
}
await exec(`
  set proclub.operator = 'synthetic-test-fixture';
  set proclub.reason = 'two-club isolation tests';
  insert into auth.users(id) values ${Array.from({length:9},(_,i)=>`('${u(i+1)}')`).join(',')};
  insert into public.profiles(id,display_name) select id,'Synthetic' from auth.users;
  insert into public.clubs(id,name,slug,city,state,status) values
    ('${blue}','Clube Azul','clube-azul','Campinas','SP','active'),
    ('${red}','Clube Vermelho','clube-vermelho','Recife','PE','active'),
    ('${draft}','Clube Rascunho','clube-rascunho','Recife','PE','draft');
  insert into public.club_staff(club_id,user_id,role,status) values
    ('${blue}','${manager}','manager','active'), ('${red}','${redManager}','manager','active'),
    ('${blue}','${staff}','staff','active'), ('${blue}','${owner}','owner','active'),
    ('${blue}','${revoked}','manager','revoked'),
    ('${blue}','${multi}','manager','active'), ('${red}','${multi}','owner','active');
  insert into public.club_fans(club_id,user_id) values ('${blue}','${fan}'), ('${red}','${redFan}');
  insert into public.platform_admins(user_id) values ('${admin}');
`);

test('database authorization and isolation', async (t) => {
  try {
    await t.test('every application table enables RLS', async () => {
      assert.equal((await rows(`select count(*)::int as n from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and c.relrowsecurity`))[0].n,6);
    });
    await t.test('anonymous reads only active public club data', async () => {
      await as('anon'); assert.equal(await count('public.clubs'),2); assert.equal(await count('public.club_settings'),2);
      for (const table of ['profiles','club_staff','club_fans','platform_admins']) await denied(`select * from public.${table}`);
      await denied(`update public.club_settings set description='attack'`);
      await denied(`select private.can_manage_club('${blue}')`);
    });
    for (const [who,own,other] of [[manager,blue,red],[redManager,red,blue]]) {
      await t.test(`manager ${who} cannot read or mutate private data across clubs`, async () => {
        await as('authenticated',who);
        assert.equal(await count('public.club_fans',`club_id='${own}'`),1);
        assert.equal(await count('public.club_fans',`club_id='${other}'`),0);
        assert.equal(await count('public.club_staff',`club_id='${other}'`),0);
        assert.equal(await count('public.profiles'),1);
        assert.equal((await rows(`update public.club_settings set description='allowed' where club_id='${own}' returning club_id`)).length,1);
        assert.equal((await rows(`update public.club_settings set description='attack' where club_id='${other}' returning club_id`)).length,0);
        assert.equal((await rows(`update public.clubs set city='Cidade teste' where id='${other}' returning id`)).length,0);
        assert.equal((await rows(`update public.club_fans set status='left' where club_id='${other}' returning user_id`)).length,0);
        await denied(`delete from public.club_fans where club_id='${other}'`);
        await denied(`insert into public.club_fans(club_id,user_id) values ('${other}','${who}') on conflict (club_id,user_id) do update set user_id='${redFan}'`);
        await denied(`update public.club_settings set club_id='${other}' where club_id='${own}'`);
        await denied(`update public.clubs set status='active',slug='hijack' where id='${other}'`);
      });
    }
    for (const who of [fan,manager,staff,owner,admin]) {
      await t.test(`identity ${who} cannot assign permissions, even with forged metadata`, async () => {
        await as('authenticated',who);
        await exec(`set request.jwt.claims = '{"user_metadata":{"role":"owner","club_id":"${red}","platform_admin":true}}'`);
        for (const sql of [
          `insert into public.club_staff(club_id,user_id,role) values ('${red}','${who}','owner')`,
          `update public.club_staff set role='owner' where user_id='${who}'`,
          `delete from public.club_staff where user_id='${who}'`,
          `insert into public.platform_admins(user_id) values ('${who}')`,
          `update public.platform_admins set user_id='${who}'`,
          `delete from public.platform_admins`,
          `truncate public.platform_admins`,
          `select * from private.permission_audit`,
          `select private.audit_permission_change()`
        ]) await denied(sql);
      });
    }
    await t.test('fan self-service does not permit impersonation or moving links', async () => {
      await as('authenticated',fan);
      assert.equal(await count('public.club_fans'),1);
      assert.equal(await count('public.club_staff'),0);
      assert.equal(await count('public.platform_admins'),0);
      await denied(`insert into public.club_fans(club_id,user_id) values ('${red}','${manager}')`);
      await denied(`insert into public.club_fans(club_id,user_id) values ('${draft}','${fan}')`);
      await denied(`update public.club_fans set user_id='${manager}'`);
      await denied(`update public.club_fans set club_id='${red}'`);
      await denied(`insert into public.club_fans(club_id,user_id,fan_id) values ('${red}','${fan}','${u(300)}')`);
      await exec(`insert into public.club_fans(club_id,user_id) values ('${red}','${fan}')`);
      await denied(`insert into public.club_fans(club_id,user_id) values ('${red}','${fan}')`,['23505']);
      assert.equal((await rows(`update public.club_fans set status='left' where club_id='${blue}' returning user_id`)).length,1);
    });
    await t.test('profiles are private even for platform administrators', async () => {
      await as('authenticated',admin); assert.equal(await count('public.profiles'),1);
      assert.equal((await rows(`update public.profiles set display_name='attack' where id='${fan}' returning id`)).length,0);
      await denied(`insert into public.profiles(id) values ('${u(80)}')`);
      await denied(`update public.profiles set id='${fan}'`);
      await exec(`update public.profiles set display_name='Allowed' where id='${admin}'`);
    });
    for (const who of [staff,revoked]) {
      await t.test(`staff or revoked manager ${who} has no management access`, async () => {
        await as('authenticated',who); assert.equal(await count('public.club_fans'),0);
        assert.equal((await rows(`update public.club_settings set description='attack' where club_id='${blue}' returning club_id`)).length,0);
      });
    }
    await t.test('one identity can manage two clubs', async () => {
      await as('authenticated',multi); assert.equal(await count('public.club_fans'),3);
      assert.equal((await rows(`update public.club_settings set description='Multi' returning club_id`)).length,2);
    });
    await t.test('suspended clubs immediately remove staff powers; admin can inspect drafts', async () => {
      await as('postgres'); await exec(`update public.clubs set status='suspended' where id='${blue}'`);
      await as('authenticated',manager); assert.equal(await count('public.club_fans'),0);
      assert.equal((await rows(`update public.club_settings set description='attack' where club_id='${blue}' returning club_id`)).length,0);
      await as('authenticated',admin); assert.equal(await count('public.clubs'),3);
      await as('postgres'); await exec(`update public.clubs set status='active' where id='${blue}'`);
    });
    await t.test('constraints validate state, slug, role, colors, paths and foreign keys', async () => {
      await as('postgres');
      for (const sql of [
        `update public.clubs set slug='Clube Azul' where id='${blue}'`,
        `update public.clubs set state='XX' where id='${blue}'`,
        `update public.clubs set status='unknown' where id='${blue}'`,
        `update public.club_staff set role='superadmin' where user_id='${manager}'`,
        `update public.club_settings set primary_color='red' where club_id='${blue}'`,
        `update public.club_settings set logo_path='${red}/logo.png' where club_id='${blue}'`,
        `update public.club_settings set website_url='javascript:attack' where club_id='${blue}'`
      ]) await denied(sql,['23514']);
      await denied(`update public.clubs set slug='clube-vermelho' where id='${blue}'`,['23505']);
      await denied(`insert into public.club_fans(club_id,user_id) values ('${u(800)}','${fan}')`,['23503','23001']);
      await denied(`delete from auth.users where id='${manager}'`,['23503','23001']);
      await denied(`delete from public.clubs where id='${blue}'`,['23503','23001']);
    });
    await t.test('privileged grants and revocations require audit context and produce history', async () => {
      await as('postgres'); await exec(`set proclub.operator=''; set proclub.reason=''`);
      await denied(`insert into public.platform_admins(user_id) values ('${fan}')`,['23514']);
      await denied(`delete from public.platform_admins where user_id='${admin}'`,['23514']);
      await exec(`set proclub.operator='test-operator'; set proclub.reason='audit-test'`);
      const before = await count('private.permission_audit');
      await exec(`insert into public.platform_admins(user_id) values ('${fan}')`);
      await as('authenticated',fan); assert.equal(await count('public.clubs'),3);
      assert.equal(await count('public.club_staff',`club_id='${red}'`),2);
      await as('postgres'); await exec(`delete from public.platform_admins where user_id='${fan}'`);
      assert.equal(await count('private.permission_audit'),before+2);
      assert.deepEqual((await rows(`select operation from private.permission_audit where reason='audit-test' order by operation`)).map(r=>r.operation),['DELETE','INSERT']);
      await as('authenticated',fan); assert.equal(await count('public.club_staff'),0);
    });
    await t.test('service role cannot write privilege tables or audit log', async () => {
      await as('service_role');
      for (const sql of [`insert into public.platform_admins(user_id) values ('${fan}')`,`delete from public.platform_admins`,`update public.club_staff set role='owner'`,`truncate public.club_staff`,`select * from private.permission_audit`]) await denied(sql);
    });
    await t.test('privileged functions have fixed search_path and no PUBLIC execute', async () => {
      await as('postgres');
      const functions = await rows(`select p.proname,p.proconfig,coalesce(array_to_string(p.proacl,','),'') as acl from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private'`);
      assert.equal(functions.length,5);
      for (const f of functions) { assert.ok(f.proconfig.includes('search_path=""')); assert.ok(!/(^|,)=X/.test(f.acl)); }
    });
  } finally { if (url) await engine.end(); else await engine.close(); }
});
