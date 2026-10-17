import { z } from "zod";
import { emailSchema } from "@/modules/identity/validation";
export const statuses = { draft: "Rascunho", active: "Ativo", suspended: "Suspenso", archived: "Arquivado" } as const;
export const roles = { owner: "Responsável", manager: "Gestor", staff: "Equipe" } as const;
export const states = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'] as const;
const emptyNull = z.string().transform(v => v === "" ? null : v);
const uuidOrNull = emptyNull.pipe(z.uuid().nullable());
const reason = z.string().trim().min(10).max(500);
export const clubSchema = z.object({
  id: uuidOrNull, name: z.string().trim().min(2).max(120),
  slug: z.string().min(2).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  primary_sport: z.string().trim().min(2).max(60), city: z.string().trim().min(2).max(100),
  state: z.enum(states), status: z.enum(["draft","active","suspended","archived"]),
  updated_at: emptyNull.pipe(z.iso.datetime({ offset: true }).nullable()), reason,
}).refine(v => v.id ? v.updated_at !== null : v.status === "draft" && v.updated_at === null);
export const staffSchema = z.object({
  id: z.uuid(), email: emailSchema, role: z.enum(["owner","manager","staff"]),
  status: z.enum(["active","revoked"]), reason,
  expected_role: emptyNull.pipe(z.enum(["owner","manager","staff"]).nullable()),
  expected_status: emptyNull.pipe(z.enum(["active","revoked"]).nullable()),
});
export function allowedStatuses(status: string) {
  return status === "draft" ? ["draft","active","archived"] : status === "active" ? ["active","suspended","archived"] : status === "suspended" ? ["suspended","active","archived"] : ["archived"];
}
export const messages: Record<string,string> = {
  saved: "Alterações salvas.", invalid: "Revise os campos e informe um motivo com pelo menos 10 caracteres.",
  duplicate: "Este endereço já está em uso por outro clube. Escolha outro slug.",
  stale: "Os dados mudaram desde que esta página foi aberta. Revise os valores atuais antes de salvar novamente.",
  rule: "A alteração não foi permitida. Para ativar um clube, cadastre um responsável ativo. Clubes ativos devem manter ao menos um responsável; clubes arquivados não podem ser alterados.",
  missing: "Clube ou conta confirmada não encontrado. Confira o e-mail cadastrado.",
  failed: "Não foi possível salvar agora. Tente novamente.",
};
