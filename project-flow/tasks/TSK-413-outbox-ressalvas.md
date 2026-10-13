# TSK-413: Outbox: evento sem consumidor, log do ciclo e vigia

- **Estado:** 🚧 Em implementação (evento sem consumidor e log do ciclo em PR; UoW, vigia e `listarIdsDasInstituicoes` compartilhado no PR seguinte)
- **Responsável sugerido:** limpio + corvinus
- **Depende de:** [TSK-313](TSK-313-ligar-borda-idempotencia-e-outbox-na-aplicacao.md)

## Contexto

Achados do #24 e ressalvas da vigia do #35.

## O que precisa ser feito

- ✅ Evento sem consumidor registrado é publicado em silêncio, e se perde quando duas versões convivem no deploy. Agora vira falha com backoff (esgota e alerta se ninguém consumir); tipos sem consumidor de propósito são declarados com `@EventosSemConsumidor`.
- ✅ O log de falha do ciclo usa o formatador do consumidor: rotula falha de infraestrutura como "o consumidor falhou" e descarta a causa. Agora é `outbox: falha de infraestrutura no ciclo do despachante` com a cadeia de causas (classe, SQLSTATE ou código do Node, constraint).
- O despachante importa o adaptador MikroORM da UoW e reimplementa o vínculo de instituição.
- Vigia de esgotados:
  - compara só a quantidade, então um esgotado resolvido e outro novo no mesmo minuto não geram alerta;
  - o alerta se repete em cada task e a cada restart;
  - o `setInterval` não impede verificações sobrepostas. Encadear como no expurgo (#36).
- Quando houver deploy (TSK-012): filtro de métrica ou Sentry para `outbox: eventos esgotados`.

## Critérios de aceite

- Evento sem consumidor fica pendente ou alerta, e não some
- Log do ciclo com a causa real

## Referências

- https://github.com/AurioNeto/ceudodespertar/pull/24#discussion_r4187819829
- https://github.com/AurioNeto/ceudodespertar/pull/24#discussion_r4187819980
- https://github.com/AurioNeto/ceudodespertar/pull/24#discussion_r4187820143
- https://github.com/AurioNeto/ceudodespertar/pull/35

_Atualizado em 13/10/2026._
