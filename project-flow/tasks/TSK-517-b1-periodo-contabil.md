# TSK-517: Período contábil: fechar e reabrir com hash e trava

- **Estado:** 🚧 Implementada localmente, aguardando revisão e merge
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

_Atualizado em 02/11/2026._


## Implementação (02/11/2026)

Branch `codex/tsk-517-periodos-contabeis`, baseada em `codex/tsk-516-transferencias`. Trabalho local, sem push ou PR.

- `PeriodoContabil` implementa P1–P4. P1 conta lançamentos e transferências A_CONFERIR; repasses contam tanto na unidade de origem quanto na de destino. Registro rápido sem unidade/competência ainda não pertence a um período; atribuí-lo a uma competência fechada é recusado.
- Primeiro fechamento permitido quando não há períodos ou movimentos anteriores da unidade. Havendo histórico anterior, a competência imediatamente anterior precisa existir e estar fechada, inclusive em lacunas. Reabrir um mês não reabre automaticamente os seguintes; P4 é verificado a cada novo fechamento.
- Reabertura exige motivo de 10 a 500 caracteres, sem NUL. Cada reabertura é acrescentada ao histórico, com o hash gravado no fechamento que está sendo reaberto, ator e instante; período, histórico e outbox são persistidos na mesma transação. Não se reutiliza o registro de uma reabertura anterior.
- Hash SHA-256 no formato `cdd.periodo.v1`: unidade, competência, projeção fixa dos lançamentos, etiquetas e transferências. Chaves e coleções são ordenadas de forma canônica; instantes são normalizados em UTC com microssegundos. A projeção exclui status derivados, conversas e carimbos técnicos de transação. Novos campos exigem decisão de versionamento do formato; não entram implicitamente por uma nova coluna do banco.
- Estorno na competência corrente preserva o hash da competência original. A consulta de integridade compara o hash salvo ao conteúdo atual; período aberto informa `integro: null`. Alterações de transferências e etiquetas feitas pelo dono contornando as guardas foram detectadas nos testes. A comparação não restaura dados nem substitui backup.

## Concorrência e banco

- Chave de trava inclui instituição, unidade e competência. Fechar toma exclusiva no período e compartilhada no anterior; reabrir toma exclusiva no período. Escritores tomam compartilhadas, mantidas até commit/rollback. Edições protegem origem e destino de uma só vez; repasses protegem ambas as unidades. As chaves são deduplicadas e adquiridas em ordem global para evitar impasses.
- `SituacaoDoPeriodoKysely` substitui `PeriodosSemFechamento`. Comandos verificam o período protegido, e repositórios de lançamento e transferência também recusam escrita direta em período fechado. A borda de escrita continua em READ COMMITTED: quem espera a trava relê o estado já confirmado pela outra transação.
- Migration `b1-006-periodo-contabil`: duas tabelas novas, RLS forçada, FKs compostas por instituição, versão otimista, índice não único por unidade/competência e histórico só-inserção. Guarda SQL mantém identidade e impede alteração ou exclusão do fechado, admitindo a transição de reabertura. Motivo, P1–P4 e vínculo entre reabertura e comando são regras da aplicação.
- Unicidade de unidade/competência fica na aplicação, sem UNIQUE de negócio. Chamadas que usam o protocolo no mesmo PostgreSQL são serializadas; SQL manual, cargas externas e escritores que não coordenam essas travas ficam fora. Duplicação externa ou corrida fora do protocolo dispara `PERIODOS_CONTABEIS_DUPLICADOS` e interrompe a leitura ambígua.
- Sem backfill, instalação de dependências ou execução em banco de produção. Rollback testado remove as duas tabelas e a função nova, preservando contas, lançamentos e transferências. Esse rollback apaga o histórico contábil novo; em ambiente com dados reais exige preservá-lo antes.

## Endpoints

Prefixo `/api/v1/financeiro/periodos/:unidadeId/:competencia`, com competência AAAA-MM e ano positivo.

| Método | Caminho | Permissão | Corpo |
|---|---|---|---|
| GET | `/` | `financeiro.periodo.fechar` ou `financeiro.periodo.reabrir` | — |
| GET | `/integridade` | Mesmas permissões do GET | — |
| POST | `/fechar` | `financeiro.periodo.fechar` | `{}` |
| POST | `/reabrir` | `financeiro.periodo.reabrir` | `{"motivo":"Revisar classificação"}` |

Os POSTs retornam 200 e exigem `If-Match`. Primeiro fechamento usa versão **0**; o período criado retorna versão 1. Se já existir, usar a versão do GET. GET antes do primeiro fechamento retorna 404. Reabertura e novos fechamentos incrementam a versão.

Resposta de integridade: `{"hashGravado":"<sha256>","hashAtual":"<sha256>","integro":true}`. Se o conteúdo divergir, `integro` é false. No período reaberto, `hashGravado` e `integro` são null.

Respostas têm `Cache-Control: no-store`. Replay com `Idempotency-Key` preserva status, sem guardar ou devolver corpo sensível; reler o período. Motivo da reabertura não vai no payload do outbox. Autor e hash não são aceitos do cliente.

## Validação

- 27 testes de domínio e aplicação novos, com 100% de branches, linhas e funções.
- 31 testes de integração específicos: HTTP, permissões, isolamento, integridade, UTC, imutabilidade, histórico, unicidade na aplicação, versão, rollback e concorrência. Novos adaptadores, repositório, travas e controller com 100% de branches, linhas e funções.
- Concorrência com barreiras reais no PostgreSQL, sem sleep: fechamento antes de P1/hash bloqueia escritor, que relê fechado após commit; escritor com compartilhada bloqueia fechamento, que encontra o pendente após commit. O teste confere `transaction_isolation = read committed`. Dois primeiros fechamentos concorrentes produzem um único período.
- Regressão do financeiro: 197 testes de integração passaram na medição ampla; os novos testes de persistência também passaram na execução direcionada.

- Validação final: 2.328 testes da API passaram, com 30 `todo` existentes; integração completa: 791 passaram; contratos: 67 passaram. Typecheck de API/web, lint, fronteiras, build de contracts/API e conferência do codegen passaram.

## Crivo — revisão da TSK-517

- **Verificado:** P1 nas duas unidades do repasse; P4 e início do histórico; travas anteriores às leituras do fechamento e mantidas até commit; ordem global nas edições e repasses; READ COMMITTED; atomicidade do histórico/outbox; versão otimista; RLS, permissões e replay sem corpo.
- **Questões esclarecidas:** o hash tem projeção e formato fixos, sem carimbo transacional nem estado derivado; a variação de fuso encontrada na validação foi corrigida com normalização UTC preservando microssegundos, e o teste de regressão passou. Reabertura registra o hash do fechamento corrente, em uma linha nova na mesma transação.
- **Limites explícitos:** SQL manual e cargas que contornam o protocolo não recebem as regras de negócio nem as travas; a consulta de integridade detecta alterações do conteúdo incluído no hash. Dados sem unidade/competência ainda não pertencem a um fechamento. Integração das telas é da TSK-520; relatórios são da TSK-519.
- **Problemas confirmados:** nenhum bloqueante pendente.
- **Parecer:** APPROVED para o escopo da tarefa. Nenhum push, PR ou deploy realizado.
