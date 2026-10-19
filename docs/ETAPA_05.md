# Etapa 05 — gestão e identidade do clube

## Revisão da etapa anterior

PR #4 aberto em rascunho, sem merge; commit aa28326 e CI Quality #13 aprovados. Worktree limpo ao iniciar a branch feat/etapa-05-gestao-clube. A pendência de recuperação pelo percurso de e-mail continua registrada, sem novo envio ou alteração da conta real. PRD.md e ARCHITECTURE.md permanecem sínteses; a entrega segue o roadmap e a implementação verificada.

## Implementação

`/gestao/[slug]` agora permite ao owner/manager ativo de um clube ativo, ou administrador global, editar nome, modalidade, cidade, UF, descrição, paleta, contatos públicos e links HTTPS. Slug, status e privilégios continuam fora desse formulário. A tela identifica o clube, alerta sobre publicidade dos dados, oferece navegação por seções e prévia das cores. Não mostra métricas fictícias nem recursos comerciais.

Formulários com rótulos, limites e feedback de envio; validação Zod no servidor, Origin estrito e corpos limitados (64 KiB para identidade, 2 MiB + 8 KiB para multipart). Clube é resolvido pela rota e pela autorização, sem confiar em club_id do formulário. `club_save_identity` é SECURITY INVOKER: grava metadados e configurações atomicamente sob RLS e compara as duas versões para evitar sobrescrever formulários antigos. Erros não expõem detalhes do provedor. URLs são HTTPS, sem credenciais; descrição é texto simples.

Logo e capa: upload de PNG/JPEG/WebP até 2 MiB; extensão e caminho são gerados no servidor, conferindo MIME e assinatura inicial dos bytes. SVG recusado. Isso não constitui antivírus, decodificação completa ou processamento de imagem. Bucket privado `club-assets`, com limites próprios de tamanho e MIME. Caminhos: UUID-do-clube/logo-ou-cover/UUID-aleatório.ext. Políticas permitem somente leitura/inserção por gestores autorizados ou administrador global, excluindo clubes arquivados. Sem políticas de update/move/delete; upsert não permitido. `club_set_image` confere versão, existência do objeto e clube/tipo antes de salvar a referência.

Prévia das imagens por GET protegido em `/gestao/[slug]/imagens/[kind]`, com nova autorização, download autenticado, MIME derivado dos bytes, nosniff, CSP restritiva e cache private/no-store. Não expõe service_role, URL assinada ou arquivo ao anônimo. Usado Image unoptimized para preservar os cookies da requisição direta do navegador ao endpoint protegido.

Remover imagem retira a referência; substituições criam novas versões. Arquivos anteriores e uploads sem referência após conflito/falha de gravação são retidos. Limpeza e retenção precisam de rotina privilegiada futura, verificando referências e política de retenção, nunca DELETE SQL direto em storage.objects. Não há exclusão física nesta entrega. Dados sintéticos permanecem conforme pedido do usuário.

## Correção verificada na integração

O teste HTTP de formulário desatualizado encontrou o [problema documentado de SQLSTATE 40001 no PostgREST 14](https://supabase.com/docs/guides/troubleshooting/high-cpu-and-infinite-transaction-retries-when-using-custom-error-codes-in-rpc-functions-77326b). O código de serialização usado como conflito de negócio causava repetição indefinida; testes SQL isolados não reproduzem o comportamento da API.

Migração adicional troca esse erro por PT409 (HTTP 409), inclusive nas funções administrativas da Etapa 04. Handlers entendem ambos os códigos para compatibilidade. Somente os dois backends identificados dos testes sintéticos em repetição foram encerrados; nenhuma reinicialização do projeto ou alteração em conta real. Confirmada ausência de chamadas de identidade ainda ativas. Regressões HTTP cobrem conflitos de identidade, clube e vínculo administrativo.

## Banco e configuração

Migrações aplicadas somente ao Supabase de desenvolvimento emjoizihrwffoqewapig, com versões locais sincronizadas:

- 20261017005824_club_identity_and_assets.sql
- 20261017010247_explicit_edit_conflicts.sql

Nenhuma nova variável secreta. Tipos regenerados; correções manuais de nulabilidade SQL mantidas. Todas as funções têm search_path vazio e EXECUTE explícito. Funções novas são invokers; a correção das funções privilegiadas existentes preserva seus grants. Trigger bloqueia edição de configurações arquivadas, inclusive por atualização direta autorizada da fundação.

O runner SQL representa tabelas mínimas de storage.buckets/objects para executar as políticas reais no PostgreSQL. Não simula o serviço Storage nem seus limites; chamadas contra a API real em desenvolvimento verificam esses limites separadamente. Instalação/migrações em supabase/README.md; não apontar o runner nativo para um Supabase real.

## Validação e limites

Resultados finais ficam no PR. Testes unitários cobrem origem, campos, tenant forjado, status, versão, URL, MIME/assinatura, limite de tamanho, caminho gerado, falha de upload e remoção de referência. Suíte SQL acrescenta atomicidade, rollback, versões, isolamento de imagens, existência e tipo do objeto, usuários comuns e arquivamento. E2E testa persistência, uploads de logo/capa, prévia autenticada, remoção/substituição, conflitos e bloqueio entre clubes. Teste independente usa Storage API real com contas sintéticas de dois clubes, incluindo download cruzado/anônimo, upload cruzado, upsert/move, SVG e excesso de tamanho.

Advisors mantêm avisos preexistentes: [senhas vazadas sem proteção](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection), [RLS sem política no log privado](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) (negação intencional) e [índice ainda sem uso](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index) no ambiente sintético. Sem ampliação de acesso ao log, sem desativação de controles.

Sem site público, publicação anônima de imagens, convites por e-mail, gestão de permissões pelo clube, pagamentos ou produção. O site público personalizado é a Etapa 06. A identidade visual da plataforma permanece provisória; paletas dos clubes são conteúdo configurável e não redesenham a navegação do ProClub.

### Resultados locais finais

Lint, TypeScript, build Webpack e 36 testes unitários aprovados, sem erros não tratados. Banco: 27 cenários, 28 resultados com agregador, aprovados em PGlite. PostgreSQL 17 nativo e build padrão são executados no CI do PR.

Playwright: 26 jornadas de regressão (autenticação, páginas públicas, administração incluindo conflitos PT409 e callback sintético) aprovadas; quatro jornadas da identidade/Storage confirmadas em execução separada, desktop/mobile. O teste de imagens foi ajustado para aguardar a decodificação, em vez de consultar naturalWidth antes de o download terminar. As 30 jornadas distintas ficaram aprovadas entre regressão e confirmação; não afirmar que uma rodada única de 30 terminou sem falhas. Verificação HTTP adicional com multipart de 3 MiB confirmou redirecionamento para mensagem de limite sem gravar objeto.

Seis capturas em .impeccable/review: página completa, região de imagens e primeiro viewport com erro de versão, em 1440px e 390px; sem overflow horizontal e imagens decodificadas. Detector retornou lista vazia. Revisão independente e resultados finais de CI registrados no PR, sem equivaler à aprovação de uma identidade visual final.
