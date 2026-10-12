# TSK-206: Outbox transacional, despachante e `@ReageA` (#24)

- **Estado:** ✅ Feito (mesclado em 06/10/2026, `10b66d7`)
- **Peça do plano:** F15
- **PR:** [#24](https://github.com/AurioNeto/ceudodespertar/pull/24)
- **Responsável sugerido:** limpio + testudo
- **Depende de:** [TSK-201](TSK-201-unidade-de-trabalho-e-borda.md)

## Contexto

Eventos de domínio gravados na transação do agregado e entregues no processo.

## O que foi entregue

- Sinal pós-commit (`aoConfirmar`) e ciclo isolado do contexto de quem gravou.
- `FOR UPDATE SKIP LOCKED`, ordem por agregado (índice b0-005), savepoint por consumidor com `statement_timeout` e flush do ORM dentro dele.
- Aborto da transação quando o consumidor fica preso fora do banco; backoff com teto de 10.
- `ultimo_erro` e logs só com classe, SQLSTATE e constraint.
- Regra de fronteira: ORM só na infraestrutura.

## Como terminou

- A regra `orm-so-na-infraestrutura-de-banco` passou a valer **sem exceções** (decisão do usuário). O filtro do #22 e a idempotência do #23 foram refatorados para segui-la (`1e562e2`, `0f2c344`).
- O teste do teto de tentativas corria com o despacho pós-commit (falhava 1 em 30). Foi corrigido em `85b3b35`.
- No #35 entraram a vigia de esgotados, o índice b0-006 e o runbook no Doc 7 §13.
- Sem correção (TSK-413):
  - evento sem consumidor é publicado em silêncio, e se perde quando duas versões convivem no deploy;
  - o log de falha do ciclo descarta a causa;
  - o despachante importa o adaptador MikroORM.
- **O `EventosModule` não está na aplicação** (TSK-313).

## O que resta

- TSK-413 e TSK-313.

## Referências

- https://github.com/AurioNeto/ceudodespertar/pull/24
- https://github.com/AurioNeto/ceudodespertar/pull/24#discussion_r4187819829
- https://github.com/AurioNeto/ceudodespertar/pull/24#discussion_r4187819980
- https://github.com/AurioNeto/ceudodespertar/pull/24#discussion_r4187820143

_Atualizado em 07/10/2026._
