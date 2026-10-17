import Link from "next/link";
import { requireUser } from "@/modules/identity/access";
import { Logout } from "@/modules/identity/logout";
export const metadata = { title: "Minha conta" };
export default async function Fan() {
  const { user, supabase } = await requireUser();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw new Error("Não foi possível carregar sua conta.");
  const { data: admin, error: adminError } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  const { data: staff, error: staffError } = await supabase
    .from("club_staff")
    .select("club_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .in("role", ["owner", "manager"]);
  if (adminError || staffError)
    throw new Error("Não foi possível carregar seus acessos.");
  const { data: clubs, error: clubsError } = staff?.length
    ? await supabase
        .from("clubs")
        .select("id,name,slug")
        .in(
          "id",
          staff.map((link) => link.club_id),
        )
        .eq("status", "active")
    : { data: [], error: null };
  if (clubsError) throw new Error("Não foi possível carregar seus clubes.");
  return (
    <>
      <h1>Minha conta</h1>
      <p>
        Olá{profile?.display_name ? `, ${profile.display_name}` : ""}. Seu
        acesso ao ProClub está ativo.
      </p>
      <p>{user.email}</p>
      <p>
        A área de torcedor e os vínculos com clubes serão disponibilizados nas
        próximas etapas.
      </p>
      {(admin || Boolean(clubs?.length)) && (
        <section aria-labelledby="my-access">
          <h2 id="my-access">Meus acessos de gestão</h2>
          <ul>
            {admin && (
              <li>
                <Link href="/admin">Administração ProClub</Link>
              </li>
            )}
            {clubs?.map((club) => (
              <li key={club.id}>
                <Link href={`/gestao/${club.slug}`}>{club.name}</Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <p>
        <Link href="/redefinir-senha">Alterar senha</Link>
      </p>
      <Logout />
    </>
  );
}
