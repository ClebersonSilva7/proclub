import "server-only";
import { requirePlatformAdmin } from "@/modules/identity/access";
import { validOrigin, readAuthForm, authRedirect } from "@/modules/identity/http";
import { clubSchema, staffSchema } from "./validation";
export async function adminPost(request: Request, action: string) {
  if (!validOrigin(request)) return new Response(null, { status: 403 });
  const { supabase } = await requirePlatformAdmin();
  let form: FormData;
  try { form = await readAuthForm(request); } catch { return new Response(null, { status: 413 }); }
  const raw = Object.fromEntries(form);
  const id = typeof raw.id === "string" && /^[a-f0-9-]{36}$/i.test(raw.id) ? raw.id : null;
  const back = id ? `/admin/clubes/${id}` : "/admin/clubes/novo";
  let result;
  if (action === "salvar") {
    const parsed = clubSchema.safeParse(raw);
    if (!parsed.success) return authRedirect(`${back}?status=invalid`);
    const v = parsed.data;
    result = await supabase.rpc("platform_save_club", { p_club_id: v.id, p_name: v.name, p_slug: v.slug, p_primary_sport: v.primary_sport, p_city: v.city, p_state: v.state, p_status: v.status, p_expected_updated_at: v.updated_at, p_reason: v.reason });
  } else if (action === "equipe") {
    const parsed = staffSchema.safeParse(raw);
    if (!parsed.success) return authRedirect(`${back}?status=invalid`);
    const v = parsed.data;
    result = await supabase.rpc("platform_set_staff", { p_club_id: v.id, p_email: v.email, p_role: v.role, p_status: v.status, p_reason: v.reason, p_expected_role: v.expected_role, p_expected_status: v.expected_status });
  } else return new Response(null, { status: 404 });
  if (result.error) {
    const codes: Record<string,string> = { '40001': 'stale', '23505': 'duplicate', '23514': 'rule', 'P0002': 'missing' };
    if (result.error.code === '42501') return new Response(null, { status: 403 });
    return authRedirect(`${back}?status=${codes[result.error.code] ?? 'failed'}`);
  }
  return authRedirect(`/admin/clubes/${action === "salvar" ? result.data : id}?status=saved`);
}
