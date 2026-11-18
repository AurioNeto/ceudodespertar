# TSK-515: Lançamento: etiquetas, conferência e estorno

- **Estado:** 🚧 Partes A, B e C implementadas em branches empilhadas, aguardando revisão e merge
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

## Critérios de aceite

- Caso Aline (20 líquido; 70 + 50 de despesa e 100 de receita) como teste de domínio.
- Confirmado não muda nem some; etiqueta de confirmado só muda na transação que confirmou.
- Teste de vazamento entre instituições.

## Referências

- Doc 7 §18.2, §18.3, §15 e §21; issue #11 (D1, D4)

_Atualizado em 02/11/2026._

## Implementação (02/11/2026)

- Parte A: agregado com snapshots isolados e eventos sem conteúdo livre; registro incompleto, confirmação, estorno corrente e conversa modelados; migração `b1-004-lancamento` com RLS, trava otimista, outbox e guardas de imutabilidade do confirmado e das etiquetas por transação. Reversão testada; sem backfill, só tabelas novas.
- A unicidade de estorno e de pendência aberta é verificada na aplicação. Não há índice único de negócio nas tabelas novas. SQL manual e cargas que não usam os comandos ficam fora dessa regra; uma corrida entre estornos simultâneos pode produzir duplicatas. A leitura de estornos detecta mais de um e emite o alarme `ESTORNOS_DUPLICADOS` para intervenção. A versão do agregado protege edições e conversas simultâneas que passam pelo repositório.
- Decisões atuais do Doc 7 prevalecem sobre L3 e L9 históricos: natureza por etiqueta; estorno na competência corrente sem tocar no original. A soma e as regras de política ficam no domínio, sem gatilhos de negócio.

- Parte B: comandos e endpoints de registrar, consultar por id (todos ou próprios), editar, confirmar, descartar e estornar. Natureza da etiqueta é resolvida pela categoria, com validação de regime, situação e instituição; fundos restringem saídas. Versões, idempotência sem guardar corpo e datas no fuso de São Paulo foram testadas. Consulta de listagens e relatórios é da TSK-519.
- Até a TSK-517 não há períodos fechados persistidos: `SituacaoDoPeriodo` recebe `PeriodosSemFechamento`, e os testes substituem a porta para provar as recusas em período fechado. A trava concorrente entre fechamento e escrita será ligada na TSK-517. Na edição verificam-se origem e destino; no estorno só a competência corrente, preservando o mês original.
- Faturas e comprovantes não verificáveis nesta etapa são recusados; suas referências serão liberadas com a B2 e a TSK-518. Despesa em conta pessoal não se confirma até existir o adiantamento da B2 (CT2), sem impedir o registro preliminar.
- Validação da parte B: 32 testes HTTP e 100% de cobertura de branches dos casos de uso; parte A: 40 testes de domínio e 100% de branches. Integração do repositório e guardas: cinco testes, mais a suíte de garantias do banco. Crivo conferiu autorização antes da versão para registros alheios, preservação do original no estorno, reversão da migração e limites desta etapa; nenhuma correção bloqueante pendente.

- Parte C: abrir e responder pendências com `If-Match`; o destinatário vem do registrador, não do corpo. Uma resposta não confirma o lançamento. Uma pergunta aberta impede confirmação, e uma nova pergunta pode ser aberta depois da resposta, preservando o histórico. A versão do agregado impede perda de resposta e duas perguntas abertas em requisições concorrentes.

## Branches e bases

| Branch | Base | Entrega |
|---|---|---|
| `codex/tsk-515-a-agregado-banco` | `codex/tsk-512-pessoa-minima` | Agregado, migração, repositório e testes de domínio/banco |
| `codex/tsk-515-b-comandos-http` | `codex/tsk-515-a-agregado-banco` | Comandos, consulta individual e endpoints financeiros |
| `codex/tsk-515-c-pendencias` | `codex/tsk-515-b-comandos-http` | Endpoints da conversa, testes finais e documentação |

## Endpoints

Prefixo `/api/v1/financeiro/lancamentos`. Todas as escritas em recurso existente exigem `If-Match`.

| Método | Caminho | Permissão |
|---|---|---|
| POST | `/` | `financeiro.lancamento.registrar` |
| GET | `/:id` | `financeiro.lancamento.ler` ou `ler_proprios` (apenas do autor) |
| PUT | `/:id` | `registrar` (apenas do autor) ou `confirmar` |
| DELETE | `/:id` | `registrar` (apenas do autor) ou `confirmar` |
| POST | `/:id/confirmar` | `financeiro.lancamento.confirmar` |
| POST | `/:id/estornar` | `financeiro.lancamento.estornar` |
| POST | `/:id/pendencias` | `financeiro.lancamento.confirmar` |
| POST | `/:id/pendencias/:pendenciaId/resposta` | `registrar` ou `confirmar`; domínio exige o destinatário |

Exemplos ilustrativos (ids devem pertencer à instituição autenticada):

```json
{"natureza":"DESPESA","valor":2000,"motivo":"Flores"}
```

Esse registro rápido devolve `201`, `Location` e o lançamento `A_CONFERIR` na versão 1. Antes de confirmar, o PUT precisa informar conta, unidade e data de competência; as etiquetas recebem `categoriaId` e `valor` em centavos. A natureza da etiqueta vem da categoria, nunca do cliente. A confirmação aceita `{}` para usar as etiquetas existentes ou `{"etiquetas":[{"categoriaId":"<id da categoria>","valor":2000}]}` para ajustá-las no mesmo ato.

Abertura: `{"texto":"De qual cerimônia?"}`; resposta: `{"texto":"Da cerimônia de outubro"}`. Ambos devolvem o lançamento e a conversa na versão nova, com status `A_CONFERIR`. Estorno: `{"motivo":"Correção da classificação"}`; devolve `201` e `Location` para um novo confirmado. O original mantém status, versão e conteúdo; `estornadoPorId` é derivado da consulta.

Com `Idempotency-Key`, o primeiro POST devolve o corpo normalmente; o replay devolve o mesmo status e `Location`, quando houver, sem corpo. O cliente deve reler o recurso; na conversa, pode usar o id conhecido do lançamento. Motivo, pergunta e resposta não são copiados para o payload do outbox.

## Evidências finais

- Suíte completa da API: 2.222 testes passando e 30 `todo`; integração completa: 732 testes passando; contratos: 64 testes passando. Typecheck da API e do web, lint, fronteiras, build de contracts/API e conferência do codegen passaram.

- Domínio: 40 testes, 100% de branches.
- Integração direcionada: 47 testes, 100% de branches nos novos casos de uso, endpoints e adaptadores (incluindo repositório e porta de período).
- Migração: ida/volta, RLS, imutabilidade do confirmado e das etiquetas, tentativa de forjar o carimbo, isolamento, versão otimista, cadastro confirmado por SISTEMA e detecção de duplicação por escrita externa verificados.
- Os testes de migrações anteriores revertem primeiro a nova migração dependente; as migrações antigas não foram alteradas.
- Não foi necessária instalação de dependências. Verificações usaram os binários locais; o codegen foi chamado pelo script existente, com o adaptador temporário de comando fora do repositório já usado na TSK-512.

## Crivo — revisão da TSK-515

- Verificado: soma do caso Aline e limites numéricos; autorização de registros próprios antes da versão; escopo por instituição; rollback de erros; imutabilidade sem mudança do original no estorno; conversa restrita ao destinatário; cobertura e correspondência dos tipos gerados.
- Questões conferidas: o que ocorre com competência fechada, integrações, adiantamento ainda não disponível e carga externa duplicada. Os limites estão documentados acima e não foram apresentados como entregues.
- Problema confirmado nos testes antigos: reversão sem remover a dependência nova; corrigido na preparação dos testes.
- Parecer: APPROVED, sem bloqueios de implementação pendentes. O risco de corrida entre estornos sem trava de unicidade de banco permanece como limite deliberado das instruções de unicidade; o alarme é verificado em teste.
