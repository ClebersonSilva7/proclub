import Link from "next/link";
import { supabaseConfig } from "@/lib/supabase/config";
import { AuthForm } from "./auth-form";
import { safeDestination } from "./validation";

const messages: Record<string, string> = {
  invalid:
    "Confira o e-mail e a senha informados. Para criar uma conta, use uma senha de 12 a 72 caracteres.",
  credentials:
    "Não foi possível entrar. Confira seus dados e confirme seu e-mail antes de tentar novamente.",
  "signup-failed":
    "Não foi possível concluir o cadastro. Tente novamente mais tarde ou recupere seu acesso.",
  "confirmation-sent":
    "Se o cadastro puder ser concluído, você receberá um link para confirmar seu e-mail. Depois, entre com sua senha.",
  "recovery-sent":
    "Se houver uma conta com esse e-mail, você receberá um link para recuperar o acesso.",
  "password-updated":
    "Sua senha foi atualizada. Entre novamente para continuar.",
  password: "Use de 12 a 72 caracteres e digite a mesma senha nos dois campos.",
  "password-failed":
    "Não foi possível atualizar a senha. Solicite um novo link e tente novamente.",
  "link-invalid":
    "Este link é inválido ou expirou. Solicite um novo link e abra no mesmo navegador.",
  "rate-limit":
    "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.",
  unavailable:
    "O acesso está temporariamente indisponível. Tente novamente mais tarde.",
  "signed-out": "Você saiu da sua conta.",
};
const success = new Set([
  "confirmation-sent",
  "recovery-sent",
  "password-updated",
  "signed-out",
]);
export type AuthSearch = Promise<{ status?: string; next?: string }>;
export async function AuthPage({
  mode,
  searchParams,
}: {
  mode: "login" | "signup" | "recover" | "password";
  searchParams: AuthSearch;
}) {
  const { status = "", next } = await searchParams;
  const enabled = Boolean(supabaseConfig() && process.env.APP_URL);
  const titles = {
    login: "Entrar no ProClub",
    signup: "Criar sua conta",
    recover: "Recuperar acesso",
    password: "Definir nova senha",
  };
  const descriptions = {
    login: "Acesse sua conta de torcedor ou a gestão dos seus clubes.",
    signup:
      "Uma conta para acompanhar os clubes que fazem parte da sua história.",
    recover: "Informe seu e-mail para receber um link de recuperação.",
    password: "Escolha uma nova senha para proteger sua conta.",
  };
  return (
    <section className="auth-shell" aria-labelledby="auth-title">
      <h1 id="auth-title">{titles[mode]}</h1>
      <p>{descriptions[mode]}</p>
      {!enabled && (
        <p className="form-message" role="status">
          O acesso está em preparação. Volte em breve.
        </p>
      )}
      {messages[status] && (
        <p
          className="form-message"
          role={success.has(status) ? "status" : "alert"}
        >
          {messages[status]}
        </p>
      )}
      <AuthForm
        mode={mode}
        next={mode === "login" ? safeDestination(next) : undefined}
        enabled={enabled}
      />
      <nav className="auth-links" aria-label="Opções de acesso">
        {mode === "login" ? (
          <>
            <Link href="/recuperar-senha">Esqueci minha senha</Link>
            <Link href="/cadastro">Criar uma conta</Link>
          </>
        ) : (
          <Link href="/login">Voltar para entrar</Link>
        )}
      </nav>
    </section>
  );
}
