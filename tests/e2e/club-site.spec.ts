import {expect,test} from '@playwright/test';
test('public directory is reachable without login and validates invalid slugs',async({page})=>{
 await page.goto('/');await page.getByRole('link',{name:'Conhecer os clubes',exact:true}).click();await expect(page).toHaveURL(/\/clubes$/);await expect(page.getByRole('heading',{name:'Clubes',exact:true})).toBeVisible();await expect(page.getByLabel('Buscar clube por nome')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 const r=await page.goto('/clubes/INVALID-SLUG');expect(r?.status()).toBe(404);await expect(page.getByRole('heading',{name:'Clube não encontrado'})).toBeVisible();
});
