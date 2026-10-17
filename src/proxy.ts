import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { appOrigin, supabaseConfig } from "@/lib/supabase/config";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  response.headers.set("Cache-Control", "private, no-store");
  const config = supabaseConfig();
  if (!config) return response;
  const supabase = createServerClient(config.url, config.key, {
    cookieOptions: {
      httpOnly: true,
      sameSite: "lax",
      secure: appOrigin().startsWith("https:"),
      path: "/",
    },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values, headers) {
        for (const { name, value } of values) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of values)
          response.cookies.set(name, value, options);
        for (const [name, value] of Object.entries(headers ?? {}))
          response.headers.set(name, value);
        response.headers.set("Cache-Control", "private, no-store");
      },
    },
  });
  // Refresh only. Each protected page independently verifies user and permissions.
  await supabase.auth.getUser();
  return response;
}
export const config = {
  matcher: [
    "/fan/:path*",
    "/admin/:path*",
    "/gestao/:path*",
    "/redefinir-senha",
  ],
};
