import { NextResponse } from "next/server";
import { createClient, createRecoveryClient } from "@/lib/supabase/server";
import { appOrigin, supabaseConfig } from "@/lib/supabase/config";
import {
  authRedirect,
  validOrigin,
  readAuthForm,
} from "@/modules/identity/http";
import {
  emailSchema,
  loginSchema,
  signupSchema,
  passwordUpdateSchema,
  safeDestination,
} from "@/modules/identity/validation";

const pages: Record<string, string> = {
  login: "/login",
  signup: "/cadastro",
  recover: "/recuperar-senha",
  password: "/redefinir-senha",
  logout: "/login",
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ action: string }> },
) {
  const { action } = await params;
  const page = pages[action];
  if (!page) return new NextResponse(null, { status: 404 });
  if (!supabaseConfig() || !process.env.APP_URL)
    return new NextResponse("Acesso temporariamente indisponível.", {
      status: 503,
    });
  if (!validOrigin(request)) return new NextResponse(null, { status: 403 });
  if (
    !(request.headers.get("content-type") ?? "").startsWith(
      "application/x-www-form-urlencoded",
    ) &&
    !(request.headers.get("content-type") ?? "").startsWith(
      "multipart/form-data",
    )
  )
    return new NextResponse(null, { status: 415 });
  if (Number(request.headers.get("content-length") ?? 0) > 8192)
    return new NextResponse(null, { status: 413 });
  let form: FormData;
  try {
    form = await readAuthForm(request);
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  const fail = (status: string) => authRedirect(`${page}?status=${status}`);
  const input = Object.fromEntries(form);
  if (action === "login" && !loginSchema.safeParse(input).success)
    return fail("invalid");
  if (action === "signup" && !signupSchema.safeParse(input).success)
    return fail("invalid");
  if (action === "recover" && !emailSchema.safeParse(input.email).success)
    return fail("invalid");
  if (action === "password" && !passwordUpdateSchema.safeParse(input).success)
    return fail("password");
  try {
    if (action === "recover") {
      const { supabase: recoveryClient, commitCookies } =
        await createRecoveryClient();
      const { error } = await recoveryClient.auth.resetPasswordForEmail(
        emailSchema.parse(input.email),
        { redirectTo: `${appOrigin()}/auth/callback?next=/redefinir-senha` },
      );
      if (error?.status === 429) return fail("rate-limit");
      // Keep account existence private; Supabase normally returns success for
      // unknown addresses, but never expose a provider's not-found response.
      if (error?.status === 404) return fail("recovery-sent");
      if (error) return fail("recovery-failed");
      commitCookies();
      return fail("recovery-sent");
    }
    const supabase = await createClient();
    if (action === "logout") {
      const { error } = await supabase.auth.signOut({ scope: "global" });
      if (error) return fail("unavailable");
      return authRedirect("/login?status=signed-out");
    }
    if (action === "password") {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user || user.is_anonymous)
        return authRedirect("/login");
      const { error } = await supabase.auth.updateUser({
        password: passwordUpdateSchema.parse(input).password,
      });
      if (error) return fail("password-failed");
      const { error: logoutError } = await supabase.auth.signOut({
        scope: "global",
      });
      if (logoutError) return fail("unavailable");
      return authRedirect("/login?status=password-updated");
    }
    if (action === "signup") {
      const { error } = await supabase.auth.signUp({
        ...signupSchema.parse(input),
        options: { emailRedirectTo: `${appOrigin()}/auth/callback` },
      });
      if (error)
        return fail(error.status === 429 ? "rate-limit" : "signup-failed");
      // Even if auto-confirm is enabled, finish with an explicit login.
      await supabase.auth.signOut({ scope: "local" });
      return fail("confirmation-sent");
    }
    const { error } = await supabase.auth.signInWithPassword(
      loginSchema.parse(input),
    );
    if (error) return fail(error.status === 429 ? "rate-limit" : "credentials");
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user || user.is_anonymous) return fail("credentials");
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert({ id: user.id }, { onConflict: "id", ignoreDuplicates: true });
    if (profileError) return fail("unavailable");
    return authRedirect(safeDestination(form.get("next")));
  } catch {
    return fail("unavailable");
  }
}
