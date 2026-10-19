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
