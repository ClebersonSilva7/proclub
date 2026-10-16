# ProClub
SaaS multi-clubes para gestão e relacionamento com torcedores, inicialmente voltado ao vôlei.

## Desenvolvimento
Node.js 24 (arquivo .nvmrc) e npm. Execute `npm ci`, copie `.env.example` para `.env.local` quando conectar Supabase e rode `npm run dev`. Abra http://localhost:3000.

## Comandos
- `npm run lint`: análise estática.
- `npm run typecheck`: tipos TypeScript.
- `npm test`: testes unitários.
- `npm run build`: compilação de produção.
- `npm run check`: conjunto das quatro verificações.
- `npx playwright install chromium` e `npm run test:e2e`: jornadas desktop/mobile; requer build prévio.

## Entrega atual
Etapa 01: Next.js App Router, TypeScript estrito, Tailwind, configuração shadcn/ui e botão base com Radix, estrutura modular, layout inicial em português, tratamento de erro/404/carregamento, endpoint de liveness e CI.
As rotas `/`, `/admin` e `/login` são estruturas públicas sem dados privados. Não há autenticação, banco, autorização ou funcionalidades comerciais implementadas.
`/api/health` indica que o processo HTTP responde; não verifica banco nem serviços externos.

## Estrutura
`src/app`: rotas e layouts; `src/modules`: domínios; `src/components`: UI compartilhada; `src/lib`: utilidades e infraestrutura; `supabase`: futuras migrações; `docs`: decisões e requisitos; `tests`: testes.

## Próxima entrega
Modelar clubs, club_settings, profiles, club_staff, club_fans e platform_admins, com constraints, RLS e testes de isolamento. Conectar um projeto Supabase de desenvolvimento antes da autenticação.
