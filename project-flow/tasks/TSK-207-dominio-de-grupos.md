# TSK-207: Domínio de grupos e permissões efetivas (#25)

- **Estado:** ✅ Feito (mesclado em 06/10/2026, `0e909bb`)
- **Peça do plano:** I02
- **PR:** [#25](https://github.com/AurioNeto/ceudodespertar/pull/25)
- **Responsável sugerido:** limpio

## Contexto

Agregado `Grupo` (G1–G5) e os seis grupos de sistema.

## O que foi entregue

- `Grupo` com conceder e revogar idempotentes, exclusão lógica e eventos `GRUPO_ALTERADO` + `acao`.
- `PermissoesEfetivas` (US3).
- `GRUPOS_DE_SISTEMA`: 64/18/38/28/4/5, conferido contra a matriz §6.

## Como terminou

- `fb7261d`: o evento do agregado `Grupo` virou **`GRUPO_EDITADO`** (o Doc 3 §10.4 reserva `GRUPO_ALTERADO` para a mudança de grupo **do usuário**), e `renomear(nome, descricao, autorId, em)` passou a emiti-lo. Isso resolveu o TSK-404.
- A enumeração de `operacao` da auditoria ainda não tem `GRUPO_EDITADO` (TSK-303).
- Sem correção: nits do domínio, entre eles o G3 decidido com contagem de fora e sem serialização (TSK-414).

## O que resta

- TSK-414.

## Referências

- https://github.com/AurioNeto/ceudodespertar/pull/25
- https://github.com/AurioNeto/ceudodespertar/pull/25#discussion_r4187820274

_Atualizado em 07/10/2026._
