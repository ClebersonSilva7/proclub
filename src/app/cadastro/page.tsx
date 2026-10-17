import { AuthPage, type AuthSearch } from "@/modules/identity/auth-page";
export const metadata = { title: "Criar conta" };
export default function Signup({ searchParams }: { searchParams: AuthSearch }) {
  return <AuthPage mode="signup" searchParams={searchParams} />;
}
