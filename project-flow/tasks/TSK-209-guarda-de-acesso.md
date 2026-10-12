# TSK-209: Guarda global de acesso com JWT e marcas de rota (#27)

- **Estado:** ✅ Feito (mesclado em 06/10/2026, `ea84659`)
- **Peça do plano:** I05
- **PR:** [#27](https://github.com/AurioNeto/ceudodespertar/pull/27)
- **Responsável sugerido:** escudo

## Contexto

Autenticar e autorizar em toda rota.

## O que foi entregue

- JWT RS256 com `iss`, `aud=cdd-api`, `typ=Bearer`, tolerância de 5 s; JWKS com stale-if-error de até 15 min e 503 `PROVEDOR_DE_IDENTIDADE_INDISPONIVEL`.
- Marcas `@Publico`, `@ApenasIdentificado`, `@ApenasUsuarioAtivo`, `@RequerPermissao`, `@RequerAlgumaPermissao`; rota sem marca dá 500.
- Porta `ResolvedorDeContextoDeAcesso`, que hoje recusa tudo.
- Runbook no README: reiniciar a API depois de rotação de chave.

## Como terminou

- Com o filtro do #22 ajustado, os códigos da guarda chegam intactos. O teste combinado de guarda e filtro (`4933afc`) prova 401 `USUARIO_SUSPENSO`/`USUARIO_DESCONHECIDO` e 503 `PROVEDOR_DE_IDENTIDADE_INDISPONIVEL`, com o `correlacaoId` preenchido.
- `61e9864`: o log do 503 passou a registrar o nome e o código da causa da falha de rede.
- As rotas de saúde ganharam `@Publico`.
- Sem correção: a marca de método herdada passa por cima da marca da subclasse (TSK-406).

## O que resta

- TSK-406.

## Referências

- https://github.com/AurioNeto/ceudodespertar/pull/27
- https://github.com/AurioNeto/ceudodespertar/pull/27#discussion_r4187821233

_Atualizado em 07/10/2026._
