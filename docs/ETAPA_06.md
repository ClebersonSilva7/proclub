# Etapa 06 — site público personalizado

## Revisão anterior

Branch criada sobre f5324fe da Etapa 05. CI Quality #16 confirmado aprovado; PR #5 aberto, sem merge; worktree limpo. As sínteses PRD/arquitetura foram consultadas junto da implementação. Não foram recuperados novos documentos integrais aprovados. A pendência do percurso de e-mail permanece separada; esta entrega não envia mensagens nem altera a conta real.

## Entrega

- `/clubes`: diretório de clubes ativos, busca por nome e paginação de 20 resultados. Navegação global e home permitem encontrá-lo.
- `/clubes/[slug]`: nome, modalidade, localização, descrição, contatos e redes públicas, paleta, logo e capa configurados na gestão. Só aparecem seções com conteúdo; estado mínimo sem história ou contatos inventados.
- Metadados por clube, descrição, canonical e Open Graph textual. Origem canônica vem de APP_URL, nunca do Host do visitante. Clubes indisponíveis usam noindex e página 404.
- `/clubes/[slug]/imagens/[kind]`: só logo/cover atuais, selecionados pelo banco, com MIME conferido, nosniff, CSP restritiva e cache private/no-store. Parâmetros arbitrários de caminho não escolhem objetos.
- Gestão indica que as imagens atuais são públicas quando o clube está ativo e oferece link para ver o site.

Sem planos, pagamentos, vínculo de torcedor/Fan ID, notícias, calendário, elenco, patrocinadores ou benefícios fictícios. O cadastro já existente continua sendo conta ProClub, sem anunciar um programa comercial que não foi implementado.

## Publicação e privacidade

Cliente Supabase server-only exclusivo para páginas públicas: chave publicável, sem cookies/sessão do visitante, refresh desativado e fetch no-store. Lista de colunas explícita e filtro status=active complementam RLS. Mesmo um administrador global acessando a URL pública não ganha prévia de um rascunho.

O bucket club-assets continua privado. A nova política SELECT para anon/authenticated permite somente objetos referenciados como logo/capa de um clube ativo. Versões antigas, uploads sem referência e arquivos de clubes draft/suspended/archived continuam privados. O helper oficial storage.allow_any_operation restringe a política pública a download/informação de imagem; visitantes não listam arquivos nem emitem URLs assinadas. Nenhuma política de escrita pública, upsert/move/delete ou função privilegiada nova. Índices parciais nos caminhos apoiam a consulta. Não há service_role ou URLs assinadas na aplicação pública.

Trocar/remover a referência ou suspender/arquivar o clube retira autorização em novas leituras. Não se promete revogar cópias já baixadas pelo visitante. A rota não aceita path arbitrário e volta a passar pelo Storage/RLS ao baixar. Não há cache persistente de página ou imagem que mantenha publicação após alteração de estado. Cache React usado nos dados é apenas do pedido de renderização, não compartilhado entre requisições.

## Respostas e interface

Um teste mostrou o comportamento documentado do Next: o loading global começava o streaming com 200 antes da decisão de notFound. O indicador foi movido para as áreas admin/fan/gestao, mantendo seu componente compartilhado; páginas públicas aguardam os dados antes dos cabeçalhos. Retorno 404 real confirmado em desktop/mobile para slug inválido. Ausência e estados não ativos também são cobertos pelo percurso integrado, com novas requisições após mudanças.

Links externos HTTPS sem credenciais, com noopener/noreferrer e aviso acessível de nova aba. E-mail e telefone tratados como contatos, descrição como texto simples, nunca HTML. Cores aceitam apenas hexadecimal; branco/preto escolhido por contraste no cabeçalho, com foco visível na cor do texto. Navegação da plataforma preservada. Imagens ausentes não são substituídas por marcas/arte inventadas. Superfície e direção em surfaces/club-site.md.

## Banco e operação

Migração aplicada somente ao projeto Supabase de desenvolvimento emjoizihrwffoqewapig:

`20261019185643_public_current_club_assets.sql` e `20261019190856_restrict_public_asset_operations.sql`

Arquivo criado pela CLI e sincronizado com a versão atribuída ao aplicar pelo conector. Sem mudança em tabelas/assinaturas de funções que exija novos tipos. Histórico anterior preservado. Setup e execução das migrações em supabase/README.md. Nenhum merge ou implantação em produção.

Consultados changelog e documentos oficiais atuais. Mudanças anunciadas de TLS/CBC e PostgreSQL 15.19/17.11 não exigiram ajustes nesta implementação (clientes modernos, sem uso de PGP legado, ltree, btree_gist ou operadores customizados neste módulo). Mantidos controles de Auth/Storage e isolamento.

## Verificações

O bootstrap SQL representa também o helper de operação do Storage, verificado no provedor real. Suíte SQL real acrescenta negação de listagem/assinatura e publicação somente da referência atual, negação de uploads anônimos e de versões antigas, troca/remoção e suspensão/reativação. Testes unitários usam SDK real para comprovar transporte sem Cookie e cache no-store; os demais validam whitelist, slugs, links, contraste, referências e respostas de imagem. Mocks de transporte não substituem RLS/API: percurso opt-in remoto usa administrador sintético para criar dois clubes ao longo de desktop/mobile, configurar identidade/imagens e verificar acesso anônimo, texto não executável, substituição, remoção, suspensão/reativação e arquivamento. Fixtures concluídas ficam arquivadas; arquivos sintéticos são preservados conforme solicitação do usuário.

Validação local: lint e TypeScript aprovados; 45 testes unitários aprovados; 28 cenários SQL aprovados (29 resultados incluindo agregador); build Webpack aprovado. A rodada integrada de 34 percursos teve 32 aprovações e duas falhas administrativas (timeout e erro de carregamento). Após ampliar somente o limite total do percurso administrativo, a confirmação de quatro percursos públicos/administrativos passou em desktop/mobile. Assim, os 34 percursos distintos foram verificados entre rodadas, sem alegar uma única rodada integral limpa. Os dois testes públicos de status 404 também passaram após mover o loading global. Revisão independente das seis capturas: entrega aprovada sem correções materiais. CI será registrado no PR. SMTP/aceite de recuperação por e-mail e limpeza privilegiada de versões antigas permanecem pendências operacionais anteriores. A identidade visual final de um clube real não foi aprovada por esta entrega.

Advisors executados após a migração: permanecem os avisos de [proteção contra senhas vazadas desativada](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) e [log privado com RLS sem política](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) (negação intencional). Advisor de desempenho informou os índices de torcedores e de caminhos novos ainda sem uso na amostra sintética; preservados para suas consultas, sem remoção baseada nessa amostra.
