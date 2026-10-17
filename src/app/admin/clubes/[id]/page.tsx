import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requirePlatformAdmin } from "@/modules/identity/access";
import { ClubForm, StaffForm } from "@/modules/platform/forms";
import { messages, roles, statuses } from "@/modules/platform/validation";
export const metadata = {title:"Gerenciar clube"};
export default async function ClubDetail({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{status?:string}>}) {
  const {supabase} = await requirePlatformAdmin();
  const {id} = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const {data:club,error} = await supabase.from("clubs").select("*").eq("id",id).maybeSingle();
  if (error) throw new Error("Não foi possível carregar o clube.");
  if (!club) notFound();
  const {data:staff,error:staffError} = await supabase.rpc("platform_club_staff",{p_club_id:id});
  if (staffError) throw new Error("Não foi possível carregar a equipe.");
  const status = (await searchParams).status;
  return <section className="admin-editor"><Link href="/admin">← Clubes</Link><h1>{club.name}</h1><p>{statuses[club.status as keyof typeof statuses]} · {club.city}, {club.state}</p>{status && messages[status] && <p role={status === "saved" ? "status" : "alert"} className="form-message">{messages[status]}</p>}
    {club.status === "archived" && <p className="form-message">Clube arquivado. Os dados e vínculos são mantidos para consulta.</p>}
    <h2>Dados do clube</h2><ClubForm club={club}/>
    <h2>Equipe administrativa</h2><p>Vínculos válidos somente para este clube. Administradores globais são gerenciados por operação privilegiada separada.</p>
    {!staff?.length && <p>Nenhum vínculo cadastrado.</p>}
    {staff?.map((person,index)=><details className="staff-entry" key={person.user_id}><summary>{person.email} · {roles[person.role as keyof typeof roles]} · {person.status === "active" ? "Ativo" : "Revogado"}</summary>{club.status !== "archived" && <StaffForm clubId={id} person={person} index={index}/>}</details>)}
    {club.status !== "archived" && <><h2>Adicionar pessoa</h2><StaffForm clubId={id}/></>}
  </section>;
}
