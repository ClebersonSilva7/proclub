import { requireClubManager } from "@/modules/identity/access";
import { Logout } from "@/modules/identity/logout";
export const metadata = { title: "Gestão do clube" };
export default async function Management({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { club } = await requireClubManager(slug);
  return (
    <>
      <h1>Gestão: {club.name}</h1>
      <p>Seu acesso a este clube foi verificado.</p>
      <p>
        As ferramentas de gestão serão disponibilizadas nas próximas etapas.
      </p>
      <Logout />
    </>
  );
}
