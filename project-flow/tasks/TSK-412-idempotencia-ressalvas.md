# TSK-412: Idempotência: ressalvas da revisão e do expurgo

- **Estado:** 📌 Backlog técnico
- **Responsável sugerido:** limpio + radix
- **Depende de:** [TSK-313](TSK-313-ligar-borda-idempotencia-e-outbox-na-aplicacao.md)

## Contexto

Itens que ficaram dos PRs #23, #24 e #36.

## O que precisa ser feito

- ✅ Um `POST` sem `@ModoDeTransacao` (padrão `leitura`) que recebe `Idempotency-Key` dá 500, em vez de seguir sem idempotência ou falhar na partida (#23). Resolvido no #40: a partida recusa rota que muda estado sem modo de transação gravável.
- Expurgo (#36):
  - `DELETE` sem lotes: um acúmulo grande vira um `DELETE` longo;
  - sem advisory lock entre réplicas, o que só desperdiça trabalho;
  - uma falha recorrente só gera `warn`, sem alerta;
  - sem teste de up/down da b0-007;
  - `CREATE INDEX` sem `CONCURRENTLY`.
- O filtro `instituicao_id` de `gravarResposta` não tem teste próprio (mutante provavelmente equivalente por causa da RLS).
- O replay concorrente numa rota com `@RespostaSemCorpoNoReplay` não foi testado em execução.
- O cursor da auditoria usa precisão de milissegundos. Um gravador futuro que dependa do `now()` do banco (microssegundos) faria a paginação pular linhas.
- O replay sai do jsonb com as chaves reordenadas, e os testes comparam o texto bruto. Também há um teste sem asserção ("passa direto quando o método não é POST").

## Critérios de aceite

- Cada item corrigido ou aceito com registro

## Referências

- https://github.com/AurioNeto/ceudodespertar/pull/23#discussion_r4187819660
- https://github.com/AurioNeto/ceudodespertar/pull/36

_Atualizado em 12/10/2026._
