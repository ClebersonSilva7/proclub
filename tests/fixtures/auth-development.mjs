// Generate only synthetic fixtures. Run generated SQL manually as an audited
// operator on the confirmed development project. Never run against production.
import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
const password = randomBytes(24).toString('base64url');
const id = n => `88888888-0000-4000-8000-${String(n).padStart(12,'0')}`;
const blue=id(101), red=id(102);
let sql="begin; set local proclub.operator='stage3-synthetic-test'; set local proclub.reason='temporary authentication integration fixture';\n";
for(const [index,label] of ['manager','red-manager','fan','admin','staff'].entries()) {
 const uid=id(index+1), email=`${label}-stage3@proclub.example`;
 sql+=`insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,recovery_token,email_change_token_new,email_change) values ('00000000-0000-0000-0000-000000000000','${uid}','authenticated','authenticated','${email}',extensions.crypt('${password}',extensions.gen_salt('bf')),now(),'${JSON.stringify({provider:'email',providers:['email']})}','{}',now(),now(),'','','','');\n`;
 sql+=`insert into auth.identities(provider_id,user_id,identity_data,provider,created_at,updated_at) values ('${uid}','${uid}','${JSON.stringify({sub:uid,email,email_verified:true})}','email',now(),now());\ninsert into public.profiles(id) values ('${uid}');\n`;
}
sql+=`insert into public.clubs(id,name,slug,city,state,status) values ('${blue}','Azul sintético','azul-stage3','Campinas','SP','active'),('${red}','Vermelho sintético','vermelho-stage3','Recife','PE','active');\ninsert into public.club_staff(club_id,user_id,role) values ('${blue}','${id(1)}','manager'),('${red}','${id(2)}','manager'),('${blue}','${id(5)}','staff');\ninsert into public.platform_admins(user_id) values ('${id(4)}');\ncommit;\n`;
await mkdir('supabase/.temp',{recursive:true});
await writeFile('supabase/.temp/auth-e2e-fixture.sql',sql,{mode:0o600});
await writeFile('.env.e2e.local',`E2E_PASSWORD=${password}\nE2E_FAN_EMAIL=fan-stage3@proclub.example\nE2E_MANAGER_EMAIL=manager-stage3@proclub.example\nE2E_ADMIN_EMAIL=admin-stage3@proclub.example\nE2E_STAFF_EMAIL=staff-stage3@proclub.example\n`,{mode:0o600});
console.log('Synthetic SQL: supabase/.temp/auth-e2e-fixture.sql; credentials: .env.e2e.local (both ignored). Apply manually to development only.');
