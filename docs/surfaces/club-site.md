# Site público do clube

Modo Read: o visitante reconhece o clube, entende sua apresentação e encontra canais oficiais. Extensão da base visual existente, sem redesenhar a plataforma nem presumir uma marca aprovada para clubes reais.

A primeira tela mostra nome, modalidade, cidade/UF e identidade cadastrada. Logo e capa só aparecem quando existem. A página usa a cor principal do clube com texto branco/preto escolhido por contraste; a secundária aparece como detalhe de identidade. Navegação ProClub mantém o sistema provisório. Apresentação e contatos usam texto simples, campos públicos e links seguros. Ausência de conteúdo tem estado mínimo honesto, sem inventar história, patrocinadores, planos ou benefícios.

Diretório oferece busca e paginação. Clubes não ativos recebem página indisponível/404. Endpoints públicos usam contexto anônimo e só leem imagens atuais de clubes ativos; não publicam versões antigas, permissões, perfis ou vínculos.

Verificar desktop 1440px e celular 390px, estado completo e mínimo, busca, 404, contraste, foco e ausência de overflow. Capturas com clubes sintéticos são evidência de layout; autorização e publicação dependem dos testes SQL/API/E2E.
