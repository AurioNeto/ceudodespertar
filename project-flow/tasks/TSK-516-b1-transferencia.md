# TSK-516: Transferência com conferência e estorno

- **Estado:** 🗺️ Planejada (B1)
- **Responsável sugerido:** back (limpio; crivo obrigatório: dinheiro)
- **Depende de:** [TSK-515](TSK-515-b1-lancamento.md)

## Contexto

Decisões do dono (14/10): a transferência tem o ciclo do lançamento e fica imutável depois de confirmada (Doc 7 #7); quem confirma usa **a mesma permissão de conferir lançamento**, sem código novo, e quem registrou não confirma a própria; a transferência **entra no hash** do período.

## O que precisa ser feito

- Agregado `Transferencia` com o ciclo `A_CONFERIR` → `CONFIRMADO` e estorno derivado por `estorno_de_id`; na B1, só as finalidades sem fatura, empréstimo e adiantamento (essas chegam na B2), mas com as colunas e os `CHECK`s de forma já previstos.
- Repasse entre duas unidades diferentes como invariante do agregado; competência pela data.
- Migration com a imutabilidade simples da confirmada; comandos e HTTP.

## Nota do #228

- `Transferencia.confirmadoPor` no contrato aceita só `UsuarioId`, sem o autor `SISTEMA` que o lançamento tem. Se a migração (TSK-507) trouxer transferências já confirmadas, o contrato e a coluna precisam do tipo do autor, como na TSK-515.

## Critérios de aceite

- Confirmada não muda nem some; correção só por estorno.
- Quem registrou não confirma a própria.

## Referências

- Doc 7 §18.4

_Atualizado em 14/10/2026._
