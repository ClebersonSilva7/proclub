import type { Metadata } from "next";
export const metadata: Metadata = { title: "Painel inicial" };
export default function Admin() { return <><h1>Painel inicial</h1><p>Estrutura demonstrativa pública, sem dados administrativos. A autenticação e as permissões serão implementadas antes da gestão de clubes.</p><section aria-labelledby="clubes"><h2 id="clubes">Clubes</h2><p>Nenhum clube conectado. O cadastro será disponibilizado após a configuração do banco e das políticas de acesso.</p></section></>; }
