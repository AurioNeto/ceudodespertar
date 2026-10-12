# TSK-003: Limpar resíduo do Docker e recriar o ambiente local

- **Estado:** ✅ Feito (07/10/2026)
- **Responsável sugerido:** usuário

## Contexto

O `compose.yaml` fixa `name: cdd`, então todas as worktrees compartilham o mesmo projeto Docker. Em 03/10 um `docker compose down -v` numa worktree apagou os volumes `cdd_cdd_postgres_dados` e `cdd_cdd_storage_dados`, que eram do ambiente local. Em 04/10, um agente deixou dois containers em `Created` no projeto `cdd`: `cdd-keycloak-1` e `cdd-mailpit-1`, sem volume. A remoção foi negada pelo classificador.

## Como terminou

- Removidos `cdd-keycloak-1` e `cdd-mailpit-1`, que estavam em "Created" e tinham vindo de uma worktree que já não existe. Nenhum volume foi tocado, e o projeto `cdd` não tinha volumes.
- `.env` criado a partir do `.env.example`, com **`POSTGRES_PORTA=5433`** e a `BANCO_URL` correspondente. A porta 5432 da máquina está ocupada pelo Postgres de outro projeto (`poc-banking`).
- `pnpm infra:subir`: os quatro serviços ficaram saudáveis e a fumaça do Keycloak passou inteira.
- `pnpm db:migrar` aplicou b0-000 a b0-007. `pnpm db:verificar` passou: 18 arquivos e 137 testes.

## Referências

- Memória: compose-projeto-compartilhado

_Atualizado em 07/10/2026._
