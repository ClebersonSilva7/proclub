# Etapa 04 — administração global de clubes

## Revisão anterior

Worktree limpo antes desta entrega; branch criada sobre 062d00e da Etapa 03. PRs anteriores continuam sem merge. CI Quality #10 da Etapa 03 aprovado, inclusive build padrão e PostgreSQL nativo. Cadastro e confirmação de e-mail foram comprovados pelo usuário e pelo estado da conta. A recuperação por e-mail não está declarada concluída: o usuário optou por aguardar o limite do SMTP padrão. Esta pendência operacional não foi ocultada nem contornada desabilitando confirmação ou limites. A administração fica em PR separado, sem liberação para produção.

## Escopo implementado

- `/admin`: listagem real, busca por nome, filtro por situação e paginação de 20 clubes.
- `/admin/clubes/novo`: cadastro em rascunho com configurações criadas atomicamente pelo trigger da fundação.
- `/admin/clubes/[id]`: edição de nome, modalidade, cidade, UF e situação; slug permanente.
- Vínculos administrativos com contas já cadastradas e confirmadas, usando e-mail exato. Papéis owner, manager e staff; ativação, alteração e revogação. Não envia convites nem cria contas de terceiros.
- Motivo obrigatório e ator derivado de auth.uid na auditoria de cada operação realizada pelas RPCs. Não existe promoção a administrador global pela interface.
- Autorização repetida no servidor e no banco. POST com origem validada e corpo limitado a 8 KiB; entradas Zod; mensagens de erro sem detalhes internos do provedor.
- Conflitos de edição de clube e de vínculo rejeitados por comparação de versão/valores anteriores; bloqueio da linha do clube serializa alterações de responsáveis.

## Regras e exposição

Novos clubes começam em draft. Transições: draft → active/archived; active → suspended/archived; suspended → active/archived. Ativar exige owner ativo. Não é possível remover ou rebaixar o último owner ativo de um clube ativo. A suspensão bloqueia o acesso dos gestores e pode ser revertida. Arquivar é definitivo nesta entrega; RPCs recusam mudanças e trigger impede atualização direta dos metadados do clube arquivado.

Metadados e configurações de clubes ativos continuam públicos conforme DATABASE.md. Vínculos e e-mails de equipe são privados; a função de listagem exige administrador global e retorna somente identificador, e-mail, papel e situação do clube solicitado. Profiles continuam privados, inclusive para administradores globais. A interface não lista auth.users nem expõe tokens. Credenciais service_role não são usadas pela aplicação.

As funções públicas são SECURITY INVOKER; implementações privilegiadas ficam em private com search_path vazio, tabelas qualificadas e EXECUTE explícito somente para authenticated. A implementação verifica o administrador e sua conta confirmada, não anônima, não excluída e não banida. Helpers de autorização/auditoria e triggers não podem ser executados diretamente por papéis da API. Grants diretos da fundação não foram ampliados. A auditoria não é exposta pela API.

## Migrações e desenvolvimento

Aplicadas somente ao projeto de desenvolvimento emjoizihrwffoqewapig:

1. 20261017004042_platform_club_administration.sql
2. 20261017004623_protect_archived_clubs.sql

Arquivos criados pela CLI e sincronizados com as versões atribuídas pelo conector ao aplicar. Tipos regenerados do banco; a nulabilidade dos parâmetros opcionais das RPCs foi corrigida no arquivo porque o gerador não representa null em argumentos SQL. Reaplicar esta correção após regenerações. Configuração, aplicação em outros ambientes e comando de testes: DATABASE.md. Não executar seed ou teste destrutivo contra dados reais.

## Verificações

Lint, TypeScript, 28 unitários, build Webpack e 24 cenários SQL (25 resultados com agregador) aprovados localmente. Testes SQL usam PostgreSQL real via PGlite e rodam também no PostgreSQL nativo do CI. Incluem isolamento Azul/Vermelho, promoção indevida, RPCs por não administradores, auditoria com ator forjado, ativação sem responsável, proteção do último responsável, versões desatualizadas e tentativa de alterar clube arquivado por atualização direta.

Jornadas Playwright públicas e opt-in remotas testam contas sintéticas. A nova jornada executa cadastro, rejeição de ativação prematura, atribuição de responsável, ativação, acesso do gestor, POST administrativo não autorizado, proteção do último responsável, suspensão e arquivamento em desktop e celular. Dados sintéticos são mantidos por solicitação do usuário; clubes concluídos pelo teste ficam arquivados. Suíte final: 26 jornadas aprovadas, incluindo as duas jornadas de callback PKCE com Auth real e códigos sintéticos (sem entrega de e-mail). Resultados do CI registrados no PR desta etapa.

Capturas de lista, cadastro e detalhe/equipe nos tamanhos 1440px e 390px em .impeccable/review (ignoradas). Nenhuma rolagem horizontal detectada. Detector Impeccable indisponível por falta do engine no cache; revisão independente conferiu as seis capturas e marcou como resolvida a atualização documental solicitada, com disposição ship nesse escopo. Não equivalem a identidade visual final.

Advisors de segurança do Supabase: aviso preexistente de [proteção contra senhas vazadas desativada](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) e informação de [RLS sem política](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) em private.permission_audit (negação intencional, sem grants de API). Nenhuma dessas configurações foi enfraquecida para realizar os testes. Advisor de desempenho mostrou somente índice club_fans_user_idx ainda sem uso no ambiente sintético; preservado para as consultas previstas, sem remoção baseada em amostra vazia.

## Limites

Sem SMTP personalizado, convites, gestão de administradores globais na interface, uploads/identidade do clube, pagamentos ou implantação. A gestão do clube em /gestao continua sendo a entrada protegida da etapa anterior; o painel operacional do clube é a Etapa 05. A auditoria da Etapa 04 cobre operações das RPCs; concessões diretas de metadados herdadas da fundação continuam sob RLS. Nenhuma conta real foi promovida ou teve sua senha alterada.

Branch feat/etapa-04-administracao, PR baseado na branch da Etapa 03. Sem merge ou produção.
