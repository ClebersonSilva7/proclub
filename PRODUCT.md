# ProClub — contexto do produto

ProClub é um SaaS multi-clubes para gestão e relacionamento com torcedores, inicialmente voltado ao vôlei. Os públicos previstos são administradores globais, gestores/colaboradores de clubes e torcedores. A arquitetura é um monólito modular Next.js App Router com TypeScript; domínios em `src/modules`, componentes comuns em `src/components` e infraestrutura em `src/lib`.

## Extensão de autenticação — Etapa 03

A interface de acesso tem modo **Operate**: permitir entrar, criar conta, recuperar acesso e definir nova senha com instruções em português do Brasil. A implementação usa formulários reais, Supabase SSR com cookies HttpOnly, validação e autorização no servidor. A disponibilidade depende da configuração do ambiente e dos fluxos de e-mail do Supabase; a presença da interface não comprova uma jornada de e-mail concluída.

A extensão preserva a base visual provisória existente: fonte sans-serif do sistema, fundo claro, texto verde escuro e ação principal verde com texto branco. A identidade visual final, a tipografia de marca e os painéis completos continuam pendentes. Não foi aprovada uma nova identidade nesta etapa. Os detalhes observados estão em `docs/DESIGN_SYSTEM.md`.

## Evidências e limites

Fontes: `README.md`, `docs/PRD.md`, `docs/ARCHITECTURE.md`, estilos em `src/app/globals.css`, botão compartilhado e componentes de `src/modules/identity`. Os documentos de planejamento descrevem também funcionalidades futuras; não constituem evidência de implementação.

A revisão visual desta entrega inspecionou oito capturas desktop/mobile de login, cadastro, recuperação e erro em `.impeccable/review`, sem apontar defeito visual. As capturas não comprovam navegação por teclado, estado transitório de envio nem entrega de e-mails; esses comportamentos exigem verificação própria. O estado de envio e o foco visível estão previstos no código, sem equivaler a uma validação visual desses estados.

Pagamentos e ferramentas administrativas de negócio ainda não estão implementados. As áreas protegidas de acesso não devem ser apresentadas como painéis completos. Não inserir dados privados em rotas públicas nem anunciar recursos planejados como disponíveis.
