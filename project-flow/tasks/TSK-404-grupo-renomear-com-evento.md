# TSK-404: Grupo: `renomear` com autor e evento

- **Estado:** ✅ Feito (#25, `fb7261d`)
- **Responsável sugerido:** limpio
- **Depende de:** [TSK-002](TSK-002-mesclar-identidade-guarda-front-tema.md)

## Contexto

Conceder, revogar e excluir emitem `GRUPO_ALTERADO`, mas renomear não emite nada nem recebe autor. A troca do rótulo fica fora da trilha.

## Como terminou

`renomear(nome, descricao, autorId, em)` emite `GRUPO_EDITADO` com `acao: RENOMEADO`, os valores anteriores e os novos, e não emite evento quando nada muda. O evento do agregado `Grupo` passou de `GRUPO_ALTERADO` para `GRUPO_EDITADO`, por causa do Doc 3 §10.4.

## O que resta

- Incluir `GRUPO_EDITADO` na enumeração de `operacao` da trilha (TSK-303).

## Referências

- https://github.com/AurioNeto/ceudodespertar/pull/25
- https://github.com/AurioNeto/ceudodespertar/pull/25#discussion_r4189909052

_Atualizado em 07/10/2026._
