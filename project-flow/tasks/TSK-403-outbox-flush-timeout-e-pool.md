# TSK-403: Outbox: flush fora do timer, timeout fora da config e conexão read-only

- **Estado:** 📌 Backlog técnico (aceito para o B0)
- **Responsável sugerido:** limpio
- **Depende de:** [TSK-001](TSK-001-mesclar-pilha-da-fundacao.md)

## Contexto

O flush do consumidor respeita o `statement_timeout` por statement, mas não na soma. `TIMEOUT_DO_CONSUMIDOR_EM_MS` é lido de `process.env` fora da config Zod. Depois de um aborto, a conexão volta ao pool com `default_transaction_read_only = on`.

## O que precisa ser feito

- Levar o flush para dentro do timer, ou limitar a unit of work.
- Passar `TIMEOUT_DO_CONSUMIDOR_EM_MS` pela config Zod.
- Se surgir uso do pool fora da UoW, fazer `reset default_transaction_read_only` na reserva da conexão.
- Decisão registrada nas threads do #24 (06/10): aceito para o B0, revisitar se o volume por consumidor crescer.

## Critérios de aceite

- Teste da soma de statements
- Timeout validado na config

## Referências

- https://github.com/AurioNeto/ceudodespertar/pull/24
- https://github.com/AurioNeto/ceudodespertar/pull/24#discussion_r4188586190
- https://github.com/AurioNeto/ceudodespertar/pull/24#discussion_r4188585921

_Atualizado em 07/10/2026._
