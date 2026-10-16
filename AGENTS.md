# ProClub — instruções permanentes
Leia README.md e docs antes de alterar o projeto. Arquitetura: monólito modular Next.js App Router + TypeScript. Domínios ficam em src/modules; componentes comuns em src/components; infraestrutura em src/lib.

- Trabalhe em uma etapa pequena e verificável por vez. Não implemente módulos financeiros na fundação.
- Valide entradas e autorizações no servidor. Nunca confie em role ou club_id enviados pelo navegador.
- Toda tabela exposta deve ter RLS, grants e políticas explícitas. Teste isolamento entre dois clubes antes de liberar dados reais.
- Nunca use user_metadata para autorização. Administradores globais ficam em tabela privilegiada e auditada.
- Não exponha credenciais secretas no cliente ou no Git. Variáveis NEXT_PUBLIC são públicas.
- Pagamentos: valores inteiros em centavos, webhooks verificados e idempotentes, ativação somente no servidor, trilha de auditoria; nunca armazenar dados de cartões.
- Mudanças de banco devem ter migrações versionadas. Não altere produção diretamente.
- Preserve condições comerciais de contratos existentes.
- Não apresente demonstrações como funcionalidades implementadas. Não coloque informações privadas nas rotas de estrutura públicas.
- Faça testes automatizados para finanças e permissões. Execute npm run check e npm run test:e2e quando afetar jornadas.
- Atualize docs com escopo, validação e pendências. Não declare testes não executados como aprovados.
- Consulte a documentação instalada em node_modules/next/dist/docs antes de mudar APIs do Next.js; convenções desta versão podem diferir.
