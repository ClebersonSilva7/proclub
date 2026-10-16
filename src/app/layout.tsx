import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
export const metadata: Metadata = { title: { default: "ProClub", template: "%s | ProClub" }, description: "Plataforma de gestão e relacionamento para clubes esportivos." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
 return <html lang="pt-BR"><body><a className="skip" href="#conteudo">Pular para o conteúdo</a><header><Link href="/" className="brand">ProClub</Link><nav aria-label="Navegação principal"><Link href="/">Início</Link><Link href="/admin">Painel inicial</Link></nav></header><main id="conteudo">{children}</main><footer>ProClub · Ambiente de desenvolvimento</footer></body></html>;
}
