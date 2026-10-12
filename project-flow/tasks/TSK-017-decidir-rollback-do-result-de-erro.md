# TSK-017: Rollback quando o comando devolve `Result` de erro

- **Estado:** ✅ Feito (#37, 08/10/2026)
- **Responsável sugerido:** usuário

## Contexto

A `UnidadeDeTrabalho` (#19) só desfaz a transação quando há **exceção**. Um caso de uso que devolve `Result.err` sai normalmente, e a porta faz flush e commit do que já tinha sido alterado. O Doc 7 §5, passo 8, diz que o erro de domínio desfaz a transação. A revisão confirmou isso por 3 votos de 3.

## Como terminou

**Decisão (a)**, implementada no [#37](https://github.com/AurioNeto/ceudodespertar/pull/37):
- a `UnidadeDeTrabalho` desfaz a transação, sem flush e sem os ganchos pós-commit, quando o comando devolve `Result` de erro, e devolve o mesmo `Result`;
- na transação aninhada, a de fora decide;
- a borda HTTP traduz o `Result`: o sucesso vira o corpo, e o erro de domínio vira o código do catálogo depois do rollback;
- a regra está no Doc 7 §5.

## O que resta

- A idempotência ainda grava o `Result` embrulhado em `chave_de_idempotencia.resposta`. O corpo HTTP sai certo porque a borda desembrulha o replay (TSK-412).
- Um consumidor do despachante que devolva `err` não desfaz nada, porque roda aninhado e a de fora decide. Vale um lembrete no `@ReageA` (TSK-413).

## Referências

- https://github.com/AurioNeto/ceudodespertar/pull/19#discussion_r4187818126
- Doc 7 §5

_Atualizado em 08/10/2026._
