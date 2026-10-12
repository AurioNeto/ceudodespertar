# TSK-210: Camada de dados do front (#28)

- **Estado:** ✅ Feito (mesclado em 06/10/2026, `c19d1f0`)
- **Peça do plano:** W01
- **PR:** [#28](https://github.com/AurioNeto/ceudodespertar/pull/28)
- **Responsável sugerido:** vitro

## Contexto

Base para trocar os mocks pela API.

## O que foi entregue

- Cliente `fetch` com `FonteDeCredencial`, `Idempotency-Key` por intenção e `If-Match`.
- `ErroDaApi`/`ErroDeRede` do contrato e política de 401.
- TanStack Query (retry só em rede e 503).
- Proxy `/api`; Vitest no web e na CI.

## Como terminou

- `ec381a8`: não renova de novo quando o token já mudou.
- `1fd21ac`: 502 e 504 entram no retry.
- Sem correção (TSK-407): `Idempotency-Key` em todo POST, sem opção de desligar, conflita com o interceptor em rotas sem instituição, como a ativação de convite.

## O que resta

- TSK-407.

## Referências

- https://github.com/AurioNeto/ceudodespertar/pull/28
- https://github.com/AurioNeto/ceudodespertar/pull/28#discussion_r4187821823

_Atualizado em 07/10/2026._
