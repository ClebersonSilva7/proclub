# Base de interface provisória

A Etapa 01 não define a identidade visual final. Layout estrutural simples, português do Brasil, tokens CSS semânticos, foco visível e navegação por teclado. Botão reutilizável baseado em Radix/CVA e configuração shadcn/ui. Identidade, tipografia de marca e painéis completos serão definidos na etapa visual correspondente.

## Sistema preservado na autenticação e administração

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

## Administração global — Etapa 04

Extensão funcional em modo **Operate**, sem nova identidade, fonte ou paleta. Referências: `src/app/admin`, `src/modules/platform/forms.tsx` e `src/app/globals.css`. A listagem ocupa a estrutura global; cadastro e detalhe usam uma coluna de edição com largura máxima de 720px. O título administrativo conserva a escala global `clamp(2rem, 5vw, 3.5rem)`, entrelinha de 1,15 e quebra de nomes longos. Os formulários mantêm ritmo vertical de 24px e grupos de campo de 8px.

Busca e seleção de situação se organizam em linha com quebra e intervalo de 16px. Abaixo de 480px, cada filtro ocupa uma linha e os botões dos formulários preenchem a largura disponível. Inputs, selects, áreas de texto, ações principais e resumos expansíveis da equipe têm altura mínima de 48px. Selects e áreas de texto compartilham fundo branco, borda semântica, cantos de 6px e preenchimento de 10px por 12px; áreas de texto podem ser redimensionadas verticalmente.

A lista usa divisórias, nomes de clube em 1,25rem com peso 650 e situação escrita em etiqueta de fundo suave, com cantos de 4px. A situação não depende somente de cor. Os vínculos da equipe usam seções expansíveis nativas com e-mail, papel e situação no resumo. Textos longos quebram dentro da coluna. Nenhuma sombra ou decoração adicional foi introduzida.

Orientações visíveis explicam rascunho, slug permanente, responsável necessário para ativação, arquivamento definitivo e conta com e-mail confirmado sem envio de convite. O motivo da alteração tem rótulo e orientação de 10 a 500 caracteres. As mensagens reutilizam o fundo suave e os papéis de alerta ou confirmação. Clubes arquivados mostram aviso de consulta, campos de metadados desabilitados com opacidade reduzida e nenhum formulário de alteração de equipe. Essa apresentação acompanha proteções próprias do servidor e do banco; o estado visual desabilitado não constitui autorização.

Foram inspecionadas as seis capturas `.impeccable/review/{desktop,mobile}-admin-{lista,novo,detalhe}.png`, de lista filtrada, cadastro e detalhe com equipe expandida. Elas confirmam a continuidade visual nas larguras de 1440px e 390px, sem defeito visual identificado nesta revisão. Não cobrem foco, envio, todos os erros ou o estado arquivado, descritos a partir do código. Tampouco comprovam permissões ou entrega SMTP. As 26 jornadas Playwright, 28 verificações unitárias e 24 cenários SQL registrados para a etapa são validações funcionais separadas, não resultados obtidos das imagens. Escopo e pendências em `docs/ETAPA_04.md`.

## Gestão da identidade — Etapa 05

Extensão Operate em `/gestao/[slug]` dentro do sistema provisório existente, sem nova identidade da plataforma. Coluna máxima de 760px, seções identificáveis por navegação de âncoras, formulários verticais e controles de 48px. Campos de cores em duas colunas no desktop e uma abaixo de 480px; prévia da paleta apenas em amostras, mantendo textos e navegação nas cores acessíveis do ProClub.

Dados públicos e contatos são identificados como tal; os textos esclarecem slug permanente, formatos de link e arquivo, limite de 2 MB e a ausência de publicação anônima de imagens nesta etapa. Prévia de logo e capa usa contenção, sem cortar o conteúdo. Remoção e substituição são ações explícitas. Mensagens usam os estados semânticos existentes; botão informa “Salvando…” durante o envio. O foco e as validações nativas permanecem disponíveis.

A confirmação funcional vem dos testes próprios descritos em ETAPA_05.md, incluindo API Storage e autorização real; capturas não comprovam esses controles. As imagens de teste são conteúdo sintético produzido por tests/fixtures/club-image.mjs, sem marca de clube real. Identidade visual final, site público e publicação de imagens permanecem entregas separadas.

A revisão visual independente inspecionou `.impeccable/review/desktop-gestao.png`, `mobile-gestao.png`, `desktop-gestao-imagens.png`, `mobile-gestao-imagens.png`, `desktop-gestao-erro.png` e `mobile-gestao-erro.png`: página completa, região de imagens e primeiro viewport com erro de versão, em 1440px e 390px. Não apontou correção visual material. Logo e capa em azul e branco são fixtures sintéticas determinísticas, sem representar marca aprovada. As capturas não validam foco por teclado, estado transitório de envio, autorização, RLS ou persistência. As 30 jornadas distintas aprovadas entre 26 regressões e quatro confirmações, 36 testes unitários e 27 cenários SQL são evidências funcionais registradas em `docs/ETAPA_05.md`, separadas desta inspeção; não houve uma única rodada de 30 jornadas sem falhas.

## Site público — Etapa 06

Extensão do sistema existente para diretório e apresentação de clubes ativos. Direção da superfície em `docs/surfaces/club-site.md`. A navegação ProClub mantém a fonte do sistema e os tokens provisórios; o cabeçalho do clube usa a paleta configurada, com texto/foco branco ou preto por contraste. Logo usa contenção sobre fundo branco, capa ocupa largura disponível com recorte próprio de capa. Sem imagens inventadas quando os arquivos não existem.

Apresentação e contatos preservam leitura simples e medida máxima de 760px. Links públicos têm sublinhado e áreas de interação de 48px. No celular, cabeçalho se organiza verticalmente e o diretório quebra os controles em linhas. Descrição longa quebra sem interpretar HTML. Estado mínimo informa ausência de conteúdo, sem preencher seções com demonstrações comerciais.

Revisão visual independente inspecionou as seis capturas `.impeccable/review/{desktop,mobile}-{site,site-vazio,diretorio}.png`, em desktop de 1440px e celular de 390px, sem correção visual material indicada. As capturas mostram página completa, estado mínimo e diretório, com fixtures sintéticas azul/branco e clubes nomeados como sintéticos. Não constituem identidade visual final de clube real.

Inspeção de layout é evidência visual; não comprova foco por teclado, estados transitórios, persistência, permissões, publicação, suspensão ou respostas HTTP. As verificações funcionais têm registro próprio em `docs/ETAPA_06.md`; não se deve inferir aprovação funcional a partir das imagens nem uma única execução E2E integral sem falhas a partir de confirmações de jornadas separadas.
