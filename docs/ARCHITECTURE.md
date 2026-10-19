# Arquitetura
Monólito modular: Next.js App Router + TypeScript, Tailwind/shadcn, Supabase Auth/PostgreSQL/Storage; hospedagem prevista em Vercel.
Banco compartilhado com club_id e isolamento por RLS. Autorizações verificadas no servidor; plataforma e colaboradores em tabelas distintas. Um usuário pode gerir vários clubes.
Rotas previstas: /, /login, /clubes/[slug], /fan, /admin, /gestao/[slug]. As Etapas 01–06 implementam a fundação, dados/RLS, autenticação, administração, identidade e site público; registros de implementação e limites estão em ETAPA_01.md a ETAPA_06.md.
Separar licença SaaS clube→ProClub de associação torcedor→clube. Recebimento direto pelo clube, sem repasses próprios no MVP; gateway ainda pendente de validação.
Finanças: ciclos, tentativas de pagamento, eventos idempotentes, estornos, snapshot contratual, outbox e reconciliação. Nunca ativar assinatura pelo navegador.
Ambientes de desenvolvimento, homologação e produção devem ter credenciais e bancos separados.
Este documento resume a arquitetura fornecida, não substitui sua versão integral aprovada.
