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

## Decisões do dono (22/11/2026)

- **Confirmar:** `ConfirmarTransferencia`, sem corpo e com `If-Match`. Quem confirma não pode ser quem registrou (`CONFERENTE_E_O_AUTOR`).
- **Motivo:** opcional enquanto `A_CONFERIR`, obrigatório para confirmar.
- **Comprovante:** `comprovanteId` também na transferência. Precisa da coluna correspondente.
- **Registro pela tela:** o front despacha a transferência do formulário para este comando, com finalidade `MOVIMENTACAO_SIMPLES`.
- **Reserva do fundo:** a finalidade nova é `RESGATE_DE_FUNDO`, que carrega o fundo. `APORTE_A_FUNDO` e `RESGATE_DE_FUNDO` admitem origem igual ao destino (reserva dentro da conta vinculada, só marcação). Vêm da edição do fundo (TSK-514). O `CHECK` da finalidade e o FD3 incluem o resgate.

## Critérios de aceite

- Confirmada não muda nem some; correção só por estorno.
- Quem registrou não confirma a própria.

## Referências

- Doc 7 §18.4

_Atualizado em 14/10/2026._
