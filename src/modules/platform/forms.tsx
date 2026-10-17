import { Button } from "@/components/ui/button";
import type { Tables } from "@/lib/supabase/database.types";
import { allowedStatuses, roles, states, statuses } from "./validation";
type Club = Tables<"clubs">;
export type Staff = {user_id: string; email: string; role: string; status: string};
export function ClubForm({club}: {club?: Club}) {
  const archived = club?.status === "archived";
  return <form className="admin-form" method="post" action="/admin/clubes/acoes/salvar">
    <input type="hidden" name="id" value={club?.id ?? ""}/><input type="hidden" name="updated_at" value={club?.updated_at ?? ""}/>
    <fieldset disabled={archived}>
      <div className="field"><label htmlFor="name">Nome do clube</label><input id="name" name="name" required minLength={2} maxLength={120} defaultValue={club?.name}/></div>
      <div className="field"><label htmlFor="slug">Endereço do clube (slug)</label><input id="slug" name="slug" required minLength={2} maxLength={80} pattern="[a-z0-9]+(-[a-z0-9]+)*" readOnly={!!club} defaultValue={club?.slug} aria-describedby="slug-help"/><small id="slug-help">Use letras minúsculas, números e hífens. O endereço é permanente após o cadastro.</small></div>
      <div className="field"><label htmlFor="sport">Modalidade principal</label><input id="sport" name="primary_sport" required minLength={2} maxLength={60} defaultValue={club?.primary_sport ?? "volleyball"}/></div>
      <div className="field"><label htmlFor="city">Cidade</label><input id="city" name="city" required minLength={2} maxLength={100} defaultValue={club?.city}/></div>
      <div className="field"><label htmlFor="state">Estado</label><select id="state" name="state" required defaultValue={club?.state ?? ""}><option value="" disabled>Selecione</option>{states.map(s=><option key={s}>{s}</option>)}</select></div>
      {club ? <div className="field"><label htmlFor="club-status">Situação do clube</label><select id="club-status" name="status" defaultValue={club.status}>{allowedStatuses(club.status).map(s=><option value={s} key={s}>{statuses[s as keyof typeof statuses]}</option>)}</select><small>Para ativar, adicione um responsável ativo. Suspender ou arquivar bloqueia o acesso dos gestores. O arquivamento é definitivo.</small></div> : <input type="hidden" name="status" value="draft"/>}
      <Reason id="club-reason"/>
      <Button type="submit">{club ? "Salvar clube" : "Criar clube em rascunho"}</Button>
    </fieldset>
  </form>;
}
function Reason({id}:{id:string}) { return <div className="field"><label htmlFor={id}>Motivo da alteração</label><textarea id={id} name="reason" required minLength={10} maxLength={500} rows={3} aria-describedby={`${id}-help`}/><small id={`${id}-help`}>De 10 a 500 caracteres. O motivo e sua identificação serão registrados na auditoria.</small></div>; }
export function StaffForm({clubId,person,index=0}:{clubId:string;person?:Staff;index?:number}) {
  const prefix = `staff-${person?.user_id ?? "new"}-${index}`;
  return <form className="admin-form" method="post" action="/admin/clubes/acoes/equipe">
    <input type="hidden" name="id" value={clubId}/><input type="hidden" name="expected_role" value={person?.role ?? ""}/><input type="hidden" name="expected_status" value={person?.status ?? ""}/>
    <div className="field"><label htmlFor={`${prefix}-email`}>E-mail da conta</label><input id={`${prefix}-email`} name="email" type="email" required maxLength={254} readOnly={!!person} defaultValue={person?.email} autoComplete="off"/>{!person && <small>A conta precisa estar cadastrada e ter o e-mail confirmado. Nenhum convite será enviado.</small>}</div>
    <div className="field"><label htmlFor={`${prefix}-role`}>Papel no clube</label><select id={`${prefix}-role`} name="role" defaultValue={person?.role ?? "manager"}>{Object.entries(roles).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select><small>Responsável e gestor acessam a gestão. Equipe não acessa o painel nesta etapa.</small></div>
    {person ? <div className="field"><label htmlFor={`${prefix}-status`}>Situação do vínculo</label><select id={`${prefix}-status`} name="status" defaultValue={person.status}><option value="active">Ativo</option><option value="revoked">Revogado</option></select></div> : <input type="hidden" name="status" value="active"/>}
    <Reason id={`${prefix}-reason`}/><Button type="submit">{person ? "Salvar vínculo" : "Adicionar à equipe"}</Button>
  </form>;
}
