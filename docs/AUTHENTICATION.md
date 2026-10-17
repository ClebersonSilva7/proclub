# Autenticação e acesso — Etapa 03

## Escopo implementado

- `/login`, `/cadastro`, `/recuperar-senha` e `/redefinir-senha`: formulários com rótulos, autocomplete, validação no navegador e validação Zod no servidor, estado de envio e mensagens em português.
- POST `/auth/login`, `/auth/signup`, `/auth/recover`, `/auth/password` e `/auth/logout`: operações de Auth somente no servidor, validação estrita de Origin contra APP_URL, limite de corpo de 8 KiB, redirecionamento permitido somente para destinos internos definidos.
- GET `/auth/callback`: troca de código PKCE por sessão; requer o verificador no mesmo navegador. Não aceita tokens enviados pelo cliente nem URL arbitrária como destino.
- Supabase SSR com cookies HttpOnly, SameSite=Lax e Secure em HTTPS. Não há SDK de autenticação no navegador nem tokens no localStorage. Proxy atualiza sessão e propaga cookies para request/response; **não concede autorização**.
- Cada página protegida chama `getUser()` no servidor. Não se usa getSession, user_metadata nem role do formulário para decidir acesso.
- `/fan`: conta básica, dados do próprio usuário, links para acessos de gestão autorizados e saída. Não implementa associação, Fan ID visual ou edição de perfil.
- `/admin`: exige vínculo em platform_admins. `/gestao/[slug]`: exige administrador global ou owner/manager ativo do clube ativo. Staff sem permissão de gestão é recusado. Os painéis são apenas entradas protegidas; ferramentas ficam nas etapas 04/05.
- Perfil mínimo criado ao concluir login/callback, usando somente o UUID verificado pelo Auth. Cadastro não atribui clubes ou privilégios. Não há convites nem promoção de usuários pela API.

## Configuração

Execute `npm ci`, preencha `.env.local` a partir de `.env.example` e rode `npm run dev`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
APP_URL=http://127.0.0.1:3000
```

APP_URL é uma origem canônica definida pelo operador, nunca derivada de Host/X-Forwarded-Host do cliente. Fora de localhost/127.0.0.1, exige HTTPS. Acesse exatamente a mesma origem no navegador; localhost e 127.0.0.1 não são intercambiáveis para cookies, Origin e PKCE. O CI usa configuração sintética sem conta remota para seus testes públicos.

No Supabase de **desenvolvimento**, os dois retornos exatos abaixo foram cadastrados após autorização explícita do usuário e conferidos no painel na [configuração de URLs](https://supabase.com/dashboard/project/emjoizihrwffoqewapig/auth/url-configuration):

- `http://127.0.0.1:3000/auth/callback`
- `http://127.0.0.1:3000/auth/callback?next=/redefinir-senha`

O painel confirmou SMTP personalizado desativado; portanto, o projeto usa as limitações do SMTP padrão. A configuração pública consultada confirmou email habilitado, cadastro habilitado e confirmação de e-mail exigida. Não foi desabilitada confirmação para facilitar testes. Em homologação/produção, usar projetos, chaves, APP_URL e retornos próprios, sem wildcards amplos.

A confirmação de cadastro e a recuperação usam o link padrão do Supabase, que valida o token e retorna um código PKCE ao callback. Abra o link no mesmo navegador onde iniciou o pedido. Link expirado ou sem verificador pede nova solicitação. Não alterar templates para retornar tokens em fragmentos à aplicação: este fluxo não lê sessão do navegador.

Configurar e testar SMTP/remetente no [painel Auth SMTP](https://supabase.com/dashboard/project/emjoizihrwffoqewapig/auth/smtp) antes de disponibilizar cadastro para torcedores reais. O [SMTP padrão do Supabase](https://supabase.com/docs/guides/auth/auth-smtp) restringe destinatários a membros autorizados da equipe. A presença de email habilitado não comprova SMTP customizado nem entrega de mensagens. Credenciais SMTP ficam no provedor/Supabase, nunca no repositório ou cliente. Nenhum e-mail foi enviado a pessoas durante os testes automatizados.

## Segurança e limites

Senhas novas de 12 a 72 caracteres; nenhuma senha é armazenada pelo ProClub. Limites de Auth do Supabase continuam ativos. Mensagem de recuperação é igual para conta existente/inexistente. Respostas não incluem erros internos, senha, tokens ou metadados privados.

Trocar senha exige usuário verificado; após a alteração há saída global. Logout revoga refresh sessions e remove cookies do navegador; access tokens já emitidos podem permanecer válidos até expirar. Definir política de expiração/reautenticação para futuras operações sensíveis e não confundir logout com revogação instantânea de todos os JWTs. Mudanças em club_staff/platform_admins são consultadas no banco a cada acesso, sem role congelada em JWT.

A matriz RLS/grants da Etapa 02 permanece como segunda barreira. Não foi necessária nova migração. Proteção de uma página não autoriza futuras APIs: cada Route Handler/ação de negócio deverá repetir autenticação e autorização no servidor. Não há endpoint de convite, escrita administrativa ou dados financeiros nesta etapa.

## Testes

- `npm test`: validações, anti-open-redirect, Origin, fluxo dos handlers e guards com SDK isolado em testes unitários; esses mocks não substituem testes reais de Auth/RLS.
- `npm run test:db`: migrações e 19 cenários reais de grants/RLS em PGlite; também PostgreSQL 17 no CI.
- `npm run test:e2e`: páginas públicas, bloqueio de rotas anônimas, validação, CSRF e callback inválido em desktop/mobile.
- `tests/e2e/auth-live.spec.ts`: opt-in com contas **sintéticas temporárias de desenvolvimento**. Variáveis E2E_PASSWORD, E2E_FAN_EMAIL, E2E_MANAGER_EMAIL, E2E_ADMIN_EMAIL, E2E_STAFF_EMAIL em arquivo local ignorado. Não usar contas pessoais. Runner usa um worker para evitar que logout global de um viewport invalide sessão simultânea do outro. Inclui login real, persistência, cookies, troca de senha via HTTP com retorno à senha sintética inicial, saída global e bloqueio entre clubes/papéis. Fixtures requerem operador SQL auditado; remover ao terminar. Não executa automaticamente contra remoto no CI.

Entrega de e-mail e percurso do link recebido não são cobertos pela suíte de login real. Precisam de validação com um destinatário autorizado após configuração de URLs/SMTP; não declarar aprovados sem evidência.

Para repetir a integração: `node tests/fixtures/auth-development.mjs` gera SQL sintético em supabase/.temp/auth-e2e-fixture.sql e senha aleatória em .env.e2e.local, ambos ignorados. Aplicar esse SQL manualmente **somente no desenvolvimento**. Executar `node --env-file=.env.e2e.local node_modules/@playwright/test/cli.js test`. Ao terminar, aplicar supabase/tests/auth_e2e_cleanup.sql, conferir ausência das contas/clubes sintéticos e remover os dois arquivos locais gerados. A auditoria de concessão e remoção de permissões é preservada. A geração não desabilita confirmação de e-mail do produto; somente as contas de teste são provisionadas como confirmadas, sem enviar e-mail.
