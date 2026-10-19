import type {CSSProperties} from "react";
import type {Metadata} from "next";
import Image from "next/image";
import Link from "next/link";
import {notFound} from "next/navigation";
import {connection} from "next/server";
import {getPublicClub} from "@/modules/club-site/data";
import {safeColor,contrastInk,safeExternalLink,phoneLink,sportLabel} from "@/modules/club-site/presentation";
import {appOrigin} from "@/lib/supabase/config";
type Props={params:Promise<{slug:string}>};
export async function generateMetadata({params}:Props):Promise<Metadata> {
 const result=await getPublicClub((await params).slug);
 if(!result) return {title:"Clube não encontrado",robots:{index:false,follow:false}};
 const title=result.club.name,description=result.settings.description.trim().slice(0,160) || `${title}: ${sportLabel(result.club.primary_sport)} em ${result.club.city}, ${result.club.state}.`;
 const canonical=new URL(`/clubes/${result.club.slug}`,appOrigin()).href;
 return {title,description,alternates:{canonical},openGraph:{title,description,url:canonical,type:"website",locale:"pt_BR"}};
}
export default async function ClubSite({params}:Props) {
 await connection();
 const result=await getPublicClub((await params).slug);
 if(!result) notFound();
 const {club,settings}=result;
 const primary=safeColor(settings.primary_color),secondary=safeColor(settings.secondary_color,"#ffffff");
 const theme={"--club-primary":primary,"--club-primary-ink":contrastInk(primary),"--club-secondary":secondary,"--club-secondary-ink":contrastInk(secondary)} as CSSProperties;
 const links=([["Site oficial",settings.website_url],["Instagram",settings.instagram_url],["Facebook",settings.facebook_url]] as const).map(([label,value])=>({label,url:safeExternalLink(value)})).filter(link=>link.url);
 const telephone=phoneLink(settings.public_phone);
 const contact=!!(settings.public_email || settings.public_phone || links.length);
 return <article className="public-club" style={theme}>
   <Link href="/clubes" className="public-back">Todos os clubes</Link>
   <section className="public-club-heading" aria-labelledby="club-name">
    {settings.logo_path && <Image unoptimized src={`/clubes/${club.slug}/imagens/logo`} alt={`Logo de ${club.name}`} width={120} height={120} className="public-club-logo"/>}
    <div><h1 id="club-name">{club.name}</h1><p>{sportLabel(club.primary_sport)} · {club.city}, {club.state}</p><nav aria-label="Nesta página">{settings.description && <a href="#sobre">Sobre o clube</a>}{contact && <a href="#contato">Contato e redes</a>}</nav></div>
   </section>
   {settings.cover_path && <Image unoptimized src={`/clubes/${club.slug}/imagens/cover`} alt={`Capa de ${club.name}`} width={1080} height={360} className="public-club-cover"/>}
   <div className="public-club-content">
    {settings.description && <section id="sobre"><h2>Sobre o clube</h2><p className="club-description">{settings.description}</p></section>}
    {contact && <section id="contato"><h2>Contato e redes</h2><ul className="public-contact-list">
     {settings.public_email && <li><span>E-mail</span><a href={`mailto:${encodeURIComponent(settings.public_email)}`}>{settings.public_email}</a></li>}
     {settings.public_phone && <li><span>Telefone</span>{telephone ? <a href={telephone}>{settings.public_phone}</a> : <span>{settings.public_phone}</span>}</li>}
     {links.map(link=><li key={link.label}><a href={link.url!} target="_blank" rel="noopener noreferrer">{link.label}<span className="sr-only"> (abre em nova aba)</span></a></li>)}
    </ul></section>}
    {!settings.description && !contact && <p className="public-empty">A apresentação e os contatos deste clube ainda não foram publicados.</p>}
   </div>
 </article>;
}
