"use client";
import {useState,type ReactNode} from "react";
import type {Tables} from "@/lib/supabase/database.types";
import {Button} from "@/components/ui/button";
import {states} from "@/modules/platform/validation";
export function SaveForm({action,children,multipart=false}:{action:string;children:ReactNode;multipart?:boolean}) {
 const [pending,setPending]=useState(false);
 return <form className="admin-form" method="post" action={action} encType={multipart ? "multipart/form-data" : undefined} onSubmit={()=>setPending(true)} aria-busy={pending}><fieldset>{children}<Button type="submit" disabled={pending}>{pending ? "Salvando…" : multipart ? "Enviar imagem" : "Salvar dados públicos"}</Button></fieldset></form>;
}
export function IdentityForm({club,settings}:{club:Tables<"clubs">;settings:Tables<"club_settings">}) {
 const [primary,setPrimary]=useState(settings.primary_color),[secondary,setSecondary]=useState(settings.secondary_color);
 const validColor=(v:string)=>/^#[0-9a-f]{6}$/i.test(v) ? v : "#21543c";
 return <SaveForm action={`/gestao/${club.slug}/acoes/salvar`}>
  <input type="hidden" name="club_version" value={club.updated_at}/><input type="hidden" name="settings_version" value={settings.updated_at}/>
  <h2>Dados do clube</h2>
  <TextField name="name" label="Nome do clube" value={club.name} max={120} required/>
  <TextField name="primary_sport" label="Modalidade principal" value={club.primary_sport} max={60} required/>
  <TextField name="city" label="Cidade" value={club.city} max={120} required/>
  <div className="field"><label htmlFor="state">Estado</label><select id="state" name="state" defaultValue={club.state}>{states.map(s=><option key={s}>{s}</option>)}</select></div>
  <div className="field"><label htmlFor="description">Sobre o clube</label><textarea id="description" name="description" maxLength={5000} rows={6} defaultValue={settings.description} aria-describedby="description-help"/><small id="description-help">Até 5.000 caracteres, em texto simples.</small></div>
  <h2>Cores da identidade</h2><p>As cores serão usadas na identidade pública do clube. A navegação do ProClub mantém suas próprias cores.</p>
  <div className="club-colors">{[["primary_color","Cor principal",primary,setPrimary],["secondary_color","Cor secundária",secondary,setSecondary]].map(([name,label,value,setter])=><div className="field" key={String(name)}><label htmlFor={String(name)}>{String(label)}</label><input id={String(name)} name={String(name)} value={String(value)} pattern="#[0-9A-Fa-f]{6}" required maxLength={7} onChange={e=>(setter as (v:string)=>void)(e.target.value)}/><small>Formato hexadecimal, como #21543c.</small></div>)}</div>
  <div className="palette-preview" aria-label="Prévia das cores"><span style={{backgroundColor:validColor(primary)}}/><span style={{backgroundColor:validColor(secondary)}}/><p>Prévia da paleta</p></div>
  <h2>Contatos públicos</h2><p>Informe somente contatos que podem ser divulgados aos torcedores.</p>
  <TextField name="public_email" label="E-mail público" value={settings.public_email} max={254} type="email"/>
  <TextField name="public_phone" label="Telefone público" value={settings.public_phone} max={30} type="tel"/>
  <TextField name="website_url" label="Site oficial" value={settings.website_url} max={2048} type="url"/>
  <TextField name="instagram_url" label="Instagram" value={settings.instagram_url} max={2048} type="url"/>
  <TextField name="facebook_url" label="Facebook" value={settings.facebook_url} max={2048} type="url"/>
  <small>Links devem começar com https://. Deixe campos opcionais vazios para removê-los.</small>
 </SaveForm>;
}
function TextField({name,label,value,max,type="text",required=false}:{name:string;label:string;value:string|null;max:number;type?:string;required?:boolean}) {
 return <div className="field"><label htmlFor={name}>{label}</label><input id={name} name={name} type={type} defaultValue={value ?? ""} maxLength={max} required={required} minLength={required ? 2 : undefined}/></div>;
}
export function ImageForm({slug,kind,version}:{slug:string;kind:"logo"|"cover";version:string}) {
 return <SaveForm action={`/gestao/${slug}/acoes/imagem`} multipart><input type="hidden" name="settings_version" value={version}/><input type="hidden" name="kind" value={kind}/><div className="field"><label htmlFor={`file-${kind}`}>{kind==="logo" ? "Arquivo do logo" : "Arquivo da capa"}</label><input id={`file-${kind}`} type="file" name="file" accept="image/png,image/jpeg,image/webp" required aria-describedby={`file-help-${kind}`}/><small id={`file-help-${kind}`}>PNG, JPEG ou WebP, até 2 MB. O envio substitui a imagem atual.</small></div></SaveForm>;
}
