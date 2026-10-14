# TSK-412: Idempotência: ressalvas da revisão e do expurgo

- **Estado:** 🚧 Parte 1 (expurgo) feita no #219; as lacunas de teste do replay, do cursor da auditoria e do filtro do `gravarResposta` ficam para a parte 2
- **Responsável sugerido:** limpio + radix
- **Depende de:** [TSK-313](TSK-313-ligar-borda-idempotencia-e-outbox-na-aplicacao.md)

## Contexto

Itens que ficaram dos PRs #23, #24 e #36.

## O que precisa ser feito

- ✅ Um `POST` sem `@ModoDeTransacao` (padrão `leitura`) que recebe `Idempotency-Key` dá 500, em vez de seguir sem idempotência ou falhar na partida (#23). Resolvido no #40: a partida recusa rota que muda estado sem modo de transação gravável.
- ✅ Expurgo (#36), alinhado ao expurgo do outbox (#204, #211). Os dois agora herdam a mesma base, `ExpurgoEmLotesPorInstituicao` (`shared/infrastructure/banco/`):
  - ✅ `DELETE` sem lotes. Agora são lotes de 1.000, da chave mais antiga para a mais nova. Cada lote roda na sua transação, com teto de 100 lotes por instituição por rodada. O `DELETE` externo repete a condição de vencida: assim, uma chave reaproveitada no meio do lote é reavaliada na versão nova da linha e fica.
  - ✅ (aceito) Sem advisory lock entre réplicas. O expurgo do outbox também não tem. Duas réplicas na mesma rodada só disputam as mesmas linhas: uma espera o lock da outra, confere de novo, acha a linha já apagada e para cedo naquela instituição. Não há apagamento a mais, só trabalho repetido uma vez por hora. Os dois `DELETE` podem travar as mesmas linhas em ordens diferentes e dar deadlock (`40P01`): é raro, vira `warn` daquela instituição e a rodada seguinte retoma.
  - ✅ Uma falha recorrente gerava só `warn`. Agora, três rodadas seguidas com falha geram `error` `idempotência: expurgo falhando em rodadas seguidas`, uma única vez, e a primeira rodada boa depois dele gera `info` `idempotência: expurgo voltou a funcionar` (Doc 7 §13).
  - ✅ Teste de up/down da b0-007: aplicar, desfazer e reaplicar, conferindo a definição exata do índice.
  - ✅ (aceito) `CREATE INDEX` sem `CONCURRENTLY`. O migrador é transacional com `allOrNothing`, então `CONCURRENTLY` não roda nele (mesma decisão do #204 para a b0-012). A b0-007 já está aplicada; para uma tabela grande num ambiente novo, o caminho é uma janela de manutenção ou suporte do migrador a migração não transacional.
  - (risco aceito, apontado no crivo) A condição de vencida repetida no `DELETE` externo, que garante o recheck da linha reaproveitada, leva o planejador a ler todas as vencidas da instituição a cada lote: com 100 mil vencidas acumuladas, cada lote custou ~19 ms (Seq Scan) e a rodada ~0,9 s. Cada lote continua curto, mas o custo cresce com o acúmulo, e o teste "sem Seq Scan" só cobre poucas vencidas. Rever se o acúmulo real passar dessa ordem.
- O filtro `instituicao_id` de `gravarResposta` não tem teste próprio (mutante provavelmente equivalente por causa da RLS).
- O replay concorrente numa rota com `@RespostaSemCorpoNoReplay` não foi testado em execução.
- O cursor da auditoria usa precisão de milissegundos. Um gravador futuro que dependa do `now()` do banco (microssegundos) faria a paginação pular linhas.
- O replay sai do jsonb com as chaves reordenadas, e os testes comparam o texto bruto. Também há um teste sem asserção ("passa direto quando o método não é POST").

## Critérios de aceite

- Cada item corrigido ou aceito com registro

## Referências

- https://github.com/AurioNeto/ceudodespertar/pull/23#discussion_r4187819660
- https://github.com/AurioNeto/ceudodespertar/pull/36

_Atualizado em 14/10/2026._
