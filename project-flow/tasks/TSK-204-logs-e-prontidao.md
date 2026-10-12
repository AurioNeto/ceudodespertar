# TSK-204: Logs com correlação e redação e `/saude/pronta` (#21)

- **Estado:** ✅ Feito (mesclado em 06/10/2026, `675dbbe`)
- **Peça do plano:** F17
- **PR:** [#21](https://github.com/AurioNeto/ceudodespertar/pull/21)
- **Responsável sugerido:** limpio + corvinus
- **Depende de:** [TSK-201](TSK-201-unidade-de-trabalho-e-borda.md)

## Contexto

Observabilidade mínima do B0.

## O que foi entregue

- Logs pino com correlação e redação (`authorization` e corpo nunca vão para o log).
- `/saude/pronta` responde 503 com o banco fora ou o outbox atrasado.

## Como terminou

- O #21 foi mesclado em `feat/b0-f12-unidade-de-trabalho` (`90d6788`) e não chegou à `main`. O mesmo código entrou pelo **#34**, um PR de resgate com pre-review.
- As pendências da revisão foram resolvidas no **#35** (`f15d763`, 07/10):
  - a máscara de CPF não corrompe mais UUIDs (bordas não alfanuméricas; 871 em 200 mil corrompidos antes, 0 depois);
  - o teste de correlação deixou de ser instável;
  - um evento esgotado, e os eventos travados atrás dele, deixam de derrubar a prontidão. O atraso maior que 5 min continua valendo;
  - o alerta `outbox: eventos esgotados` foi criado;
  - a migração b0-006 cria o índice `outbox_esgotados`.
- **Decisões do usuário no #35:**
  - CPF colado em letra (`nº12345678901`) deixa de ser mascarado, porque nenhum fluxo o produz;
  - **risco aceito:** o `detail` dos erros do Postgres (`Key (…)=(…)`, `Failing row contains`) só vaza se alguém logar o objeto do erro. Ele não é redigido nem fixado em teste.

## O que resta

- Ressalvas da vigia de esgotados no TSK-413.

## Referências

- https://github.com/AurioNeto/ceudodespertar/pull/21
- https://github.com/AurioNeto/ceudodespertar/pull/34
- https://github.com/AurioNeto/ceudodespertar/pull/35

_Atualizado em 07/10/2026._
