# TSK-403: Outbox: flush fora do timer, timeout fora da config e conexão read-only

- **Estado:** ✅ Feito (#230): o flush corre dentro do limite de duração; `TIMEOUT_DO_CONSUMIDOR_EM_MS` validado na partida; o reset de `read_only` não foi preciso (o pool só serve a unidade de trabalho)
- **Responsável sugerido:** limpio
- **Depende de:** [TSK-001](TSK-001-mesclar-pilha-da-fundacao.md)

## Contexto

O flush do consumidor respeita o `statement_timeout` por statement, mas não na soma. `TIMEOUT_DO_CONSUMIDOR_EM_MS` é lido de `process.env` fora da config Zod. Depois de um aborto, a conexão volta ao pool com `default_transaction_read_only = on`.

## O que precisa ser feito

- ✅ O flush agora roda dentro do temporizador. A reação e o flush do que ela gravou pelo ORM correm juntos contra o limite da aplicação (`reagirEGravar`), e cada statement continua sob o `statement_timeout`.
  - O teste da soma usa um gatilho que faz cada `INSERT` levar 150 ms (abaixo dos 200 ms do `statement_timeout`) e um flush com 4 inserts (600 ms, acima dos 450 ms do temporizador).
  - Antes, o evento saía publicado com as 4 linhas. Agora o ciclo aborta por `ErroDeTimeoutDoConsumidor`, sem efeito nem `evento_processado`.
- ✅ `TIMEOUT_DO_CONSUMIDOR_EM_MS` passa por um esquema Zod no `lerTimeoutDoConsumidorEmMs`, no molde do esquema do banco, porque o `EventosModule` sobe sem o `ConfiguracaoModule` nos testes de eventos (`test/eventos/apoio.ts`).
  - O valor aceito é um inteiro de 1 até o maior atraso do `setTimeout` menos a folga; acima disso, o Node dispararia o temporizador em 1 ms.
  - Ausente, vale o padrão de 30 s. Inválido, impede a partida com `ErroDeAmbienteInvalido`, que o CLI já trata. Antes, caía em silêncio no padrão.
- ✅ (registrado) `reset default_transaction_read_only` na reserva da conexão **não** foi feito, porque não há uso do pool fora da unidade de trabalho:
  - o migrador (`src/banco/cli.ts`) tem ORM próprio;
  - a prontidão usa um pool `pg` à parte;
  - o `RegistroDasEntidadesDaIdentidade` só registra entidades.

  - (risco aceito, apontado no crivo) Depois do aborto, um statement atrasado do consumidor ainda pode chegar à conexão durante o `rollback` (o kysely não espera o `rollback` antes de mandar o próximo). Normalmente ele roda antes do `BEGIN` da próxima transação e é recusado pelo `default_transaction_read_only`. Para escrever, precisaria de um statement que não seja DML ou de um gancho assíncrono do flush passando entre o `rollback` e o `BEGIN` seguinte. Nenhum dos dois existe hoje.

  A unidade de trabalho abre toda transação gravável com `set transaction read write`. O teste novo, com pool de 1 conexão, prova que, depois do aborto, a sessão fica com `default_transaction_read_only = on` e a escrita pela unidade de trabalho continua funcionando nela. Se surgir uso do pool fora da unidade de trabalho, o reset entra na reserva da conexão.

## Critérios de aceite

- Teste da soma de statements
- Timeout validado na config

## Referências

- https://github.com/AurioNeto/ceudodespertar/pull/24
- https://github.com/AurioNeto/ceudodespertar/pull/24#discussion_r4188586190
- https://github.com/AurioNeto/ceudodespertar/pull/24#discussion_r4188585921

_Atualizado em 30/10/2026._
