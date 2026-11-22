# TSK-515: Lançamento: etiquetas, conferência e estorno

- **Estado:** 🗺️ Planejada (B1)
- **Responsável sugerido:** back (limpio + radix; crivo obrigatório: dinheiro)
- **Depende de:** [TSK-512](TSK-512-b1-pessoa-minima.md), [TSK-514](TSK-514-b1-cadastros-conta-fundo.md)

## Contexto

O coração da B1. Decisões do dono (14/10): natureza do lançamento é a do líquido e a etiqueta segue a categoria (Doc 7 #2); estorno com a natureza do original e efeito negativo (Doc 7 #3); lançamento que entra confirmado por integração ou migração tem o **sistema** como `confirmadoPor` (autor `SISTEMA`), com a origem registrada.

## O que precisa ser feito

Dividir em três PRs:
1. **Agregado e banco:** `Lancamento` com etiquetas (soma com sinal fecha no líquido; `ETIQUETAS_NAO_FECHAM`, `CATEGORIA_OBRIGATORIA`), L1–L11 como testes de domínio com o nome da regra; migration com a imutabilidade simples do confirmado e a guarda das etiquetas por `gravado_na_transacao` (Doc 7 §18.2 e §15).
2. **Comandos e HTTP:** registrar (rápido, `A_CONFERIR` sem etiqueta), editar e descartar `A_CONFERIR`, confirmar (com etiquetas no mesmo ato), estornar (lançamento novo com `estorno_de_id`, na competência corrente, motivo obrigatório). Quem registrou **pode** confirmar o próprio lançamento (decisão do dono, 14/10): o Doc 2 não pede a segregação (L10 e L11 só tratam da pendência), e numa casa pequena a tesouraria registra e confere. A segregação vale só na transferência (TSK-516).
3. **Pendência:** abrir e responder a conversa do lançamento.
- Todo comando grava na competência só se o período estiver aberto (a trava do período vem na TSK-517; aqui, a verificação pelo domínio).
- `evento_id` nasce aqui como referência por id, sem FK: nenhuma FK cruza schema (Doc 7 §5). Por isso a TSK-515 não espera a TSK-518; quem precisa do evento existir é o resultado por cerimônia (TSK-519).

## Decisões do dono (22/11/2026)

- **Etiqueta sem valor enquanto `A_CONFERIR`:** o registro só marca as categorias. A conferência informa o valor de cada uma, e confirmar exige todas com valor e a soma fechada (`ETIQUETAS_NAO_FECHAM`, `CATEGORIA_OBRIGATORIA`). Na tabela de etiquetas, o valor aceita nulo.
- **Registrar já confirmado:** `confirmarNoRegistro: true`, só para quem tem `financeiro.lancamento.confirmar` (sem a permissão, `SEM_PERMISSAO`). O contrato exige etiquetas todas com valor e motivo, e o agregado confere a soma. O pedido por campo do comando é decisão do orquestrador.
- **Valor composto:** `parcelas` (de 2 a 20, somando o valor) abre uma pendência automática na conferência e não nasce confirmado.
- **Motivo:** opcional enquanto `A_CONFERIR`, obrigatório para confirmar (`MOTIVO_OBRIGATORIO`). A coluna aceita nulo.
- **Quem adiantou:** `reembolsoATexto` na B1, exclusivo com `reembolsoAId` (B4). Precisa da coluna correspondente na tabela de lançamento.
- **Devolver:** `DevolverLancamento { motivo }`. O lançamento continua `A_CONFERIR`, com `devolucao: { motivo, devolvidoPor, devolvidoEm }`, e some da fila enquanto estiver devolvido. Quando quem registrou edita e salva, a marca sai e ele volta à fila. Não há status novo nem comando de reenvio.
- **Comprovante:** `comprovanteId` aponta para o anexo da TSK-518.
- **Versão na leitura:** `ItemNaFila` e `LancamentoNaLista` trazem `versao` para o `If-Match`. A API sempre devolve a versão; no tipo ela é opcional (decisão do orquestrador).
- **Travas na tela, sem mudar o contrato:** o lote pula o item sem categoria; o estorno só aparece em confirmado e pede motivo.
- **Conversões de forma no hook de dados do front:** tipo em natureza, nome em id, formato de data, corrigir e aprovar como editar e depois confirmar, lote como uma chamada por item.

## Critérios de aceite

- Caso Aline (20 líquido; 70 + 50 de despesa e 100 de receita) como teste de domínio.
- Confirmado não muda nem some; etiqueta de confirmado só muda na transação que confirmou.
- Teste de vazamento entre instituições.

## Referências

- Doc 7 §18.2, §18.3, §15 e §21; issue #11 (D1, D4)

_Atualizado em 14/10/2026._
