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
As Etapas 01/02 fornecem a base técnica e de dados. A Etapa 03 adiciona formulários de autenticação e sessão Supabase SSR. `/admin`, `/fan` e `/gestao/[slug]` agora exigem autenticação e autorização no servidor. A Etapa 04 implementa administração global de clubes e vínculos auditados. A Etapa 05 acrescenta a gestão da identidade do clube. Não há módulos financeiros.
`/api/health` indica que o processo HTTP responde; não verifica banco nem serviços externos.

## Estrutura
`src/app`: rotas e layouts; `src/modules`: domínios; `src/components`: UI compartilhada; `src/lib`: utilidades e infraestrutura; `supabase`: migrações e configuração local; `docs`: decisões e requisitos; `tests`: testes.

## Etapa 02
As seis entidades fundamentais estão modeladas em migração versionada, com constraints, índices, grants por coluna, RLS e auditoria de privilégios. Veja [modelo e matriz de acesso](docs/DATABASE.md) e [execução local e migrações](supabase/README.md). Migrações aplicadas e isolamento validado no Supabase de desenvolvimento confirmado pelo usuário; a aplicação utiliza conexões autenticadas do Supabase na Etapa 03.

## Etapa 03
Login, cadastro, recuperação e troca de senha, callback PKCE, sessão por cookies HttpOnly e rotas protegidas. Veja [configuração e limites](docs/AUTHENTICATION.md) e [registro da entrega](docs/ETAPA_03.md). Entrega dos e-mails depende das configurações de Auth/SMTP e de verificação com destinatário autorizado.

## Etapa 04
Administração global de clubes e vínculos auditados em `/admin`. Escopo, validação e limites em [docs/ETAPA_04.md](docs/ETAPA_04.md). Testes automatizados incluem dados sintéticos e callback PKCE real, sem equivaler à entrega do e-mail.

## Etapa 05
Painel do clube para dados públicos, contatos, cores, logo e capa, com Storage privado e autorização por clube. [Escopo e validação](docs/ETAPA_05.md).

## Etapa 06
Diretório em `/clubes` e site em `/clubes/[slug]`, com apresentação, identidade e contatos públicos de clubes ativos. Somente imagens atuais são públicas; versões antigas permanecem privadas. [Escopo e validação](docs/ETAPA_06.md).

## Próxima entrega
Etapa 07: torcedores e Fan ID. Recuperação pelo percurso de e-mail continua pendência operacional do SMTP padrão antes de liberação real. PRs permanecem sem merge automático.
