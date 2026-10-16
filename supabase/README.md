# Supabase — desenvolvimento

CLI versionada no package-lock (`npm ci`). Comandos abaixo usam `npx supabase`, instalado no projeto. Configuração local versionada usa PostgreSQL 17, expõe apenas public e exige grants explícitos. Não há vínculo remoto salvo na CLI, credenciais ou aplicação conectada. Migrações foram aplicadas no desenvolvimento pelo conector autenticado.

## Validar sem Docker ou credenciais

```sh
npm ci
npm run test:db
```

PGlite executa PostgreSQL em memória com a migração real. Para PostgreSQL nativo descartável 17, crie banco vazio `proclub_test` e forneça a conexão administrativa somente ao runner:

```sh
PROCLUB_TEST_DATABASE_URL='postgres://postgres:SENHA-LOCAL@localhost:5432/proclub_test' npm run test:db
```

A suíte cria seus próprios papéis/tabela auth de teste. Não execute contra banco Supabase real. O CI fornece esse banco isolado automaticamente.

## Stack Supabase local completa (requer Docker)

Consulte `npx supabase --help`, `npx supabase start --help`, `npx supabase db reset --help` antes de executar na versão instalada.

```sh
npx supabase start
npx supabase db reset --local
npx supabase db lint --local
npx supabase migration list --local
```

`reset --local` apaga o banco local; use apenas dados descartáveis. A CLI aplica os arquivos de supabase/migrations em ordem. Não existem seeds de pessoas reais. A suíte autônoma não deve usar essa conexão porque contém bootstrap próprio.

## Projeto remoto

Foi localizado em 16/10/2026 o projeto ProClub `emjoizihrwffoqewapig`, sem tabelas public e sem migrações. O usuário confirmou uso exclusivo de desenvolvimento. Migrações foundation_multitenant (20261016233110) e consolidate_select_policies (20261016233308) aplicadas via MCP. Os nomes locais foram sincronizados aos timestamps registrados pelo MCP, sem alterar o conteúdo SQL aplicado. Homologação e produção precisam de projetos separados.

Para futuras migrações, consultar `npx supabase link --help` e `npx supabase db push --help`; vincular explicitamente o ref confirmado, revisar o dry-run e só então executar push no desenvolvimento. Conferir a lista de migrações e advisors após aplicar. Manter alterações futuras em novas migrações (`npx supabase migration new nome`); nunca editar uma migração já aplicada. Para reversão, produzir migração corretiva; remoção das tabelas elimina dados e exige planejamento.

Para a futura aplicação, preencher URL e chave publicável em .env.local. Não há necessidade de chave secreta nesta entrega. Nunca versionar senhas, tokens ou service_role. SQL de bootstrap administrativo e matriz de acesso estão em docs/DATABASE.md.

`supabase/tests/development_smoke.sql` valida RLS no Supabase real dentro de BEGIN/ROLLBACK, com usuários e clubes sintéticos. Executado com sucesso no desenvolvimento; verificada ausência de resíduos após rollback. Requer operador SQL e ambiente exclusivo de desenvolvimento. Não valida o fluxo HTTP de login.
