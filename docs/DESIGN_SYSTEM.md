# Base de interface provisória

A Etapa 01 não define a identidade visual final. Layout estrutural simples, português do Brasil, tokens CSS semânticos, foco visível e navegação por teclado. Botão reutilizável baseado em Radix/CVA e configuração shadcn/ui. Identidade, tipografia de marca e painéis completos serão definidos na etapa visual correspondente.

## Sistema preservado na autenticação

Valores observados em `src/app/globals.css`; registrar esta base não aprova uma identidade final:

| Token | Valor | Uso |
| --- | --- | --- |
| `--background` | `#fafaf9` | Fundo da página |
| `--foreground` | `#192920` | Texto principal |
| `--primary` | `#21543c` | Ação principal e foco |
| `--primary-foreground` | `#ffffff` | Texto da ação principal |
| `--muted` | `#f0f2ef` | Fundo das mensagens |
| `--border` | `#d4dad5` | Campos e divisórias |

A fonte é `system-ui, sans-serif`, com entrelinha base de 1,6. Na autenticação, o título usa `clamp(2rem, 4vw, 2.75rem)` e entrelinha de 1,15. Rótulos têm peso 650; orientações dos campos usam 0,875rem. A coluna de acesso tem largura máxima de 480px, formulário com intervalo de 24px e grupos de campo com intervalo de 8px. A estrutura global mantém margens internas de 24px; abaixo de 480px, o cabeçalho se organiza em coluna.

Campos brancos têm borda semântica, cantos de 6px, preenchimento de 10px por 12px e altura mínima de 48px. Botões do formulário também têm altura mínima de 48px e reutilizam o botão compartilhado. O foco visível usa contorno de 2px e afastamento de 4px. Links mantêm sublinhado identificável.

## Estados e conteúdo

`src/modules/identity/auth-form.tsx` e `auth-page.tsx` são a referência dos estados atuais. Campos têm rótulos associados, autocomplete e orientações de senha. Mensagens usam fundo suave, cantos de 6px e quebra de texto; erros usam `role="alert"`, confirmações usam `role="status"`. Recuperação e cadastro não confirmam a existência de uma conta.

Durante o envio, o formulário recebe `aria-busy`, o botão mostra “Aguarde…” e fica desabilitado. Sem configuração do serviço, a tela informa que o acesso está em preparação e desabilita o envio. O componente compartilhado reduz a opacidade do botão desabilitado. Não remover mensagens de erro ou estado para obter uma tela visualmente mais limpa.

## Escopo e validação visual

Esta é uma extensão funcional da base existente, sem mudança de identidade. A revisão visual inspecionou oito capturas desktop/mobile em `.impeccable/review` para login, cadastro, recuperação e erro e não indicou correção visual. As capturas não cobrem o estado transitório de envio, foco por teclado ou todos os fluxos de autenticação. O comportamento declarado acima foi extraído do código; não implica que esses estados foram capturados ou que e-mails reais foram entregues.
