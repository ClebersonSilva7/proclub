import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
test("synthetic recovery PKCE callback exchanges once, requires original browser, opens password form",async({page,context,browser},info)=>{
 test.skip(process.env.E2E_PKCE !== "1","Requires short-lived synthetic PKCE fixture; does not test email delivery");
 const fixtures=JSON.parse(await readFile('supabase/.temp/auth-pkce-fixture.json','utf8')) as Record<string,{code:string;verifier:string}>;
 const f=fixtures[info.project.name];
 const callback=`http://127.0.0.1:3000/auth/callback?code=${encodeURIComponent(f.code)}&next=/redefinir-senha`;
 const other=await browser.newContext();
 try { const p=await other.newPage();await p.goto(callback);await expect(p).toHaveURL(/status=link-browser/); } finally {await other.close();}
 await context.addCookies([{name:'sb-emjoizihrwffoqewapig-auth-token-code-verifier',value:'base64-'+Buffer.from(JSON.stringify(f.verifier+'/recovery')).toString('base64url'),url:'http://127.0.0.1:3000',httpOnly:true,sameSite:'Lax'}]);
 await page.goto(callback);
 await expect(page).toHaveURL(/\/redefinir-senha$/);
 await expect(page.getByLabel("Nova senha",{exact:true})).toBeVisible();
 await expect(page.getByLabel("Confirmar nova senha",{exact:true})).toBeVisible();
 await page.goto('/fan');await expect(page.getByText(process.env.E2E_FAN_EMAIL!,{exact:true})).toBeVisible();
 // Replaying the consumed authorization code cannot open the password page.
 await context.addCookies([{name:'sb-emjoizihrwffoqewapig-auth-token-code-verifier',value:'base64-'+Buffer.from(JSON.stringify(f.verifier+'/recovery')).toString('base64url'),url:'http://127.0.0.1:3000',httpOnly:true,sameSite:'Lax'}]);
 await page.goto(callback);await expect(page).toHaveURL(/status=link-invalid/);
});
