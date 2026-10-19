import Link from "next/link";
import {connection} from "next/server";
import {listPublicClubs} from "@/modules/club-site/data";
import {sportLabel} from "@/modules/club-site/presentation";
export const metadata={title:"Clubes",description:"Conheça os clubes e encontre seus contatos oficiais no ProClub."};
export default async function Clubs({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
 await connection();const params=await searchParams;
 const search=typeof params.q==="string" ? params.q.trim().slice(0,120) : "";
 const raw=Number(params.pagina),page=Number.isSafeInteger(raw)&&raw>0&&raw<=10000 ? raw : 1;
 const {clubs,count,unavailable}=await listPublicClubs(search,page);
 const href=(p:number)=>`/clubes?${new URLSearchParams({q:search,pagina:String(p)})}`;
 return <><h1>Clubes</h1><p>Conheça os clubes, suas histórias e os canais oficiais de contato.</p><form method="get" className="admin-filters"><div className="field"><label htmlFor="club-search">Buscar clube por nome</label><input id="club-search" name="q" maxLength={120} defaultValue={search}/></div><button type="submit" className="admin-action">Buscar clubes</button>{search && <Link href="/clubes">Limpar busca</Link>}</form>
 {unavailable ? <p role="status" className="form-message">Não foi possível carregar os clubes agora. Tente novamente em instantes.</p> : <><p role="status">{count} clube(s) encontrado(s).</p>{clubs.length ? <ul className="club-list public-directory">{clubs.map(club=><li key={club.slug}><div><Link href={`/clubes/${club.slug}`}>{club.name}</Link><span>{sportLabel(club.primary_sport)} · {club.city}, {club.state}</span></div></li>)}</ul> : <p className="public-empty">Nenhum clube encontrado. Tente outro nome ou volte mais tarde.</p>}<nav aria-label="Páginas de clubes">{page>1&&<Link href={href(page-1)}>Anterior</Link>}{page*20<count&&<Link href={href(page+1)}>Próxima</Link>}</nav></>}
 </>;
}
