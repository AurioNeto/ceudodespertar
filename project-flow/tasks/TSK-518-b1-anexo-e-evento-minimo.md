# TSK-518: Comprovante (anexo no S3) e Evento mínimo

- **Estado:** 🗺️ Planejada (B1)
- **Responsável sugerido:** back (limpio + continuum no S3)
- **Depende de:** [TSK-511](TSK-511-b1-contrato-do-financeiro.md)

## Contexto

Duas dependências laterais da B1: o comprovante do lançamento (o `shared.anexo` foi adiado do B0 para cá) e o Evento mínimo (decisão 6 da TSK-014), que o resultado por cerimônia precisa.

## O que precisa ser feito

Dois PRs:
1. **Anexo:** `shared.anexo` e a porta de armazenamento (SeaweedFS local, compatível com S3), com upload por URL assinada ou pelo servidor (decidir no desenho), tipo e tamanho validados, e o vínculo com o lançamento.
2. **Evento mínimo:** tabela e resumo do evento, sem comandos de inscrição (isso é B5), só o necessário para o lançamento apontar para um evento (a transferência não tem `evento_id`) e para o resultado por cerimônia (TSK-519) ler o resumo do evento.

## Critérios de aceite

- Anexo de outra instituição inacessível.
- Lançamento ligado a evento aparece no resultado por cerimônia (TSK-519).

## Referências

- Doc 7 §10 e §19; Doc 6 §6

_Atualizado em 14/10/2026._
