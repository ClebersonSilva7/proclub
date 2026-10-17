import { AuthPage, type AuthSearch } from "@/modules/identity/auth-page";
import { requireUser } from "@/modules/identity/access";
export const metadata = { title: "Definir nova senha" };
export default async function Password({
  searchParams,
}: {
  searchParams: AuthSearch;
}) {
  await requireUser("/redefinir-senha");
  return <AuthPage mode="password" searchParams={searchParams} />;
}
