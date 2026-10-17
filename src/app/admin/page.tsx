import Link from "next/link";
import { requirePlatformAdmin } from "@/modules/identity/access";
import { Logout } from "@/modules/identity/logout";
import { statuses } from "@/modules/platform/validation";
export const metadata = { title: "Administração ProClub" };
export default async function Admin({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const {supabase} = await requirePlatformAdmin();
  const params = await searchParams;
  const search = typeof params.q === "string" ? params.q.slice(0,120).replace(/[%_]/g, "") : "";
  const status = typeof params.situacao === "string" && Object.hasOwn(statuses,params.situacao) ? params.situacao : "";
  const rawPage = Number(params.pagina);
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 && rawPage < 100000 ? rawPage : 1;
  let query = supabase.from("clubs").select("id,name,slug,city,state,status", {count:"exact"}).order("name").order("id").range((page-1)*20,page*20-1);
  if (search) query = query.ilike("name",`%${search}%`);
  if (status) query = query.eq("status",status);
  const {data:clubs,error,count} = await query;
  if (error) throw new Error("Não foi possível carregar os clubes.");
  const href = (p:number) => `/admin?${new URLSearchParams({q:search,situacao:status,pagina:String(p)})}`;
  return <><div className="admin-heading"><div><h1>Clubes</h1><p>Administração ProClub · cadastro e acessos dos clubes.</p></div><Link className="admin-action" href="/admin/clubes/novo">Novo clube</Link></div>
    <form className="admin-filters" method="get"><div className="field"><label htmlFor="q">Buscar por nome</label><input id="q" name="q" maxLength={120} defaultValue={search}/></div><div className="field"><label htmlFor="situacao">Situação</label><select id="situacao" name="situacao" defaultValue={status}><option value="">Todas</option>{Object.entries(statuses).map(([s,label])=><option key={s} value={s}>{label}</option>)}</select></div><button className="admin-action" type="submit">Filtrar clubes</button><Link href="/admin">Limpar filtros</Link></form>
    <p role="status">{count ?? 0} clube(s) encontrado(s).</p>
    {clubs?.length ? <ul className="club-list">{clubs.map(c=><li key={c.id}><div><Link href={`/admin/clubes/${c.id}`}>{c.name}</Link><span>{c.city} · {c.state} · {c.slug}</span></div><span className="club-status">{statuses[c.status as keyof typeof statuses]}</span></li>)}</ul> : <p className="form-message">Nenhum clube nesta busca. Ajuste os filtros ou cadastre um clube.</p>}
    <nav aria-label="Páginas de clubes">{page>1 && <Link href={href(page-1)}>Anterior</Link>}{page*20<(count ?? 0) && <Link href={href(page+1)}>Próxima</Link>}</nav><Logout/></>;
}
