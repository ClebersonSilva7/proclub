import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfig } from "@/lib/supabase/config";
import { safeDestination } from "./validation";

export async function requireUser(destination = "/fan") {
  if (!supabaseConfig()) redirect("/login?status=unavailable");
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user || user.is_anonymous)
    redirect(`/login?next=${encodeURIComponent(safeDestination(destination))}`);
  return { supabase, user };
}

export async function requirePlatformAdmin() {
  const context = await requireUser("/admin");
  const { data, error } = await context.supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", context.user.id)
    .maybeSingle();
  if (error) throw new Error("Não foi possível verificar suas permissões.");
  if (!data) redirect("/acesso-negado");
  return context;
}

export async function requireClubManager(slug: string) {
  const context = await requireUser(`/gestao/${slug}`);
  const { supabase, user } = context;
  const { data: admin, error: adminError } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (adminError)
    throw new Error("Não foi possível verificar suas permissões.");
  const { data: club, error } = await supabase
    .from("clubs")
    .select("id,name,slug,status")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error("Não foi possível verificar o clube.");
  if (!club) redirect("/acesso-negado");
  if (!admin) {
    const { data: staff, error: staffError } = await supabase
      .from("club_staff")
      .select("role,status")
      .eq("club_id", club.id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (staffError)
      throw new Error("Não foi possível verificar suas permissões.");
    if (
      club.status !== "active" ||
      staff?.status !== "active" ||
      !["owner", "manager"].includes(staff.role)
    )
      redirect("/acesso-negado");
  }
  return { ...context, club };
}
