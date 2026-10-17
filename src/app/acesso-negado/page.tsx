import Link from "next/link";
export const metadata = { title: "Acesso não autorizado" };
export default function Denied() {
  return (
    <>
      <h1>Acesso não autorizado</h1>
      <p>Sua conta não possui permissão para acessar esta área.</p>
      <Link href="/fan">Voltar para minha conta</Link>
    </>
  );
}
