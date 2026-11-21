# TSK-517: Período contábil: fechar e reabrir com hash e trava

- **Estado:** 🗺️ Planejada (B1)
- **Responsável sugerido:** back (limpio + radix; crivo obrigatório: concorrência)
- **Depende de:** [TSK-515](TSK-515-b1-lancamento.md), [TSK-516](TSK-516-b1-transferencia.md)

## Contexto

Fechamento é o marco da B1. O hash do fechamento inclui lançamentos **e transferências** da competência (decisão do dono, 14/10).

## O que precisa ser feito

- Agregado `PeriodoContabil` por unidade e competência: fechar verifica P1 (zero `A_CONFERIR`, lançamentos e transferências) e P4 (anterior fechado) e calcula o hash na ordem canônica (P2); reabrir exige motivo de 10+ caracteres e grava a reabertura com o hash corrente (P3, só-inserção).
- Trava consultiva por período no repositório: exclusiva ao fechar, compartilhada em quem grava lançamento ou transferência na competência; prova de `READ COMMITTED`.
- Migration com a imutabilidade simples do período fechado.

## Critérios de aceite

- Teste de integração de concorrência: fechar × lançar na mesma competência, com barreira explícita, sem sleep.
- Alterar transferência de mês fechado muda o hash (detectável).

## Referências

- Doc 7 §18.5 e §15

_Atualizado em 14/10/2026._
