import Link from "next/link";
import { requirePlatformAdmin } from "@/modules/identity/access";
import { ClubForm } from "@/modules/platform/forms";
import { messages } from "@/modules/platform/validation";
export const metadata = {title:"Novo clube"};
export default async function NewClub({searchParams}:{searchParams:Promise<{status?:string}>}) {
  await requirePlatformAdmin();
  const status = (await searchParams).status;
  return <section className="admin-editor"><Link href="/admin">← Clubes</Link><h1>Novo clube</h1><p>O clube começa em rascunho. Depois do cadastro, adicione um responsável antes de ativá-lo.</p>{status && messages[status] && <p role="alert" className="form-message">{messages[status]}</p>}<ClubForm/></section>;
}
