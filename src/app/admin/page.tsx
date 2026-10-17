import { requirePlatformAdmin } from "@/modules/identity/access";
import { Logout } from "@/modules/identity/logout";
export const metadata = { title: "Administração ProClub" };
export default async function Admin() {
  await requirePlatformAdmin();
  return (
    <>
      <h1>Administração ProClub</h1>
      <p>Seu acesso de administrador global foi verificado.</p>
      <p>O gerenciamento de clubes será disponibilizado na Etapa 04.</p>
      <Logout />
    </>
  );
}
