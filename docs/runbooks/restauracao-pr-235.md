# Restauração para a base do PR #235

Solicitação do responsável: restaurar o projeto ao estado após o merge do PR #235,
preservando somente os ajustes necessários ao ambiente online configurado em
20/11/2026. Base: `ba7b87b08c1994607fc47eda476f4c0d46cf7a08`.

A restauração é um novo commit sobre a main. Nenhum commit anterior é apagado e
as branches anteriores continuam disponíveis. Os arquivos não versionados do
checkout principal não são incluídos nem modificados.

## Escopo preservado da base

Telas, componentes, design system, shell, contratos, módulos de negócio, lista de
migrations, testes anteriores, CI e lockfile são os do PR #235. Não foram mantidas
as implementações funcionais posteriores nem as substituições visuais da TSK-520.
Telas que nessa base usavam dados de demonstração voltam ao comportamento original;
isso não significa que passaram a ter integração com a API.

## Exceções de hospedagem

- PostgreSQL Supabase: conexão TLS verificada, CA, pool e prontidão remota;
  configuração do migrador para propriedade de esquemas em banco gerenciado.
- API Oracle: endereço de escuta configurável para `127.0.0.1`, pacote de produção
  somente com `dist` e dependências, serviço systemd e scripts de instalação.
- HTTPS: Caddy, domínio DuckDNS e documentação da publicação.
- Cloud-IAM: arquivos dos dois clientes, escopo `kc-admin-api` na conta de serviço
  e audiência customizada `cdd-api` no cliente web, sem alterar o realm local.
- Vercel: fallback para as rotas da SPA e leitura de `VITE_API_URL` pelo cliente HTTP.
- Exemplos de ambiente, `.pnpm-store/` ignorado e runbooks dessas configurações.

Senha, segredos, certificados privados e arquivos de ambiente reais permanecem
fora do Git. A instituição e a conta do administrador criadas online são preservadas.

## Banco hospedado

Não executar down, reset, recriação do banco ou exclusão de usuários para acompanhar
esta restauração de código. O banco mantém suas 23 migrations aplicadas, tabelas e
guardas já instaladas, inclusive o hardening de `search_path` feito na hospedagem.
A lista de migrations do código volta às 16 da base #235; as sete aplicações
posteriores permanecem apenas no histórico do banco e no histórico Git anterior.
Antes de retomar evolução de schema, conciliar esse histórico: não reutilizar nomes
de migrations já executadas para novas definições.

Nenhuma mudança de schema é necessária para servir esta base. A troca da API deve
ser validada contra o banco existente em uma porta privada, antes de promover a
release e reiniciar o serviço normal. Manter a release anterior para reversão.

## Verificação local

Comparação com a base confirmou ausência de diferenças em `apps/web/src/pages`,
`apps/web/src/ds`, `apps/web/src/app`, `packages/contracts/src` e `apps/api/src/modules`.
Builds limpos de contratos, API e frontend passaram. Tipos, lint e fronteiras
passaram. Testes: 2176 do backend aprovados (30 TODO) e 4475 do frontend aprovados.
Os avisos existentes de estrutura não foram tratados como mudanças de layout.
A suíte de integração Docker não rodou: o daemon respondeu HTTP 500. A validação
da API candidata contra o Supabase real passou: prontidão 200 e acesso anônimo 401.
