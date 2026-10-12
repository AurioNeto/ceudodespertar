# TSK-013: Expurgo das chaves de idempotência e retenção do corpo da resposta

- **Estado:** ✅ Decidido e feito (#36, 07/10/2026)
- **Responsável sugerido:** usuário + radix
- **Depende de:** [TSK-001](TSK-001-mesclar-pilha-da-fundacao.md)

## Contexto

`shared.chave_de_idempotencia` guarda o corpo da resposta (`resposta` jsonb) sem prazo, e a linha vencida (24 h) é só reaproveitada, nunca apagada. Com RLS FORCE e sem BYPASSRLS, o expurgo entre instituições precisa de uma função `SECURITY DEFINER` com dono próprio, no molde dos resolvedores, ou de uma varredura por instituição. Se algum comando devolver dado sensível, ele fica guardado indefinidamente.

## Como terminou

- **Decisões do usuário:**
  - expurgo por **job na API, instituição a instituição**, sem `SECURITY DEFINER` nem `BYPASSRLS`;
  - a marca de rota sensível criada **já agora**.
- O **#36** (`c37ffa2`) fechou a issue #31:
  - `ExpurgoDeChavesDeIdempotencia` roda na subida e de hora em hora, com as rodadas em fila;
  - o `DELETE` respeita a RLS e filtra `instituicao_id` explicitamente;
  - a migração b0-007 cria o índice `(instituicao_id, criada_em)`;
  - `@RespostaSemCorpoNoReplay` faz a rota guardar só o status e o `Location`.
- De quebra, corrigiu um 500 real na corrida entre o expurgo e o reaproveitamento de chave.
- O Doc 7 §12 e §23 foram atualizados.

## O que resta

- As ressalvas da revisão estão no TSK-412.
- O job só roda na aplicação depois do TSK-313 (registro no `AppModule`).
- Os comandos da etapa de pessoas e anamnese (TSK-504) **precisam** usar a marca.

## Referências

- https://github.com/AurioNeto/ceudodespertar/pull/23
- https://github.com/AurioNeto/ceudodespertar/pull/36
- https://github.com/AurioNeto/ceudodespertar/issues/31

_Atualizado em 07/10/2026._
