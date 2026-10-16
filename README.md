# ProClub
SaaS multi-clubes para gestão e relacionamento com torcedores, inicialmente voltado ao vôlei.

## Desenvolvimento
Node.js 24 (arquivo .nvmrc) e npm. Execute `npm ci`, copie `.env.example` para `.env.local` quando conectar Supabase e rode `npm run dev`. Abra http://localhost:3000.

## Comandos
- `npm run lint`: análise estática.
- `npm run typecheck`: tipos TypeScript.
- `npm test`: testes unitários.
- `npm run test:db`: testes SQL reais de autorização/isolamento em PostgreSQL em memória; também executados no CI em PostgreSQL 17 nativo.
- `npm run build`: compilação de produção.
- `npm run check`: conjunto das quatro verificações.
- `npx playwright install chromium` e `npm run test:e2e`: jornadas desktop/mobile; requer build prévio.

## Entrega atual
Etapa 01: Next.js App Router, TypeScript estrito, Tailwind, configuração shadcn/ui e botão base com Radix, estrutura modular, layout inicial em português, tratamento de erro/404/carregamento, endpoint de liveness e CI.
As rotas `/`, `/admin` e `/login` são estruturas públicas sem dados privados. Não há autenticação nem conexão da aplicação com banco. A Etapa 02 adiciona migração SQL, autorização por RLS/grants e testes; não há funcionalidades comerciais implementadas.
`/api/health` indica que o processo HTTP responde; não verifica banco nem serviços externos.

## Estrutura
`src/app`: rotas e layouts; `src/modules`: domínios; `src/components`: UI compartilhada; `src/lib`: utilidades e infraestrutura; `supabase`: migrações e configuração local; `docs`: decisões e requisitos; `tests`: testes.

## Etapa 02
As seis entidades fundamentais estão modeladas em migração versionada, com constraints, índices, grants por coluna, RLS e auditoria de privilégios. Veja [modelo e matriz de acesso](docs/DATABASE.md) e [execução local e migrações](supabase/README.md). Não foi aplicada migração remota.

## Próxima entrega
Confirmar o ambiente Supabase de desenvolvimento, aplicar a migração revisada e implementar autenticação e autorização no servidor (Etapa 03). PR #1 da fundação permanece independente, sem merge automático.
