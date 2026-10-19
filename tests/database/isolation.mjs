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
  await exec(`set storage.operation='object.get_authenticated'`);
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
  create schema storage;
  create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
  create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text,unique(bucket_id,name));
  alter table storage.objects enable row level security;
  create function storage.allow_any_operation(expected text[]) returns boolean language sql stable as
    $$ select current_setting('storage.operation',true)=any(expected) $$;
  grant usage on schema storage to anon,authenticated,service_role;
  grant select,insert,update,delete on storage.objects to authenticated;
  grant select on storage.objects to anon;
  create schema auth;
  create table auth.users (id uuid primary key, email text unique, email_confirmed_at timestamptz default now(), is_anonymous boolean not null default false, deleted_at timestamptz, banned_until timestamptz);
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
  update auth.users set email=id::text || '@synthetic.test';
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
      assert.ok(functions.length >= 5);
      for (const f of functions) { assert.ok(f.proconfig.includes('search_path=""')); assert.ok(!/(^|,)=X/.test(f.acl)); }
    });

    await t.test('club identity is atomic, versioned and isolated from other clubs', async () => {
      await as('authenticated',manager);
      const version=(await rows(`select c.updated_at::text as c,s.updated_at::text as s from public.clubs c join public.club_settings s on s.club_id=c.id where c.id='${blue}'`))[0];
      const values=JSON.stringify({name:'Clube Azul',primary_sport:'volleyball',city:'Campinas',state:'SP',description:'Identity test',primary_color:'#123456',secondary_color:'#ffffff',public_email:'',public_phone:'',website_url:'https://example.test',instagram_url:'',facebook_url:''});
      await exec(`select public.club_save_identity('${blue}','${version.c}','${version.s}','${values}')`);
      assert.equal((await rows(`select description from public.club_settings where club_id='${blue}'`))[0].description,'Identity test');
      await denied(`select public.club_save_identity('${blue}','${version.c}','${version.s}','${values}')`,['PT409']);
      await denied(`select public.club_save_identity('${red}',now(),now(),'${values}')`);
      const latest=(await rows(`select c.updated_at::text as c,s.updated_at::text as s from public.clubs c join public.club_settings s on s.club_id=c.id where c.id='${blue}'`))[0];
      const invalid=values.replace('Identity test','Should rollback').replace('#123456','invalid');
      await denied(`select public.club_save_identity('${blue}','${latest.c}','${latest.s}','${invalid}')`,['23514']);
      assert.equal((await rows(`select description from public.club_settings where club_id='${blue}'`))[0].description,'Identity test');
    });
    await t.test('private asset policies isolate uploads and deny overwrite, movement and common users', async () => {
      const asset=`${blue}/logo/${u(501)}.png`, other=`${red}/logo/${u(502)}.png`;
      await as('authenticated',manager);
      await exec(`insert into storage.objects(bucket_id,name) values ('club-assets','${asset}')`);
      await denied(`insert into storage.objects(bucket_id,name) values ('club-assets','${other}')`);
      for(const path of [`${blue}/../escape.png`,`${blue}/logo/file.svg`,'invalid/logo/file.png']) await denied(`insert into storage.objects(bucket_id,name) values ('club-assets','${path}')`);
      assert.equal((await rows(`update storage.objects set name='${other}' where name='${asset}' returning id`)).length,0);
      assert.equal((await rows(`delete from storage.objects where name='${asset}' returning id`)).length,0);
      for(const who of [fan,staff,revoked,redManager]) {await as('authenticated',who);assert.equal(await count('storage.objects'),0);await denied(`select public.club_save_identity('${blue}',now(),now(),'{}')`);await denied(`select public.club_set_image('${blue}','logo',null,now())`);await denied(`insert into storage.objects(bucket_id,name) values ('club-assets','${blue}/cover/${u(503)}.png')`);}
      await as('anon');assert.equal(await count('storage.objects'),0);
    });
    await t.test('image reference requires existing object of same club and kind', async () => {
      await as('authenticated',manager);
      const version=async()=>(await rows(`select updated_at::text as v from public.club_settings where club_id='${blue}'`))[0].v;
      const asset=`${blue}/logo/${u(501)}.png`;
      await exec(`select public.club_set_image('${blue}','logo','${asset}','${await version()}')`);
      await denied(`select public.club_set_image('${blue}','cover','${asset}','${await version()}')`,['23514']);
      await denied(`select public.club_set_image('${blue}','logo','${blue}/logo/${u(599)}.png','${await version()}')`,['23514']);
      await exec(`select public.club_set_image('${blue}','logo',null,'${await version()}')`);
      assert.equal((await rows(`select logo_path from public.club_settings where club_id='${blue}'`))[0].logo_path,null);
    });
    await t.test('public assets expose only current referenced images of active clubs', async () => {
      const current=`${blue}/logo/${u(701)}.png`, old=`${blue}/logo/${u(702)}.png`, replacement=`${blue}/logo/${u(703)}.png`;
      await as('authenticated',manager);
      for(const name of [current,old,replacement]) await exec(`insert into storage.objects(bucket_id,name) values ('club-assets','${name}')`);
      const version=async()=>(await rows(`select updated_at::text as v from public.club_settings where club_id='${blue}'`))[0].v;
      await exec(`select public.club_set_image('${blue}','logo','${current}','${await version()}')`);
      await as('anon');assert.equal(await count('storage.objects'),1);
      await exec(`set storage.operation='object.sign'`);assert.equal(await count('storage.objects'),0);
      await exec(`set storage.operation='object.list'`);assert.equal(await count('storage.objects'),0);
      await exec(`set storage.operation='object.get_authenticated'`);assert.equal(await count('storage.objects',`name='${current}'`),1);assert.equal(await count('storage.objects',`name='${old}'`),0);
      await denied(`insert into storage.objects(bucket_id,name) values ('club-assets','${blue}/logo/${u(704)}.png')`);
      await as('authenticated',redManager);assert.equal(await count('storage.objects',`name='${current}'`),1);assert.equal(await count('storage.objects',`name='${old}'`),0);
      assert.equal((await rows(`update storage.objects set name='tampered' where name='${current}' returning id`)).length,0);
      await as('authenticated',manager);await exec(`select public.club_set_image('${blue}','logo','${replacement}','${await version()}')`);
      await as('anon');assert.equal(await count('storage.objects',`name='${current}'`),0);assert.equal(await count('storage.objects',`name='${replacement}'`),1);
      await as('postgres');await exec(`update public.clubs set status='suspended' where id='${blue}'`);
      await as('anon');assert.equal(await count('storage.objects'),0);assert.equal(await count('public.clubs',`id='${blue}'`),0);
      await as('postgres');await exec(`update public.clubs set status='active' where id='${blue}'`);
      await as('anon');assert.equal(await count('storage.objects',`name='${replacement}'`),1);
      await as('authenticated',manager);await exec(`select public.club_set_image('${blue}','logo',null,'${await version()}')`);
      await as('anon');assert.equal(await count('storage.objects'),0);
    });
    const createClubSQL = (slug='admin-club', reason='synthetic administrative test') => `select public.platform_save_club(null,'Clube administrativo','${slug}','volleyball','Campinas','SP','draft',null,'${reason}') as id`;
    let newClub;
    await t.test('nonadmins cannot invoke privileged RPCs, including direct private entry points', async () => {
      for (const who of [fan,manager,staff,owner,revoked]) {
        await as('authenticated',who);
        await denied(createClubSQL());
        await denied(`select public.platform_set_staff('${blue}','${fan}@synthetic.test','owner','active','synthetic escalation',null,null)`);
        await denied(`select * from public.platform_club_staff('${red}')`);
        await denied(`select private.require_platform_admin()`);
      }
      await as('anon'); await denied(createClubSQL());
      await as('service_role'); await denied(createClubSQL());
    });
    await t.test('global admin creates a draft atomically with settings and verified-actor audit', async () => {
      await as('authenticated',admin);
      await exec(`set proclub.operator='forged-browser-actor'`);
      newClub=(await rows(createClubSQL()))[0].id;
      assert.equal(await count('public.club_settings',`club_id='${newClub}'`),1);
      await denied(createClubSQL(),['23505']);
      await denied(createClubSQL('another-admin-club','short'),['23514']);
      await as('postgres');
      const record=(await rows(`select operator,new_data->>'status' as status from private.permission_audit where entity='clubs' and new_data->>'id'='${newClub}'`))[0];
      assert.equal(record.operator,admin);assert.equal(record.status,'draft');
    });
    const saveClub = async (status, expected) => {
      const version=expected ?? (await rows(`select updated_at::text as v from public.clubs where id='${newClub}'`))[0].v;
      return exec(`select public.platform_save_club('${newClub}','Clube administrativo','admin-club','volleyball','Campinas','SP','${status}','${version}','synthetic state transition')`);
    };
    await t.test('club activation requires owner; assignment uses existing confirmed account only', async () => {
      await as('authenticated',admin);
      await assert.rejects(saveClub('active'),e=>e.code==='23514');
      await denied(`select public.platform_set_staff('${newClub}','missing@synthetic.test','owner','active','synthetic administrative test',null,null)`,['P0002']);
      await exec(`select public.platform_set_staff('${newClub}','${fan}@synthetic.test','owner','active','synthetic administrative test',null,null)`);
      await saveClub('active');
      await denied(`select public.platform_set_staff('${newClub}','${fan}@synthetic.test','owner','revoked','synthetic administrative test','owner','active')`,['23514']);
      await denied(`select public.platform_set_staff('${newClub}','${fan}@synthetic.test','manager','active','synthetic administrative test','owner','active')`,['23514']);
      await exec(`select public.platform_set_staff('${newClub}','${manager}@synthetic.test','owner','active','synthetic administrative test',null,null)`);
      await exec(`select public.platform_set_staff('${newClub}','${fan}@synthetic.test','owner','revoked','synthetic administrative test','owner','active')`);
      assert.equal((await rows(`select * from public.platform_club_staff('${newClub}')`)).length,2);
    });
    await t.test('concurrent stale forms cannot overwrite club or staff decisions', async () => {
      await as('authenticated',admin);
      await assert.rejects(saveClub('suspended','2000-01-01T00:00:00Z'),e=>e.code==='PT409');
      await denied(`select public.platform_set_staff('${newClub}','${fan}@synthetic.test','manager','active','synthetic stale staff form','owner','active')`,['PT409']);
      const v=(await rows(`select updated_at::text as v from public.clubs where id='${newClub}'`))[0].v;
      await denied(`select public.platform_save_club('${newClub}','Clube administrativo','changed-slug','volleyball','Campinas','SP','active','${v}','synthetic invalid slug edit')`,['23514']);
    });
    await t.test('suspension is reversible and archive is terminal and read-only', async () => {
      await as('authenticated',admin); await saveClub('suspended'); await saveClub('active'); await saveClub('archived');
      await assert.rejects(saveClub('active'),e=>e.code==='23514');
      await assert.rejects(saveClub('archived'),e=>e.code==='23514');
      await denied(`update public.club_settings set description='archived bypass' where club_id='${newClub}'`);
      await denied(`insert into storage.objects(bucket_id,name) values ('club-assets','${newClub}/logo/${u(600)}.png')`);
      await denied(`update public.clubs set name='Bypass archived RPC' where id='${newClub}'`,['23514']);
      await denied(`select public.platform_set_staff('${newClub}','${fan}@synthetic.test','manager','active','synthetic archived club change','owner','revoked')`,['23514']);
    });
  } finally { if (url) await engine.end(); else await engine.close(); }
});
