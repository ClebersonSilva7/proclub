# ProClub — contexto do produto

ProClub é um SaaS multi-clubes para gestão e relacionamento com torcedores, inicialmente voltado ao vôlei. Os públicos previstos são administradores globais, gestores/colaboradores de clubes e torcedores. A arquitetura é um monólito modular Next.js App Router com TypeScript; domínios em `src/modules`, componentes comuns em `src/components` e infraestrutura em `src/lib`.

## Extensão de autenticação — Etapa 03

A interface de acesso tem modo **Operate**: permitir entrar, criar conta, recuperar acesso e definir nova senha com instruções em português do Brasil. A implementação usa formulários reais, Supabase SSR com cookies HttpOnly, validação e autorização no servidor. A disponibilidade depende da configuração do ambiente e dos fluxos de e-mail do Supabase; a presença da interface não comprova uma jornada de e-mail concluída.

A extensão preserva a base visual provisória existente: fonte sans-serif do sistema, fundo claro, texto verde escuro e ação principal verde com texto branco. A identidade visual final, a tipografia de marca e os painéis completos continuam pendentes. Não foi aprovada uma nova identidade nesta etapa. Os detalhes observados estão em `docs/DESIGN_SYSTEM.md`.

## Extensão de administração global — Etapa 04

A administração também tem modo **Operate**, preservando o sistema visual existente. `/admin` oferece listagem de clubes com busca, filtro por situação e paginação; `/admin/clubes/novo` cria clubes em rascunho; o detalhe permite editar metadados e situação, mantendo o slug permanente. A equipe administrativa usa contas existentes com e-mail confirmado, nos papéis responsável (`owner`), gestor (`manager`) e equipe (`staff`), com alteração e revogação de vínculos. Toda operação exige motivo para auditoria.

As proteções são verificadas no servidor e no banco. Ativar exige responsável ativo; o último responsável de um clube ativo é protegido; arquivamento é definitivo nesta entrega e mantém dados e vínculos para consulta. A interface não cria administradores globais nem envia convites. A Etapa 05 acrescenta o painel de identidade descrito abaixo. Escopo técnico, transições e limites estão em `docs/ETAPA_04.md`.

## Evidências e limites

Fontes: `README.md`, `docs/PRD.md`, `docs/ARCHITECTURE.md`, estilos em `src/app/globals.css`, botão compartilhado e componentes de `src/modules/identity`, rotas em `src/app/admin`, formulários em `src/modules/platform/forms.tsx` e `docs/ETAPA_04.md`. Os documentos de planejamento descrevem também funcionalidades futuras; não constituem evidência de implementação.

A revisão visual desta entrega inspecionou oito capturas desktop/mobile de login, cadastro, recuperação e erro em `.impeccable/review`, sem apontar defeito visual. As capturas não comprovam navegação por teclado, estado transitório de envio nem entrega de e-mails; esses comportamentos exigem verificação própria. O estado de envio e o foco visível estão previstos no código, sem equivaler a uma validação visual desses estados.

A revisão da Etapa 04 inspecionou seis capturas de lista, novo clube e detalhe/equipe, em desktop (1440px) e celular (390px), em `.impeccable/review`. As capturas mostram continuidade visual e organização vertical no celular; não comprovam permissões, isolamento ou entrega SMTP. A validação funcional desta etapa registrou 26 jornadas Playwright públicas e remotas de desenvolvimento com dados sintéticos, 28 testes unitários e 24 cenários SQL; esses resultados são evidências próprias, separadas da inspeção visual.

Pagamentos, convites e gestão de administradores globais pela interface ainda não estão implementados. A administração da Etapa 04 não equivale a uma liberação em produção. A recuperação por e-mail continua pendente do limite do SMTP padrão, conforme `docs/ETAPA_04.md`. As demais áreas protegidas de acesso não devem ser apresentadas como painéis completos. Não inserir dados privados em rotas públicas nem anunciar recursos planejados como disponíveis.

## Gestão da identidade — Etapa 05

Extensão Operate da interface existente em /gestao/[slug]: edição de dados públicos, descrição, contatos, links HTTPS, paleta e upload privado de logo/capa. Preserva sistema e navegação da plataforma. Owner/manager ativo de clube ativo ou administrador global autorizado; arquivados não editáveis. Salvamento atômico com detecção de versão antiga. Acesso a imagens protegido, sem publicação anônima nesta etapa. Site público é a Etapa 06; os testes usam dados sintéticos, sem representar identidade aprovada de um clube real. Ver docs/ETAPA_05.md.
