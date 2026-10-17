// Opt-in protocol fixture for this development project ONLY. No email is sent.
// Internal Auth schema: isolated synthetic account, short-lived single-use codes.
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
const user='88888888-0000-4000-8000-000000000003';
const flows=Object.fromEntries(['desktop','mobile'].map(view=>{
 const verifier=randomBytes(48).toString('base64url');
 return [view,{id:randomUUID(),code:randomUUID(),verifier,challenge:createHash('sha256').update(verifier).digest('base64url')}];
}));
await mkdir('supabase/.temp',{recursive:true});
const sql=`do $$ begin if not exists (select 1 from auth.users where id='${user}' and email='fan-stage3@proclub.example') then raise exception 'Synthetic fixture missing'; end if; end $$;\n`+
'insert into auth.flow_state(id,user_id,auth_code,code_challenge_method,code_challenge,provider_type,provider_access_token,provider_refresh_token,authentication_method,created_at,updated_at,auth_code_issued_at) values\n'+
Object.values(flows).map(f=>`('${f.id}','${user}','${f.code}','s256','${f.challenge}','recovery','','','recovery',now(),now(),now())`).join(',\n')+';';
await writeFile('supabase/.temp/auth-pkce-fixture.sql',sql,{mode:0o600});
await writeFile('supabase/.temp/auth-pkce-fixture.json',JSON.stringify(flows),{mode:0o600});
console.log('Synthetic PKCE fixtures prepared in ignored supabase/.temp; apply SQL only to development and run opt-in tests immediately.');
