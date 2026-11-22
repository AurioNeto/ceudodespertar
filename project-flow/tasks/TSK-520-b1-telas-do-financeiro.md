# TSK-520: Telas do financeiro contra a API

- **Estado:** 🗺️ Planejada (B1)
- **Responsável sugerido:** front (vitro) para os hooks; back para a consulta que faltar
- **Depende de:** [TSK-511](TSK-511-b1-contrato-do-financeiro.md)

## Contexto

Passo 7 do Doc 6 §7: trocar o mock por chamada real, uma tela por vez. O front é a fonte da verdade (`AGENTS.md`): a tela continua igual e o backend serve o tipo que ela consome.

A primeira execução desta task, em novembro de 2026, reescreveu as telas para caber na API e foi revertida (`docs/runbooks/restauracao-pr-235.md`). O código dela serve só de leitura de referência; nada é trazido do histórico (decisão do dono, 21/11).

## O que precisa ser feito

Uma tela por PR. Para cada tela, nesta ordem:
1. Inventário de blocos, escrito aqui em "Como ficou": bloco, tipo que consome, rota que serve, fica em mock nesta etapa?
2. Se a rota não devolve o tipo que a tela consome, o backend ganha a consulta nesse formato, em PR próprio de API.
3. PR de web que troca só o miolo dos hooks de dados, no padrão de `pages/sistema/AcessosPage/consultas.ts` e `comandos.ts`.
4. O dono confere a tela ao lado da versão em mock.

Ordem das telas:
1. Parâmetros (piloto: a API de unidades, grupos de custo e categorias já existe). As demais só começam depois de o dono conferir o piloto.
2. Contas e fundo, depois da TSK-514.
3. Registrar lançamento, meus registros e fila de conferência, depois da TSK-515 e da TSK-519.
4. Lançamentos, estorno e pendência, depois da TSK-515 e da TSK-519.
5. Fechamento e reabertura, depois da TSK-517.
6. Relatórios e Painel, depois da TSK-519.

- Bloco que a B1 não serve continua em mock: sugestões do cupom, confiança e origem de captura na fila, conciliação e alerta nos cartões de conta, gráfico de estoque e carrossel de cerimônias do Painel, exportação em PDF. A tela de Pessoas é da B4 e fica inteira em mock; a pessoa mínima da TSK-512 serve só os seletores.
- Conflito entre tela e domínio: parar, descrever as duas opções aqui e esperar o dono (decisão do dono, 21/11).
- Unidade ativa só pré-preenche e aparece na confirmação do lançamento (decisão do dono, 14/10).
- A escrita passa pela camada de dados (T28a do web).

## Critérios de aceite

- Paridade: os testes de tela existentes passam sem alteração, nenhum componente é apagado e `pnpm paridade:web` passa sem o rótulo `tela-alterada-pelo-dono`.
- O diff do PR de web fica em hooks de dados, `consultas.ts`, `comandos.ts`, mocks dos blocos servidos e, quando couber, `app/shell/telas.ts`.
- A `fonte` da tela só vira `'api'`, e a faixa de demonstração só sai, quando o último bloco dela for servido. Os blocos que ficaram em mock estão listados em "Como ficou".
- Gate do web verde; sem captura de telas.

## Referências

- `AGENTS.md`; Doc 4 (telas F-01 a F-23 e Painel); Doc 8; Doc 6 §7; `packages/contracts/src/readmodels.ts`

_Atualizado em 22/11/2026._
