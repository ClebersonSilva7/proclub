import Link from "next/link";
import Image from "next/image";
import {requireClubManager} from "@/modules/identity/access";
import {Logout} from "@/modules/identity/logout";
import {IdentityForm,ImageForm} from "@/modules/clubs/forms";
import {clubMessages} from "@/modules/clubs/validation";
import {statuses} from "@/modules/platform/validation";
import {Button} from "@/components/ui/button";
export const metadata={title:"Gestão do clube"};
export default async function Management({params,searchParams}:{params:Promise<{slug:string}>;searchParams:Promise<{status?:string}>}) {
 const {slug}=await params;const {club:access,supabase}=await requireClubManager(slug);
 const [{data:club,error:clubError},{data:settings,error:settingsError}]=await Promise.all([supabase.from("clubs").select("*").eq("id",access.id).single(),supabase.from("club_settings").select("*").eq("club_id",access.id).single()]);
 if(clubError || settingsError || !club || !settings) throw new Error("Não foi possível carregar a identidade do clube.");
 const status=(await searchParams).status;
 return <section className="club-editor"><Link href="/fan">Minha conta e meus acessos</Link><h1>Gestão: {club.name}</h1><p>Seu acesso a este clube foi verificado.</p><p>{statuses[club.status as keyof typeof statuses]} · Endereço permanente: {club.slug}</p>
  <nav aria-label="Seções da gestão"><a href="#identidade">Dados e contatos</a><a href="#imagens">Logo e capa</a>{club.status==="active" && <Link href={`/clubes/${club.slug}`}>Ver site público</Link>}</nav>
  {status && Object.hasOwn(clubMessages,status) && <p className="form-message" role={["saved","image","removed"].includes(status) ? "status" : "alert"}>{clubMessages[status]}</p>}
  <p className="form-message">Os dados desta página são públicos quando o clube está ativo. Não informe documentos, informações financeiras ou contatos privados.</p>
  {club.status==="archived" ? <p>Clube arquivado. A edição da identidade está bloqueada.</p> : <><section id="identidade" aria-label="Identidade do clube"><IdentityForm club={club} settings={settings}/></section><section id="imagens"><h2>Logo e capa</h2><p>Logo e capa atuais aparecem no site público quando o clube está ativo. Imagens substituídas ficam disponíveis somente para a equipe autorizada.</p>{(["logo","cover"] as const).map(kind=>{const path=kind==="logo" ? settings.logo_path : settings.cover_path;return <section key={kind} className="club-image-section"><h3>{kind==="logo" ? "Logo do clube" : "Capa do clube"}</h3>{path ? <><Image unoptimized src={`/gestao/${club.slug}/imagens/${kind}?v=${encodeURIComponent(settings.updated_at)}`} alt={kind==="logo" ? `Logo de ${club.name}` : `Capa de ${club.name}`} width={kind==="logo" ? 240 : 720} height={kind==="logo" ? 240 : 360} className={`club-image club-image-${kind}`}/><form method="post" action={`/gestao/${club.slug}/acoes/remover-imagem`}><input type="hidden" name="kind" value={kind}/><input type="hidden" name="settings_version" value={settings.updated_at}/><Button type="submit" variant="outline">Remover {kind==="logo" ? "logo" : "capa"}</Button></form></> : <p>{kind==="logo" ? "Nenhum logo enviado." : "Nenhuma capa enviada."}</p>}<ImageForm slug={club.slug} kind={kind} version={settings.updated_at}/></section>;})}</section></>}
  <Logout/>
 </section>;
}
