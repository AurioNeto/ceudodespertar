# TSK-515: Lançamento: etiquetas, conferência e estorno

- **Estado:** 🗺️ Planejada (B1)
- **Responsável sugerido:** back (limpio + radix; crivo obrigatório: dinheiro)
- **Depende de:** [TSK-512](TSK-512-b1-pessoa-minima.md), [TSK-514](TSK-514-b1-cadastros-conta-fundo.md)

## Contexto

O coração da B1. Decisões do dono (14/10): natureza do lançamento é a do líquido e a etiqueta segue a categoria (Doc 7 #2); estorno com a natureza do original e efeito negativo (Doc 7 #3); lançamento que entra confirmado por integração ou migração tem o **sistema** como `confirmadoPor` (autor `SISTEMA`), com a origem registrada.

## O que precisa ser feito

Dividir em três PRs:
1. **Agregado e banco:** `Lancamento` com etiquetas (soma com sinal fecha no líquido; `ETIQUETAS_NAO_FECHAM`, `CATEGORIA_OBRIGATORIA`), L1–L11 como testes de domínio com o nome da regra; migration com a imutabilidade simples do confirmado e a guarda das etiquetas por `gravado_na_transacao` (Doc 7 §18.2 e §15).
2. **Comandos e HTTP:** registrar (rápido, `A_CONFERIR` sem etiqueta), editar e descartar `A_CONFERIR`, confirmar (com etiquetas no mesmo ato), estornar (lançamento novo com `estorno_de_id`, na competência corrente, motivo obrigatório). Quem registrou não confirma o próprio, se o Doc 2 assim pedir.
3. **Pendência:** abrir e responder a conversa do lançamento.
- Todo comando grava na competência só se o período estiver aberto (a trava do período vem na TSK-517; aqui, a verificação pelo domínio).

## Critérios de aceite

- Caso Aline (20 líquido; 70 + 50 de despesa e 100 de receita) como teste de domínio.
- Confirmado não muda nem some; etiqueta de confirmado só muda na transação que confirmou.
- Teste de vazamento entre instituições.

## Referências

- Doc 7 §18.2, §18.3, §15 e §21; issue #11 (D1, D4)

_Atualizado em 14/10/2026._
