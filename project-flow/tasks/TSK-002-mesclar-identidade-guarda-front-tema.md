# TSK-002: Mesclar identidade, guarda, front e tema (#25–#30)

- **Estado:** ✅ Feito (06/10/2026)
- **Responsável sugerido:** usuário

## Contexto

Seis PRs independentes da pilha da fundação. #26 está empilhado sobre o #25, e #30 sobre o #28.

## Como terminou

- Ordem usada: #25 (`0e909bb`), retarget do #26 e merge (`0238da4`), #29 (`32ce9f8`), #28 (`c19d1f0`), retarget do #30 e merge (`b2dfcaa`, depois de reconciliar o lock), #27 (`ea84659`).
- O conflito previsto entre #27 e #22 virou correção no #22: o filtro global passou a responder pelo código do catálogo que vem no corpo da `HttpException`. Um teste combinado de guarda e filtro, no #27, prova que 401 `USUARIO_*` e 503 `PROVEDOR_DE_IDENTIDADE_INDISPONIVEL` chegam intactos.
- O login real ponta a ponta ainda depende do TSK-302 (`GET /eu`).

## Referências

- https://github.com/AurioNeto/ceudodespertar/pull/25
- https://github.com/AurioNeto/ceudodespertar/pull/26
- https://github.com/AurioNeto/ceudodespertar/pull/27
- https://github.com/AurioNeto/ceudodespertar/pull/28
- https://github.com/AurioNeto/ceudodespertar/pull/29
- https://github.com/AurioNeto/ceudodespertar/pull/30

_Atualizado em 07/10/2026._
