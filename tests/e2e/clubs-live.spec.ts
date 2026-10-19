import {expect,test} from "@playwright/test";
import {createClient} from "@supabase/supabase-js";
import {randomUUID} from "node:crypto";
import {syntheticClubImage} from '../fixtures/club-image.mjs';
const png=syntheticClubImage();
test.describe('Club management (synthetic development)',()=>{
 test.skip(!process.env.E2E_PASSWORD,'Requires synthetic development accounts');
 test.setTimeout(60000);
 test('manager edits own identity, uploads logo and cover, rejects stale form and cross-club operations',async({page,context},info)=>{
  await page.goto('/login');await page.getByLabel('E-mail',{exact:true}).fill(process.env.E2E_MANAGER_EMAIL!);await page.getByLabel('Senha',{exact:true}).fill(process.env.E2E_PASSWORD!);await page.getByRole('button',{name:'Entrar',exact:true}).click();await expect(page).toHaveURL(/\/fan$/);
  await page.goto('/gestao/azul-stage3');
  const form=page.locator('form[action$="/salvar"]');
  const stale=await form.evaluate((el:HTMLFormElement)=>Object.fromEntries(new FormData(el))) as Record<string,string>;
  const description=`Clube sintético: identidade verificada em ${info.project.name}.`;
  await page.getByLabel('Sobre o clube',{exact:true}).fill(description);
  await page.getByLabel('Cor principal',{exact:true}).fill('#164B86');
  await page.getByLabel('E-mail público',{exact:true}).fill('contato@azul.example');
  await page.getByLabel('Site oficial',{exact:true}).fill('https://example.test/azul');
  await page.getByRole('button',{name:'Salvar dados públicos',exact:true}).click();
  await expect(page.getByText('Dados públicos do clube salvos.',{exact:true})).toBeVisible();await page.reload();await expect(page.getByLabel('Sobre o clube',{exact:true})).toHaveValue(description);
  const conflict=await context.request.post('/gestao/azul-stage3/acoes/salvar',{headers:{Origin:'http://127.0.0.1:3000'},form:stale,maxRedirects:0});expect(conflict.headers().location).toContain('status=stale');
  for(const kind of ['logo','cover']) {
   await page.getByLabel(kind==='logo' ? 'Arquivo do logo' : 'Arquivo da capa',{exact:true}).setInputFiles({name:'synthetic.png',mimeType:'image/png',buffer:png});
   const imageForm=page.locator('form[action$="/imagem"]').filter({has:page.locator(`input[value="${kind}"]`)});
   await imageForm.getByRole('button',{name:'Enviar imagem',exact:true}).click();await expect(page.getByText('Imagem atualizada.',{exact:true})).toBeVisible();
   const image=page.getByRole('img',{name:kind==='logo' ? 'Logo de Azul sintético' : 'Capa de Azul sintético',exact:true});await expect(image).toBeVisible();await expect.poll(()=>image.evaluate((el:HTMLImageElement)=>el.complete && el.naturalWidth>0)).toBe(true);
   const response=await context.request.get(await image.getAttribute('src') ?? '');expect(response.status()).toBe(200);expect(response.headers()['content-type']).toBe('image/png');expect(response.headers()['cache-control']).toContain('no-store');
  }
  await page.getByRole('button',{name:'Remover capa',exact:true}).click();await expect(page.getByText('Nenhuma capa enviada.',{exact:true})).toBeVisible();
  await page.getByLabel('Arquivo da capa',{exact:true}).setInputFiles({name:'synthetic.png',mimeType:'image/png',buffer:png});await page.locator('form[action$="/imagem"]').last().getByRole('button',{name:'Enviar imagem',exact:true}).click();await expect(page.getByText('Imagem atualizada.',{exact:true})).toBeVisible();
  const forged=await context.request.post('/gestao/vermelho-stage3/acoes/salvar',{headers:{Origin:'http://127.0.0.1:3000'},form:{...stale,club_id:'88888888-0000-4000-8000-000000000101'},maxRedirects:0});expect(forged.status()).toBe(303);expect(forged.headers().location).toContain('acesso-negado');
  const denied=await context.request.get('/gestao/vermelho-stage3/imagens/logo',{maxRedirects:0});expect(denied.headers().location).toContain('acesso-negado');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 });
 test('Storage API enforces tenant policies independently of Next.js',async()=>{
  process.loadEnvFile('.env.local');
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL!,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
  expect(url).toBe('https://emjoizihrwffoqewapig.supabase.co');
  const options={auth:{persistSession:false,autoRefreshToken:false}};
  const manager=createClient(url,key,options),red=createClient(url,key,options),anon=createClient(url,key,options);
  for(const [client,email] of [[manager,process.env.E2E_MANAGER_EMAIL!],[red,'red-manager-stage3@proclub.example']] as const) expect((await client.auth.signInWithPassword({email,password:process.env.E2E_PASSWORD!})).error).toBeNull();
  const bluePath=`88888888-0000-4000-8000-000000000101/logo/${randomUUID()}.png`,redPath=`88888888-0000-4000-8000-000000000102/logo/${randomUUID()}.png`;
  expect((await red.storage.from('club-assets').upload(redPath,png,{contentType:'image/png'})).error).toBeNull();
  expect((await manager.storage.from('club-assets').download(redPath)).error).not.toBeNull();
  expect((await anon.storage.from('club-assets').download(redPath)).error).not.toBeNull();
  expect((await manager.storage.from('club-assets').upload(`88888888-0000-4000-8000-000000000102/logo/${randomUUID()}.png`,png,{contentType:'image/png'})).error).not.toBeNull();
  expect((await manager.storage.from('club-assets').upload(bluePath,png,{contentType:'image/png'})).error).toBeNull();
  expect((await manager.storage.from('club-assets').upload(bluePath,png,{contentType:'image/png',upsert:true})).error).not.toBeNull();
  expect((await manager.storage.from('club-assets').move(bluePath,`88888888-0000-4000-8000-000000000102/logo/${randomUUID()}.png`)).error).not.toBeNull();
  expect((await manager.storage.from('club-assets').upload(`88888888-0000-4000-8000-000000000101/logo/${randomUUID()}.png`,Buffer.alloc(2097153),{contentType:'image/png'})).error).not.toBeNull();
  expect((await manager.storage.from('club-assets').upload(`88888888-0000-4000-8000-000000000101/logo/${randomUUID()}.svg`,'<svg/>',{contentType:'image/svg+xml'})).error).not.toBeNull();
 });
});
