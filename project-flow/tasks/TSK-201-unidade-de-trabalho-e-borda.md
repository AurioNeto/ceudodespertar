# TSK-201: Unidade de trabalho e borda transacional (#19)

- **Estado:** ✅ Feito (mesclado em 06/10/2026, `cec80ca`)
- **Peça do plano:** F12
- **PR:** [#19](https://github.com/AurioNeto/ceudodespertar/pull/19)
- **Responsável sugerido:** limpio + radix

## Contexto

Toda requisição roda numa transação aberta pela borda; `set_config(app.instituicao_id)` local; modos escrita, leitura e leitura-que-grava.

## O que foi entregue

- `UnidadeDeTrabalho.transacao(modo, fn)`: escrita em RC + READ WRITE, leitura em RR READ ONLY, leitura-que-grava em RC; chamada aninhada reaproveita a transação.
- `BordaTransacionalInterceptor` com modo padrão `leitura` e `ContextoDaRequisicao` em AsyncLocalStorage.
- `allowGlobalContext: false`.
- Parsers do `pg`: int8 → number com limite seguro; date → string.
- Provedor de instituição vazio (fail-closed) em produção.

## Como terminou

- Mesclado junto com o #20 (pilha).
- A revisão do codefox (06/10) deixou três achados confirmados, sem correção ainda:
  - um `Result` de erro faz flush e commit, contra o Doc 7 §5 passo 8. Virou decisão no TSK-017;
  - o reuso da transação aninhada não confere se ela ainda está aberta nem se a instituição é a mesma (TSK-409);
  - o teste do `lastValueFrom` passa com o mutante `firstValueFrom` (TSK-409).
- A borda **não está registrada na aplicação**. O provedor de instituição continua o vazio. Ver TSK-313.

## O que resta

- TSK-017 (decisão do `Result`), TSK-409 (reuso aninhado e teste vazio), TSK-313 (registro no `AppModule`).

## Referências

- https://github.com/AurioNeto/ceudodespertar/pull/19
- https://github.com/AurioNeto/ceudodespertar/pull/19#discussion_r4187818126
- https://github.com/AurioNeto/ceudodespertar/pull/19#discussion_r4187817983
- https://github.com/AurioNeto/ceudodespertar/pull/19#discussion_r4187817804

_Atualizado em 07/10/2026._
