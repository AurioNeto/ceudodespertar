# TSK-401: Outbox: evento esgotado trava o agregado

- **Estado:** ✅ Feito (#35, 07/10/2026)
- **Responsável sugerido:** corvinus + limpio
- **Depende de:** [TSK-001](TSK-001-mesclar-pilha-da-fundacao.md)

## Contexto

Com `tentativas >= 10`, o evento sai da seleção mas continua pendente, e o `NOT EXISTS` bloqueia todo evento seguinte do mesmo agregado. Hoje o único sinal é um `logger.error`.

## Como terminou

A decisão mudou o pedido original: **evento esgotado é alerta, não prontidão** (Doc 7 §13 e §28).
- A `/saude/pronta` deixou de olhar os esgotados e os eventos travados atrás deles. Continua olhando o atraso maior que 5 min.
- `VigiaDeEventosEsgotados` emite `error` `outbox: eventos esgotados` quando a contagem muda.
- O runbook para destravar está no Doc 7 §13 (linha "Evento esgotado").

## O que resta

- Ressalvas da vigia (TSK-413).
- O alerta só fica ativo depois do TSK-313.

## Referências

- https://github.com/AurioNeto/ceudodespertar/pull/24
- https://github.com/AurioNeto/ceudodespertar/pull/35

_Atualizado em 07/10/2026._
