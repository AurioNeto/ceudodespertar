# TSK-519: Read models do financeiro

- **Estado:** 🚧 Implementada em branch empilhada, aguardando revisão
- **Responsável sugerido:** back (limpio + radix)
- **Depende de:** [TSK-515](TSK-515-b1-lancamento.md), [TSK-516](TSK-516-b1-transferencia.md), [TSK-517](TSK-517-b1-periodo-contabil.md), [TSK-518](TSK-518-b1-anexo-e-evento-minimo.md) (parte 2, Evento mínimo, para o resultado por cerimônia)

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

_Atualizado em 05/11/2026._


## Implementação

A branch `codex/tsk-519-consultas-financeiras` parte de `codex/tsk-518-b-evento-minimo`. Os GETs rodam em transação de leitura com RLS, aplicam a permissão do bloco e respondem com `Cache-Control: no-store`.

| GET sob `/api/v1/financeiro` | Permissão |
|---|---|
| `/meus-registros` | `financeiro.lancamento.ler_proprios` |
| `/fila-conferencia` | `financeiro.lancamento.confirmar` |
| `/lancamentos` | `financeiro.lancamento.ler` |
| `/contas/saldos`, `/fundos/saldos` | `financeiro.conta.ler` |
| `/relatorios/dre`, `/relatorios/grupos-de-custo` | `financeiro.dre.ler` |
| `/relatorios/fluxo-de-caixa` | `financeiro.fluxo_caixa.ler` |
| `/relatorios/cerimonias`, `/relatorios/cerimonias/:id` | `financeiro.resultado_evento.ler` |

- Todas as consultas aceitam `unidadeId` explícito. A ausência do filtro abrange a instituição inteira. A fila e o livro exibem repasses em ambas as unidades. Caixa e saldos atribuem cada ponta à unidade correspondente.
- Meus registros seleciona pelo autor da sessão e retorna valor, motivo, data, situação, pendência aberta e referência ao comprovante. As contas, categorias e somas ficam fora dessa projeção.
- A fila inclui lançamentos e transferências a conferir, em ordem de registro do mais antigo ao mais novo. O livro inclui os dois tipos de registro em ordem inversa e marca o original como estornado quando há estorno confirmado. A lista de faltas mostra os dados necessários à conferência e se a soma das etiquetas fecha.
- Meus registros, fila, livro e a coleção de cerimônias aceitam `pagina` e `limite`. O limite padrão é 50 e o máximo é 100. A resposta tem `itens` e `proximaPagina`. O livro e os resultados por grupo ou cerimônia aceitam `competencia=AAAA-MM`. A DRE exige esse filtro.
- A DRE, os resultados de cerimônia e os de grupo partem das etiquetas confirmadas e invertem o sinal do estorno na própria natureza da etiqueta. A DRE agrupa por unidade, competência, linha, natureza e tipo de categoria. A coleção de cerimônias inclui eventos com efeitos no recorte, ordenados pela data do evento. O detalhe resolve o cadastro pela porta pública de eventos e retorna 404 para ids de outra instituição.
- Saldos acumulam o líquido dos lançamentos confirmados e os efeitos das pontas das transferências confirmadas. Fundos exibem o saldo da conta vinculada. O fluxo usa `de` e `ate` inclusivos, por data de caixa, e expõe entradas, saídas e transferências líquidas em centavos. Lançamentos confirmados sem data de caixa entram no saldo e ficam fora do fluxo. Repasses internos se anulam no consolidado.
- As consultas usam as tabelas migradas e agregam no PostgreSQL. Nenhuma migration adicional foi necessária. O contrato da API está em `packages/contracts/src/consultas-financeiras.ts`.

## Validação

Os testes HTTP verificam permissão e isolamento por instituição em todos os endpoints, autoria de Meus registros, pendências, paginação, filtro por unidade, repasse e estorno, datas de caixa e o resultado por cerimônia. A DRE de setembro retornou R$ 100 de receita e R$ 0 de despesa após a devolução de R$ 210. A cobertura direcionada foi de 97,67% das branches e 100% das linhas. A ramificação de falta de conta de destino na transferência ficou fora da medição funcional, pois os comandos da B1 exigem as duas contas.

A revisão Crivo verificou a autorização antes da consulta, a projeção restrita de Meus registros, os vínculos por instituição nos JOINs e as diferenças entre efeito por etiqueta, saldo e caixa. O teste de repasse confere os dois lados e o estorno. Typecheck de API e web, build, lint e fronteiras passaram.

Passaram 2.328 testes unitários da API, 819 de integração e 67 de contratos. A regra estrutural T28a reconhece `rows` como leitura do resultado do Kysely e continua verificando o SQL dos adaptadores de consulta.
