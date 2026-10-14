# TSK-521: Aceite da B1: casos T e marco do fechamento

- **Estado:** 🗺️ Planejada (B1)
- **Responsável sugerido:** back (testudo) + dono
- **Depende de:** [TSK-519](TSK-519-b1-read-models.md), [TSK-520](TSK-520-b1-telas-do-financeiro.md)

## Contexto

Fecha a etapa. O catálogo executável do Doc 3 §11 (#75) tem 10 casos da B1 (T9 e T13 a T16e); o marco é o fechamento do sistema bater com o da planilha por dois meses seguidos.

## O que precisa ser feito

- Escrever os casos T9 e T13 a T16e e subir `ETAPA_ATUAL` para a B1 (o meta-teste obriga os casos da etapa).
- Percurso 1 do Doc 4 §11, sem conciliação, contra a API.
- Marco operacional com o dono: dois meses de fechamento batendo com a planilha (depende da carga M1 da migração, TSK-507).

## Critérios de aceite

- Casos da B1 verdes e `ETAPA_ATUAL` na B1.
- Fechamento de dois meses consecutivos bate com a planilha.

## Referências

- Doc 6 §6 (marco da B1); Doc 3 §11; TSK-307

_Atualizado em 14/10/2026._
