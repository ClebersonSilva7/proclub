# Etapa 02 — fundação de dados multi-tenant

## Fontes consultadas

Em 16/10/2026 foi recuperada a conversa “Estrutura de Desenvolvimento”, contendo planejamento de PRD, arquitetura e roadmap, além do registro da fundação no Codex (chat 01a146fb-79f3-7761-86d0-3dd9d46b803d). Os arquivos Word anexados à conversa não foram baixados nem importados. PRD.md e ARCHITECTURE.md continuam sendo sínteses e não documentos integrais aprovados.

A pasta local estava vazia; foi clonado o repositório na branch feat/etapa-01-fundacao, commit 9635312. Não havia alterações locais a preservar. main ainda estava em c2a9ff0. PR #1 aberto, sem merge. Workflow Quality #2 (run 38980501439) aprovado, incluindo lint, tipos, unitário, build e Playwright desktop/mobile. A implementação real foi inspecionada: páginas públicas demonstrativas, sem login nem dados privados.

## Entrega

Migração SQL com clubs, club_settings, profiles, club_staff, club_fans e platform_admins; auditoria privada de mudanças de permissões; constraints, índices, grants por coluna, funções protegidas e RLS. Matriz de acesso, campos, estados e regras de exclusão em DATABASE.md. Setup e operação em supabase/README.md.

Suíte autônoma de autorização executa a migração real em PostgreSQL PGlite e em PostgreSQL 17.11 nativo no CI, com dados sintéticos. A aplicação não ganhou conexão ao banco, login, convites ou painel protegido. Nenhum módulo comercial foi iniciado.

## Validação local

- Suíte SQL: 19 cenários (20 resultados contando o teste agregador), aprovados em PGlite.
- Lint, tipos e teste unitário: aprovados.
- Build padrão com Turbopack: bloqueado pelo ambiente local ao abrir porta para processamento CSS (EPERM), inclusive após tentativa fora do sandbox.
- Build alternativo `next build --webpack`: aprovado. O script de build padrão e o CI continuam usando Turbopack.
- Playwright desktop/mobile: quatro jornadas aprovadas localmente após instalação do Chromium.
- Aguardar resultado do CI desta branch para confirmação do PostgreSQL nativo e build padrão.

## Limites e pendências

Projeto remoto ProClub emjoizihrwffoqewapig inicialmente vazio. Após confirmação explícita do usuário de uso exclusivo para desenvolvimento, as duas migrações foram aplicadas via MCP. Arquivos locais sincronizados com as versões registradas remotamente (20261016233110 e 20261016233308), sem modificar o SQL aplicado. Smoke SQL real aprovado, com rollback de todos os dados sintéticos e contagens finais zero em clubs/profiles/staff/auditoria. Não foram solicitadas nem inventadas credenciais.

Sem Docker/psql disponíveis localmente, a stack completa Supabase e os advisors locais não foram executados. Advisors remotos executados; políticas SELECT duplicadas foram consolidadas em segunda migração. Restam apenas avisos informativos de índices ainda não usados e RLS sem política no log privado (negação de acesso intencional). Veja [RLS sem política](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) e [índices sem uso](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index). Testes de banco representam auth.uid/auth.users no bootstrap; não verificam JWT por HTTP, GoTrue ou PostgREST. Storage não configurado. Integração completa com Supabase Auth e autorização de operações Next.js é Etapa 03.

`npm audit` reportou cinco entradas high na cadeia de ferramentas eslint-config-next → fast-glob/micromatch/braces (GHSA-vfj7-8cjw-p6xm). Não foi aplicado o downgrade incompatível de Next sugerido automaticamente; acompanhar correção upstream. Não se trata de dependência de execução da aplicação.

PR da Etapa 02 deve ter base feat/etapa-01-fundacao enquanto PR #1 estiver aberto, para revisão exclusiva das mudanças de banco. Nenhum merge ou implantação autorizado/executado.

Inspeção visual da home em 1440×1000 e 390×844 concluída: estrutura responsiva sem corte horizontal. Identificado contraste baixo no texto do CTA, pendência de interface sem impacto no isolamento de dados; identidade definitiva continua fora desta entrega.

O primeiro CI desta branch detectou dependências opcionais em falta no lockfile Linux. Lockfile regenerado com npm 12 em diretório limpo para corrigir instalação reproduzível.
