"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";

type Mode = "login" | "signup" | "recover" | "password";
const labels = {
  login: "Entrar",
  signup: "Criar conta",
  recover: "Enviar link de recuperação",
  password: "Salvar nova senha",
};
export function AuthForm({
  mode,
  next,
  enabled,
}: {
  mode: Mode;
  next?: string;
  enabled: boolean;
}) {
  const [pending, setPending] = useState(false);
  const password = mode !== "recover";
  return (
    <form
      className="auth-form"
      method="post"
      action={`/auth/${mode}`}
      onSubmit={() => setPending(true)}
      aria-busy={pending}
    >
      {next && <input type="hidden" name="next" value={next} />}
      {mode !== "password" && (
        <div className="field">
          <label htmlFor="email">E-mail</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            autoCapitalize="none"
          />
        </div>
      )}
      {password && (
        <div className="field">
          <label htmlFor="password">
            {mode === "password" ? "Nova senha" : "Senha"}
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
            required
            minLength={mode === "login" ? 1 : 12}
            maxLength={72}
            aria-describedby={mode === "login" ? undefined : "password-hint"}
          />
          {mode !== "login" && (
            <small id="password-hint">
              Use de 12 a 72 caracteres. Você pode colar uma senha do seu
              gerenciador.
            </small>
          )}
        </div>
      )}
      {mode === "password" && (
        <div className="field">
          <label htmlFor="confirmation">Confirmar nova senha</label>
          <input
            id="confirmation"
            name="confirmation"
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            maxLength={72}
          />
        </div>
      )}
      <Button type="submit" disabled={!enabled || pending}>
        {pending ? "Aguarde…" : labels[mode]}
      </Button>
    </form>
  );
}
