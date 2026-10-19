import {afterEach,expect,it,vi} from 'vitest';
vi.mock('server-only',()=>({}));
import {createPublicClient} from '../src/lib/supabase/public';
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
it('real SDK public transport has no visitor cookies or session and always bypasses cache',async()=>{
 vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL','https://synthetic.supabase.co');vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','sb_publishable_synthetic');
 const fetcher=vi.fn<typeof fetch>().mockResolvedValue(Response.json([]));vi.stubGlobal('fetch',fetcher);
 await createPublicClient()!.from('clubs').select('name').eq('status','active');
 expect(fetcher).toHaveBeenCalledOnce();const init=fetcher.mock.calls[0][1] as RequestInit;expect(init.cache).toBe('no-store');expect(new Headers(init.headers).get('cookie')).toBeNull();expect(new Headers(init.headers).get('authorization')).toBe('Bearer sb_publishable_synthetic');
});
it('an unavailable provider is aborted instead of blocking public navigation',async()=>{
 vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL','https://synthetic.supabase.co');vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','sb_publishable_synthetic');
 vi.stubGlobal('fetch',vi.fn<typeof fetch>((_input,init)=>new Promise((_resolve,reject)=>{
  init!.signal!.addEventListener('abort',()=>reject(init!.signal!.reason),{once:true});
 })));
 const result=await createPublicClient()!.from('clubs').select('name').retry(false);
 expect(result.error).not.toBeNull();
},4500);
