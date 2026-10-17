import { AuthPage, type AuthSearch } from "@/modules/identity/auth-page";
export const metadata = { title: "Entrar" };
export default function Login({ searchParams }: { searchParams: AuthSearch }) {
  return <AuthPage mode="login" searchParams={searchParams} />;
}
