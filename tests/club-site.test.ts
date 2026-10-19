import {beforeEach,expect,it,vi} from "vitest";
const {client,query,download}=vi.hoisted(()=>({client:vi.fn(),download:vi.fn(),query:{select:vi.fn(),eq:vi.fn(),maybeSingle:vi.fn()}}));
vi.mock('server-only',()=>({}));
vi.mock('../src/lib/supabase/public',()=>({createPublicClient:client}));
import {getPublicClub} from '../src/modules/club-site/data';
import {publicClubImage} from '../src/modules/club-site/image';
import {contrastInk,safeColor,safeExternalLink,phoneLink,validClubSlug} from '../src/modules/club-site/presentation';
const id='88888888-0000-4000-8000-000000000101';
const club={id,name:'Clube Azul',slug:'azul',city:'Campinas',state:'SP',primary_sport:'volleyball'};
const settings={description:'Clube sintético',logo_path:`${id}/logo/synthetic.png`,cover_path:null};
beforeEach(()=>{vi.resetAllMocks();client.mockReturnValue({from:()=>query,storage:{from:()=>({download})}});query.select.mockReturnValue(query);query.eq.mockReturnValue(query);query.maybeSingle.mockResolvedValueOnce({data:club,error:null}).mockResolvedValueOnce({data:settings,error:null});download.mockResolvedValue({data:new Blob([new Uint8Array([137,80,78,71,13,10,26,10])]),error:null});});
it('validates slugs and omits unsafe external links and CSS values',()=>{
 for(const slug of ['../admin','AZUL','a','%2fadmin'])expect(validClubSlug(slug)).toBe(false);
 expect(validClubSlug('clube-azul')).toBe(true);
 for(const url of ['javascript:alert(1)','http://example.test','https://user:pass@example.test','not a url'])expect(safeExternalLink(url)).toBeNull();
 expect(safeExternalLink('https://example.test')).toBe('https://example.test/');
 expect(safeColor('url(https://evil.test)')).toBe('#21543c');
 expect(phoneLink('+55 (11) 99999-0000')).toBe('tel:+5511999990000');expect(phoneLink('sem telefone')).toBeNull();
});
it('selects an accessible contrasting ink for black, white and middle colors',()=>{expect(contrastInk('#000000')).toBe('#ffffff');expect(contrastInk('#ffffff')).toBe('#000000');for(const color of ['#123456','#888888','#ffff00','#21543c'])expect(['#ffffff','#000000']).toContain(contrastInk(color));});
it('public reads explicitly require active club and only select public content',async()=>{
 const data=await getPublicClub('azul');expect(data?.club.name).toBe('Clube Azul');
 expect(query.eq).toHaveBeenCalledWith('status','active');expect(query.eq).toHaveBeenCalledWith('club_id',id);
 expect(query.select.mock.calls.every(([value])=>typeof value==='string'&&!value.includes('*')&&!value.includes('profiles')&&!value.includes('club_staff'))).toBe(true);
});
it('invalid slugs never query the provider',async()=>{expect(await getPublicClub('../admin')).toBeNull();expect(client).not.toHaveBeenCalled();});
it('missing clubs and missing settings do not expose content',async()=>{
 query.maybeSingle.mockReset().mockResolvedValue({data:null,error:null});expect(await getPublicClub('missing')).toBeNull();
 query.maybeSingle.mockReset().mockResolvedValueOnce({data:club,error:null}).mockResolvedValueOnce({data:null,error:null});expect(await getPublicClub('missing-settings')).toBeNull();
});
it('public image resolves only a current database reference and uses restrictive headers',async()=>{
 const r=await publicClubImage('azul','logo');expect(r.status).toBe(200);expect(download).toHaveBeenCalledWith(settings.logo_path);expect(r.headers.get('content-type')).toBe('image/png');expect(r.headers.get('cache-control')).toContain('no-store');expect(r.headers.get('x-content-type-options')).toBe('nosniff');
});
it('rejects unknown kinds, wrong club paths and Storage policy failures',async()=>{
 expect((await publicClubImage('azul','../private')).status).toBe(404);expect(client).not.toHaveBeenCalled();
 query.maybeSingle.mockReset().mockResolvedValueOnce({data:club,error:null}).mockResolvedValueOnce({data:{...settings,logo_path:'other-club/logo/private.png'},error:null});
 expect((await publicClubImage('azul','logo')).status).toBe(404);expect(download).not.toHaveBeenCalled();
 query.maybeSingle.mockReset().mockResolvedValueOnce({data:club,error:null}).mockResolvedValueOnce({data:settings,error:null});download.mockResolvedValue({data:null,error:{message:'private database detail'}});
 const denied=await publicClubImage('azul','logo');expect(denied.status).toBe(404);expect(await denied.text()).not.toContain('private database detail');
});

it('maintains WCAG body contrast at the troublesome middle gray boundary',()=>{expect(contrastInk('#777777')).toBe('#000000');expect(contrastInk('#767676')).toBe('#000000');});
