# Arquitetura
Monólito modular: Next.js App Router + TypeScript, Tailwind/shadcn, Supabase Auth/PostgreSQL/Storage; hospedagem prevista em Vercel.
Banco compartilhado com club_id e isolamento por RLS. Autorizações verificadas no servidor; plataforma e colaboradores em tabelas distintas. Um usuário pode gerir vários clubes.
Rotas previstas: /, /login, /clubes/[slug], /fan, /admin, /gestao/[slug]. Apenas estruturas iniciais públicas existem agora.
Separar licença SaaS clube→ProClub de associação torcedor→clube. Recebimento direto pelo clube, sem repasses próprios no MVP; gateway ainda pendente de validação.
Finanças: ciclos, tentativas de pagamento, eventos idempotentes, estornos, snapshot contratual, outbox e reconciliação. Nunca ativar assinatura pelo navegador.
Ambientes de desenvolvimento, homologação e produção devem ter credenciais e bancos separados.
Este documento resume a arquitetura fornecida, não substitui sua versão integral aprovada.
