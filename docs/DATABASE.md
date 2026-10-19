# Banco de dados — Etapa 02

A migração em `supabase/migrations` implementa seis entidades. Os nomes e estados abaixo são decisões desta entrega; PRD.md e ARCHITECTURE.md continuam sendo sínteses. A Etapa 03 adiciona login e consultas autenticadas da aplicação; as regras de banco abaixo permanecem vigentes.

## Campos, relações e exclusão

| Entidade | Campos e regras | Exclusão |
| --- | --- | --- |
| clubs | UUID gerado; name 2–120; slug único, minúsculo, 2–80, letras/números/hífens; primary_sport 2–60 (volleyball inicialmente); city 2–120; state UF brasileira; status draft/active/suspended/archived; created_at/updated_at | Operador privilegiado; staff existente impede exclusão; settings/fans removidos em cascata. Preferir archived. |
| club_settings | PK/FK club_id, exatamente uma configuração criada por trigger por clube; cores hex; logo_path/cover_path opcionais sob prefixo UUID do clube; description até 5000; public_email/public_phone; website_url/instagram_url/facebook_url HTTPS; updated_at | Cascata do clube; API não pode excluir nem trocar club_id. |
| profiles | PK/FK id = auth.users.id; display_name até 120; avatar_path opcional sob UUID do usuário; created_at/updated_at | Cascata de auth.users, bloqueada enquanto houver staff/admin. Sem senha própria ou cópia de e-mail. |
| club_staff | PK (club_id,user_id), FKs clube/perfil; role owner/manager/staff; status active/revoked; created_at/updated_at | RESTRICT para clube/perfil. Remoção explícita, privilegiada e auditada antes de excluir conta/clube. |
| club_fans | PK (club_id,user_id); fan_id UUID opaco único; status active/left; created_at/updated_at | Cascata de clube/perfil; API altera apenas seu próprio status. Não é contrato de associação. |
| platform_admins | PK/FK user_id; created_at; privilégio global sem role vindo do JWT | RESTRICT no perfil. Inclusão/remoção somente SQL privilegiado, com auditoria obrigatória. |

`updated_at` é mantido por trigger. Slug, IDs, status do clube e timestamps não são editáveis pelo cliente. `fan_id` representa apenas o vínculo gratuito; não é QR de carteirinha contratual nem autorização de benefício. Sem conta real, plano, cobrança ou assinatura nesta entrega.

## Visibilidade e autorização

| Dado/operação | anon | Torcedor | staff | owner/manager | Administrador global |
| --- | --- | --- | --- | --- | --- |
| clubs/settings ativos | Público | Público | Público | Público | Público |
| clubs/settings não ativos | Não | Não | Não | Não | Leitura/edição de conteúdo |
| Editar conteúdo de clube ativo | Não | Não | Não | Apenas seus clubes ativos | Todos |
| Perfil | Não | Apenas próprio | Apenas próprio | Apenas próprio | Apenas próprio |
| Vínculo de torcedor | Não | Próprio; criar para si em clube ativo; alterar status próprio | Próprio | Ler vínculos de seus clubes ativos | Ler todos |
| Vínculo administrativo | Não | Próprio, se existir | Próprio | Ler equipe de seus clubes ativos | Ler todos |
| platform_admins | Não | Apenas próprio, se existir | Idem | Idem | Apenas próprio |
| Alterar privilégios | Não | Não | Não | Não | Não pela API |

Todos os campos de clubs/settings de clubes ativos são públicos, inclusive contatos explicitamente chamados `public_*`. Nunca adicionar CNPJ, documentos, contato privado ou termos SaaS nessas tabelas sem separar a superfície pública. Perfis não são expostos por junção aos gestores. A futura listagem nominal de torcedores precisará de uma projeção autorizada específica.

Os identificadores de clube enviados numa consulta não concedem acesso: políticas verificam auth.uid() contra vínculos persistidos. Nenhuma decisão usa user_metadata, role ou club_id do navegador. `staff` não tem poderes de gestão nesta etapa; permissões granulares virão depois. Suspender/arquivar clube remove poderes de seus gestores imediatamente. Um usuário pode gerir vários clubes. Vínculos revogados não autorizam gestão.

RLS habilitada em todas as tabelas públicas. Grants limitam colunas mutáveis, inclusive para impedir mudança de tenant/identidade. Helpers SECURITY DEFINER ficam em `private`, não exposto na API, com search_path vazio, nomes qualificados, auth.uid() explícito e EXECUTE somente para authenticated nos dois predicados booleanos necessários às políticas. Funções de trigger não têm EXECUTE público. Índices cobrem PKs, slug, fan_id, consultas por usuário e status; as PKs compostas também cobrem buscas por clube.

## Operação privilegiada e auditoria

`club_staff` e `platform_admins` não aceitam escrita por anon, authenticated **nem service_role**. Mesmo um administrador global autenticado não pode promover usuários. Bootstrap, revogação e transferências são operações SQL confiáveis, fora da API. Não há fluxo de convites nesta etapa. Não é permitido remover o último owner pela aplicação porque não há escrita de staff pela aplicação; uma futura API deverá definir e testar a regra de transferência.

Todo INSERT/UPDATE/DELETE nas duas tabelas exige contexto e grava `private.permission_audit` na mesma transação, com database_actor (= session_user), operator declarado, reason, horário e dados antes/depois. O operador declarado é contexto administrativo, não identidade autenticada por si só. A identidade SQL é registrada separadamente. O log não tem FK para preservar histórico após exclusão. Os papéis da API não podem lê-lo, alterá-lo ou truncá-lo. O proprietário do banco é confiável e pode alterar o esquema; a auditoria não pretende resistir ao superusuário. Retenção e exportação externa de auditoria ficam para a operação de produção.

Exemplo no SQL Editor ou conexão administrativa do **ambiente de desenvolvimento confirmado**, usando UUID de perfil existente:

```sql
begin;
set local proclub.operator = 'identificacao-do-operador';
set local proclub.reason = 'chamado ou justificativa da concessao';
insert into public.platform_admins(user_id) values ('UUID-DO-PERFIL');
-- Para revogar: delete from public.platform_admins where user_id = 'UUID-DO-PERFIL';
commit;
```

Utilize o mesmo contexto ao inserir/alterar/remover club_staff. Nunca envie credenciais SQL/service_role ao navegador. Não foram criadas funções RPC de promoção. Chaves publicáveis não substituem RLS.

## Testes

`npm run test:db` cria um PostgreSQL PGlite em memória, aplica todos os arquivos SQL e executa consultas com SET ROLE anon/authenticated/service_role e identidades sintéticas. É execução real de grants, constraints, triggers e RLS, sem mocks do mecanismo SQL. O bootstrap representa somente auth.users e auth.uid(); não simula emissão/validação HTTP de JWT ou GoTrue.

A mesma suíte roda no CI em PostgreSQL 17.11 nativo e descartável, via PROCLUB_TEST_DATABASE_URL. Há dois clubes ativos Azul/Vermelho, um rascunho auxiliar, gestores separados, gestor multi-clube, owner, staff, gestor revogado, torcedores e admin global. Testa acesso cruzado nos dois sentidos, escrita legítima, escalada, metadata forjada, mudança de IDs, privilégios de service_role, suspensão, auditoria e constraints. Banco nativo precisa estar vazio, com nome proclub_test; nunca apontar esse runner para projeto Supabase ou banco com dados.

Integração com Supabase Auth/PostgREST, Storage e autorização de rotas/ações do Next.js pertence às etapas seguintes. Não há buckets ou políticas Storage; os caminhos são apenas referências validadas.

## Evolução das Etapas 04/05

A matriz acima registra a fundação da Etapa 02. A Etapa 04 acrescentou RPCs auditadas de administração global (clubes e vínculos, sem promoção de platform_admins), proteção do último responsável e arquivamento definitivo. A Etapa 05 acrescenta RPCs SECURITY INVOKER de identidade/imagens, Storage privado por clube, versão de formulário e bloqueio de configurações arquivadas. Campos de metadados/configurações ativos continuam públicos; conteúdos do bucket permanecem privados nesta etapa, mesmo que seus caminhos constem da configuração. Regras, grants, testes e limites atuais: ETAPA_04.md e ETAPA_05.md.
