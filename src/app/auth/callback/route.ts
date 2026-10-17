import { createClient } from "@/lib/supabase/server";
import { supabaseConfig } from "@/lib/supabase/config";
import { authRedirect } from "@/modules/identity/http";
import { safeDestination } from "@/modules/identity/validation";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (!code || code.length > 2048 || !supabaseConfig())
    return authRedirect("/login?status=link-invalid");
  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error)
    return authRedirect(
      error.code === "pkce_code_verifier_not_found" ||
        error.code === "bad_code_verifier"
        ? "/login?status=link-browser"
        : "/login?status=link-invalid",
    );
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user || user.is_anonymous)
    return authRedirect("/login?status=link-invalid");
  const { error: profileError } = await supabase
    .from("profiles")
    .upsert({ id: user.id }, { onConflict: "id", ignoreDuplicates: true });
  if (profileError) return authRedirect("/login?status=unavailable");
  return authRedirect(safeDestination(url.searchParams.get("next")));
}
