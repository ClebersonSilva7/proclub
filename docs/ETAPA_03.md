# Etapa 03 — autenticação e autorização

## Revisão das entregas anteriores

Em 16/10/2026, confirmados PR #1 e PR #2 abertos, sem merge. CI Quality #6 aprovado em 122413b, incluindo PostgreSQL nativo, build padrão, unitários e Playwright. Migrações remotas correspondem às duas versões locais. Worktree estava limpo. A pendência visual de contraste do botão foi corrigida ao mover a cor base dos links para a camada base CSS, permitindo que o token do botão prevaleça. Os cinco alertas high das ferramentas ESLint continuam documentados; auditoria de dependências de produção nesta etapa retornou zero vulnerabilidades.

## Implementação

SDKs oficiais Supabase com versões fixas e tipos gerados do projeto de desenvolvimento. Formulários reais de acesso/cadastro/recuperação/senha; callback PKCE; sessão SSR HttpOnly; refresh por proxy; autorização independente no servidor em fan/admin/gestao. Sem mudanças no banco ou módulos comerciais. Detalhes e configuração em AUTHENTICATION.md.

## Validação

17 testes unitários aprovados. Suíte de banco da Etapa 02 continua aprovada (19 cenários, 20 resultados com agregador). Vinte jornadas Playwright desktop/mobile aprovadas localmente, incluindo oito jornadas opt-in com Auth real e contas sintéticas. Login, persistência, cookies HttpOnly, troca de senha por HTTP, nova autenticação, logout e isolamento por clube/papel verificados. Os testes remotos criaram apenas fixtures sintéticas temporárias, não usuários reais. Não foram enviados e-mails.

Lint e build alternativo Webpack aprovados localmente. O build Turbopack padrão e PostgreSQL nativo serão conferidos no CI do PR desta etapa. Doze jornadas públicas rodam no CI; as oito de Auth remoto exigem fixtures opt-in e são explicitamente ignoradas no CI sem credenciais. Resultados finais do CI ficam no PR.

Inspeção visual dos quatro estados (login, cadastro, recuperação e erro), em desktop/mobile, com capturas em .impeccable/review (ignoradas pelo Git). O layout preserva a base visual provisória; identidade definitiva ainda não definida. Revisão independente inspecionou os oito arquivos e não pediu alterações visuais. A falta de contexto persistente foi corrigida em PRODUCT.md e docs/DESIGN_SYSTEM.md; o revisor marcou essa correção como resolvida (ship no escopo da persistência).

## Pendências operacionais

- Retornos locais cadastrados com autorização do usuário e conferidos no painel. SMTP personalizado desativado; definir provedor para envio a torcedores reais.
- Confirmar entrega e abertura de links com destinatário autorizado. Esse percurso não foi validado por envio real e não pode ser apresentado como concluído.
- Criar contas e vínculos reais de administração apenas por operação privilegiada auditada, quando solicitado; nenhum administrador permanente foi criado nesta tarefa.
- Etapas 04/05 implementam ferramentas de gestão e convites; esta etapa protege entradas de painel, não implementa esses módulos.

Branch feat/etapa-03-autenticacao, baseada na Etapa 02. Sem merge ou implantação em produção.

## Verificação assistida e correção da recuperação

O usuário confirmou o recebimento do e-mail de cadastro; a conta também foi conferida como confirmada no Supabase. Os dados sintéticos foram mantidos por solicitação explícita do usuário.

O primeiro pedido assistido de recuperação foi aceito (mail.send e /recover 200). Reenvios subsequentes foram recusados com /recover 429 e over_email_send_rate_limit. O usuário relatou mensagem de link inválido/expirado. Ainda não foi comprovada a troca de senha pelo percurso de e-mail.

Corrigido o handler para distinguir limite de envio e falha do provedor, sem revelar existência de conta. Cookies PKCE da recuperação agora são gravados somente depois de o provedor aceitar a solicitação. Um teste com o SDK real e transporte HTTP sintético comprova que um reenvio 429 preserva o verificador correspondente ao desafio do primeiro pedido. Callback diferencia verificador ausente/incompatível de erro genérico de link. Não foram desabilitados limites ou confirmação de e-mail, nem emitidos novos pedidos em sequência para contornar a restrição.

O percurso assistido continua pendente de novo envio aceito dentro do limite ou de configuração de SMTP personalizado. Não declarar recuperação por e-mail concluída com base apenas no cadastro confirmado ou no teste de troca de senha autenticada.
