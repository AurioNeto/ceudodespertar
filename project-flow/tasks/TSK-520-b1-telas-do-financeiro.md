# TSK-520: Telas do financeiro contra a API

- **Estado:** 🛠️ Em andamento (B1). Partes 1 e 2 implementadas na pilha local
- **Responsável sugerido:** front (vitro; frontiteto se nascer tela ou pasta)
- **Depende de:** [TSK-511](TSK-511-b1-contrato-do-financeiro.md)

## Contexto

Passo 7 do Doc 6 §7: trocar o mock por chamada real, uma tela por vez, com a faixa de "dados de demonstração" saindo só da tela que já fala com a API. Cada parte começa quando o endpoint correspondente estiver na `main`.

## O que precisa ser feito

Uma parte por PR, na ordem em que a API fica pronta:
1. Cadastros (unidades, categorias, contas, fundos, pessoa mínima), depois da TSK-513, da TSK-514 e da TSK-512.
2. Registrar lançamento, meus registros e fila de conferência, depois da TSK-515.
3. Lançamentos, estorno e pendência, depois da TSK-515.
4. Transferência e contas e saldos, depois da TSK-516.
5. Fechamento e reabertura, depois da TSK-517.
6. Relatórios (DRE, fluxo de caixa, resultado por cerimônia) e Painel, depois da TSK-519.
- Unidade ativa só pré-preenche e aparece na confirmação do lançamento (decisão do dono, 14/10).
- A escrita passa pela camada de dados (T28a do web).

## Parte 1 · Cadastros

Implementada em `codex/tsk-520-a-cadastros-web`, sobre `codex/tsk-519-consultas-financeiras`. Parâmetros, Contas e Fundos e Pessoas leem e gravam pela API. A aba de saldos usa as consultas da TSK-519 para que a tela já opere inteiramente com dados reais.

- Parâmetros cobre unidades e regimes, categorias e grupos de custo.
- Contas e Fundos cobre os cadastros e os saldos. A transferência fica na parte 4.
- Pessoas cobre busca paginada e cadastro mínimo (tipo, nome e documento). Anamnese, gestão de acesso e parâmetros institucionais seguem seus próprios escopos.
- As gravações respeitam as permissões da sessão. Edições enviam a versão lida em `If-Match`. Criações reutilizam a chave de idempotência ao reenviar os mesmos dados no formulário.

## Parte 2 · Registro e conferência

Implementada em `codex/tsk-520-b-registro-conferencia`, sobre `codex/tsk-520-a-cadastros-web`.

- Registrar grava entradas e saídas como **A conferir**. O comprovante pode ser enviado depois da gravação ou em Meus registros enquanto o lançamento estiver editável.
- Meus registros usa a paginação e as pendências devolvidas pela API. A fila lista as faltas informadas pelo servidor, permite revisar com permissão de leitura do detalhe e confirma individualmente com `If-Match`.
- Quando há uma única unidade ativa, o formulário a sugere. A escolha pode ser alterada e não filtra a fila.
- A fila mostra transferências pendentes, cujas ações entram na parte 4. A conversa da pendência e o estorno entram na parte 3.

As partes 3 a 6 seguem pendentes.

## Critérios de aceite

- Cada tela migrada sem mock e sem a faixa de demonstração; as outras continuam com a faixa.
- Gate do web verde; sem captura de telas.

## Referências

- Doc 4 (telas F-01 a F-23 e Painel); Doc 8; Doc 6 §7

_Atualizado em 06/11/2026._
