# TSK-516: Transferência com conferência e estorno

- **Estado:** 🚧 Implementada localmente, aguardando revisão e merge
- **Responsável sugerido:** back (limpio; crivo obrigatório: dinheiro)
- **Depende de:** [TSK-515](TSK-515-b1-lancamento.md)

## Contexto

Decisões do dono (14/10): a transferência tem o ciclo do lançamento e fica imutável depois de confirmada (Doc 7 #7); quem confirma usa **a mesma permissão de conferir lançamento**, sem código novo, e quem registrou não confirma a própria; a transferência **entra no hash** do período.

## O que precisa ser feito

- Agregado `Transferencia` com o ciclo `A_CONFERIR` → `CONFIRMADO` e estorno derivado por `estorno_de_id`; na B1, só as finalidades sem fatura, empréstimo e adiantamento (essas chegam na B2), mas com as colunas e os `CHECK`s de forma já previstos.
- Repasse entre duas unidades diferentes como invariante do agregado; competência pela data.
- Migration com a imutabilidade simples da confirmada; comandos e HTTP.

## Nota do #228

- `Transferencia.confirmadoPor` no contrato aceita só `UsuarioId`, sem o autor `SISTEMA` que o lançamento tem. Se a migração (TSK-507) trouxer transferências já confirmadas, o contrato e a coluna precisam do tipo do autor, como na TSK-515.

## Critérios de aceite

- Confirmada não muda nem some; correção só por estorno.
- Quem registrou não confirma a própria.

## Referências

- Doc 7 §18.4

_Atualizado em 02/11/2026._


## Implementação (02/11/2026)

Branch local `codex/tsk-516-transferencias`, baseada em `codex/tsk-515-c-pendencias`. Sem push ou PR.

- Agregado, comandos e API para `MOVIMENTACAO_SIMPLES`, `APORTE_A_FUNDO` e `REPASSE_ENTRE_UNIDADES`. As duas contas e a unidade são obrigatórias na B1; contas devem ser distintas e o repasse exige outra unidade. Referências precisam existir, estar ativas e pertencer à instituição autenticada. Aporte exige que o destino seja a conta vinculada ao fundo.
- `A_CONFERIR` permite edição e descarte; confirmação usa `financeiro.lancamento.confirmar` e recusa o registrador original, mesmo após edição por terceiros. O autor vem da sessão. Confirmada não muda nem some, inclusive por SQL direto.
- Estorno preserva contas, finalidade e valor do original e nasce **A_CONFERIR**, com motivo e data corrente em São Paulo. Precisa da conferência de outra pessoa para produzir efeito. `estornadaPorId` só aponta para estorno confirmado; a solicitação pendente já impede outra solicitação. Estorno pendente pode ser descartado e solicitado novamente; não pode ser editado. Não há estorno de estorno.
- Migration `b1-005-transferencia`: tabela nova, RLS forçada, FKs compostas por instituição, versão otimista, índices de consulta e CHECKs de forma das sete finalidades. FKs para fatura, empréstimo e adiantamento ficam para as respectivas tabelas da B2. Sem backfill. Outbox e transferência são gravados na mesma transação, sem motivo no payload.
- Unicidade de estorno é regra da aplicação, sem `UNIQUE` de negócio. SQL manual e cargas fora dos comandos não são alcançados; duas solicitações simultâneas ainda podem criar duplicatas. A leitura detecta múltiplos estornos e registra `ESTORNOS_DE_TRANSFERENCIA_DUPLICADOS`, priorizando o confirmado. A correção dessa anomalia requer intervenção.
- Períodos das duas unidades são verificados; edição verifica também a competência de destino. Estorno verifica a competência corrente, preservando a original. Até a TSK-517, `PeriodosSemFechamento` considera todos abertos; persistência, trava concorrente e hash do período entram naquela tarefa. Saldo, extrato e sinal inverso do estorno nas consultas entram na TSK-519; transferência não cria receita, despesa ou etiqueta.
- O contrato de `confirmadoPor` continua aceitando apenas usuário. Transferências importadas já confirmadas por SISTEMA dependem da ampliação indicada na TSK-507.

## Endpoints

Prefixo `/api/v1/financeiro/transferencias`. Alterações de recurso existente exigem `If-Match` com a versão lida.

| Método | Caminho | Permissão |
|---|---|---|
| POST | `/` | `financeiro.transferencia.registrar` |
| GET | `/:id` | `financeiro.conta.ler` ou `financeiro.transferencia.registrar` (somente do autor) |
| PUT | `/:id` | `financeiro.transferencia.registrar` (somente do autor) ou `financeiro.lancamento.confirmar` |
| DELETE | `/:id` | Mesma regra do PUT, somente A_CONFERIR |
| POST | `/:id/confirmar` | `financeiro.lancamento.confirmar`; corpo `{}` |
| POST | `/:id/estornar` | `financeiro.lancamento.estornar`; corpo `{"motivo":"Correção"}` |

Registro e estorno retornam `201` com `Location`; conferência, edição e descarte retornam `200`. Respostas usam `Cache-Control: no-store`. Com `Idempotency-Key`, replay de POST preserva status e Location sem devolver ou persistir o corpo sensível; o cliente relê o recurso.

Exemplo de registro (substituir os ids por cadastros ativos da instituição):

```json
{"finalidade":"MOVIMENTACAO_SIMPLES","valor":2000,"data":"2026-10-01","motivo":"Transferência","contaOrigemId":"0198a3c0-0000-7000-8000-0000000000c1","contaDestinoId":"0198a3c0-0000-7000-8000-0000000000c2","unidadeId":"0198a3c0-0000-7000-8000-000000000001"}
```

## Validação

- 77 testes de domínio e aplicação; 100% de branches, linhas e funções no novo domínio e nos comandos.
- 28 testes de integração direcionados: HTTP, permissões, isolamento, versão, concorrência de conferência, replay, SQL imutável, outbox transacional, detecção de duplicatas, CHECKs e reversão/reaplicação da migration. Novos endpoints e repositório com 100% de branches, linhas e funções.
- Integração completa: 750 testes passaram; os dez testes adicionais de persistência também passaram na execução direcionada. Contratos: 64 testes passaram.

- Suíte completa da API: 2.300 testes passaram e 30 `todo` existentes. Typecheck de API/web, lint, regras de fronteira, build de contracts/API e verificação do codegen passaram, usando dependências locais.

## Crivo — revisão da TSK-516

- **Verificado:** domínio sem dependência de framework; referências resolvidas por portas; autoria da sessão; autorização antes da versão para registro alheio; conferência segregada também no estorno; preservação do original; imutabilidade SQL; isolamento, versão otimista e outbox na transação; reversão da migration e tipos gerados.
- **Questões esclarecidas:** o estorno só produz efeito depois da segunda conferência; período real, hash e saldo dependem de tarefas seguintes, sem afirmar que já foram entregues. A duplicação concorrente é limite explícito da regra na aplicação, com detecção testada, conforme a diretriz de unicidade do projeto.
- **Problemas confirmados:** nenhum bloqueante pendente. Os cinco CHECKs nomeados de forma foram registrados no catálogo de guardas internas; a validação correspondente e os erros de negócio ficam na aplicação.
- **Parecer:** APPROVED para o escopo desta tarefa. Nenhum push, PR ou deploy realizado.
