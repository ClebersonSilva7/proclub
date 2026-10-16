# Etapa 01 — registro de entrega
Implementada a fundação técnica com Next.js, TypeScript, Tailwind, configuração shadcn/ui, botão compartilhado, estrutura modular, documentação inicial, liveness, CI e testes.

## Verificação local
Lint, TypeScript, teste unitário e build de produção aprovados. Testes Playwright desktop/mobile preparados e invocados, mas bloqueados antes de executar as jornadas: o Chromium não pôde ser instalado (download retornou arquivo inválido). A inspeção visual desktop/mobile também está pendente. O CI instala Chromium e executa as jornadas; seu resultado precisa ser conferido no GitHub.

## Limites
As páginas são estruturas públicas sem dados de negócio. Não existe autenticação ou autorização implementada. Supabase está documentado e com exemplo de variáveis; nenhuma conexão, tabela ou política foi criada. A identidade visual definitiva fica para a etapa de UI.
PRD e arquitetura em docs são sínteses do contexto recebido. Importar os documentos completos aprovados antes de usar a numeração de requisitos como referência de implementação.

## Próxima etapa
Conectar projeto Supabase de desenvolvimento e especificar as seis entidades fundamentais com constraints, RLS, grants e testes de isolamento. Autenticação virá na sequência.
