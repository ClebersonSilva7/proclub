import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { appOrigin, supabaseConfig } from "./config";
import type { Database } from "./database.types";

export async function createClient() {
  const config = supabaseConfig();
  if (!config) throw new Error("Supabase não configurado.");
  const jar = await cookies();
  return createServerClient<Database>(config.url, config.key, {
    cookieOptions: {
      httpOnly: true,
      sameSite: "lax",
      secure: appOrigin().startsWith("https:"),
      path: "/",
    },
    cookies: {
      getAll: () => jar.getAll(),
      setAll(values) {
        try {
          for (const { name, value, options } of values)
            jar.set(name, value, options);
        } catch {
          /* Server Components cannot write cookies; proxy persists refreshes. */
        }
      },
    },
  });
}
