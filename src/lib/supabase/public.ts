import "server-only";
import {createClient} from "@supabase/supabase-js";
import type {Database} from "./database.types";
import {supabaseConfig} from "./config";
// Never forward cookies or a visitor's session: public pages always use anon RLS.
export function createPublicClient() {
  const config=supabaseConfig();
  if(!config) return null;
  return createClient<Database>(config.url,config.key,{
    auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
    global:{fetch:(input,init)=>fetch(input,{...init,cache:"no-store"})},
  });
}
