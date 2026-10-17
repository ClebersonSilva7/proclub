import "server-only";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { appOrigin, supabaseConfig } from "./config";
import type { Database } from "./database.types";

async function createCookieClient(deferred: boolean) {
  const config = supabaseConfig();
  if (!config) throw new Error("Supabase não configurado.");
  const jar = await cookies();
  const pending = new Map<
    string,
    { name: string; value: string; options: CookieOptions }
  >();
  function commitCookies() {
    for (const { name, value, options } of pending.values())
      jar.set(name, value, options);
    pending.clear();
  }
  const supabase = createServerClient<Database>(config.url, config.key, {
    cookieOptions: {
      httpOnly: true,
      sameSite: "lax",
      secure: appOrigin().startsWith("https:"),
      path: "/",
    },
    cookies: {
      getAll() {
        const values = new Map(
          jar.getAll().map((cookie) => [cookie.name, cookie]),
        );
        for (const { name, value } of pending.values())
          values.set(name, { name, value });
        return [...values.values()];
      },
      setAll(values) {
        for (const cookie of values) {
          if (deferred && cookie.name.includes("-code-verifier")) {
            pending.set(cookie.name, cookie);
          } else {
            try { jar.set(cookie.name, cookie.value, cookie.options); }
            catch { /* Server Components cannot write cookies; proxy persists refreshes. */ }
          }
        }
      },
    },
  });
  return { supabase, commitCookies };
}

export async function createClient() {
  return (await createCookieClient(false)).supabase;
}

// Auth-js generates a PKCE verifier before calling /recover. Do not replace
// the browser's previous verifier unless the provider accepts the new request.
export async function createRecoveryClient() {
  return createCookieClient(true);
}
