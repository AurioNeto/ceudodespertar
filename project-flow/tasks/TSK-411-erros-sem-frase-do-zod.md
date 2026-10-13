# TSK-411: Erros: `CORPO_INVALIDO` sem frases do Zod

- **Estado:** ✅ Em PR: `detalhes` passa a ser `{ problemas: [{ caminho, regra }], total }`, com regra em código estável (`obrigatorio`, `tipo`, `minimo`, `maximo`, `formato`, `valor`, `multiplo`, `campo_desconhecido` ou o `params.regra` do refine). O front não lê `detalhes` de `CORPO_INVALIDO` (só `retryAfterSegundos` do 429), então não muda
- **Responsável sugerido:** limpio

## Contexto

O pipe de validação devolve em `detalhes` as mensagens do Zod, em inglês. O Doc 7 §12 diz que erro de domínio tem código estável e **nenhuma frase**, porque a frase é do front.

## O que precisa ser feito

- Devolver só o caminho do campo e um código estável por regra (`obrigatorio`, `formato`, `minimo`…), sem a mensagem.

## Critérios de aceite

- Teste: `CORPO_INVALIDO` não contém texto em linguagem natural

## Referências

- https://github.com/AurioNeto/ceudodespertar/pull/22#discussion_r4187819275

_Atualizado em 13/10/2026._
