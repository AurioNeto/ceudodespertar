# TSK-205: Idempotency-Key sob a borda transacional (#23)

- **Estado:** ✅ Feito (mesclado em 06/10/2026, `dbbb706`)
- **Peça do plano:** F16
- **PR:** [#23](https://github.com/AurioNeto/ceudodespertar/pull/23)
- **Responsável sugerido:** limpio
- **Depende de:** [TSK-201](TSK-201-unidade-de-trabalho-e-borda.md)

## Contexto

Duplo clique ou retry produzem um efeito só e a mesma resposta.

## O que foi entregue

- Migration b0-004 (`corpo_hash`).
- Interceptor com linha reservada em savepoint e reclamação da chave vencida por UPDATE condicional.
- Rota com query ordenada; mesma chave com outra rota, corpo ou usuário dá 422.
- `@Res()`/`@Next()` sem passthrough dá 500 antes do handler.

## Como terminou

- `ad4169c`: a detecção de `@Res` passou a usar a identidade do handler. Isso resolveu o TSK-405.
- Na sincronização: os tipos foram regenerados com `corpo_hash`, e o teste HTTP passou a subir o `FiltroDeErrosModule` e a verificar o 422 com o corpo.
- No #24, a persistência passou a usar o `Kysely<DB>` do contexto, sem MikroORM.
- No #36 (07/10) vieram o expurgo das chaves vencidas e a marca `@RespostaSemCorpoNoReplay` (TSK-013).
- Sem correção: um POST sem `@ModoDeTransacao` (padrão `leitura`) que recebe `Idempotency-Key` dá 500 (TSK-412).

## O que resta

- TSK-412 e TSK-313 (registro do `IdempotenciaModule` na aplicação).

## Referências

- https://github.com/AurioNeto/ceudodespertar/pull/23
- https://github.com/AurioNeto/ceudodespertar/pull/23#discussion_r4187819660
- https://github.com/AurioNeto/ceudodespertar/pull/36

_Atualizado em 07/10/2026._
