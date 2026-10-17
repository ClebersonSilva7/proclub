import { AuthPage, type AuthSearch } from "@/modules/identity/auth-page";
export const metadata = { title: "Recuperar acesso" };
export default function Recover({
  searchParams,
}: {
  searchParams: AuthSearch;
}) {
  return <AuthPage mode="recover" searchParams={searchParams} />;
}
