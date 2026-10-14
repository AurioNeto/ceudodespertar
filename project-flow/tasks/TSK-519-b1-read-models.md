# TSK-519: Read models do financeiro

- **Estado:** 🗺️ Planejada (B1)
- **Responsável sugerido:** back (limpio + radix)
- **Depende de:** [TSK-515](TSK-515-b1-lancamento.md), [TSK-516](TSK-516-b1-transferencia.md), [TSK-517](TSK-517-b1-periodo-contabil.md)

## Contexto

Um read model por bloco de tela, cada um com a sua permissão, filtrado na consulta (Doc 6 §2.2). A DRE lê etiquetas; o saldo lê lançamentos e transferências (Doc 7 §18.6).

## O que precisa ser feito

- Efeito por categoria (base), com o estorno negativo.
- Fila de conferência, meus registros, lançamentos, contas e saldos, DRE, fluxo de caixa, resultado por cerimônia e por grupo de custo.
- Decisão do dono (14/10): a unidade ativa **só pré-preenche formulários**; os read models aceitam filtro explícito de unidade, que a tela mostra e deixa remover. Provisória até a tesouraria confirmar (Doc 6 §9.1 #4).

## Critérios de aceite

- Caso da devolução (Doc 6 §2.5.1): receita de 210 estornada; a DRE de setembro mostra contribuição líquida de 100, sem os 210 na despesa.
- Cada read model com teste de permissão e de vazamento entre instituições.

## Referências

- Doc 7 §18.6; Doc 6 §2.2 e §2.5.1

_Atualizado em 14/10/2026._
