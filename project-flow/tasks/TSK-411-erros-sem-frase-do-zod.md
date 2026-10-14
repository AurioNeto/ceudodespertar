# TSK-411: Erros: `CORPO_INVALIDO` sem frases do Zod

- **Estado:** ✅ Feito (#213): `detalhes` de `CORPO_INVALIDO` com `{ problemas: [{ caminho, regra }], total }`, sem frase do Zod
- **Responsável sugerido:** limpio

## Contexto

O pipe de validação devolve em `detalhes` as mensagens do Zod, em inglês. O Doc 7 §12 diz que erro de domínio tem código estável e **nenhuma frase**, porque a frase é do front.

## O que precisa ser feito

- Devolver só o caminho do campo e um código estável por regra (`obrigatorio`, `formato`, `minimo`…), sem a mensagem.

## Critérios de aceite

- Teste: `CORPO_INVALIDO` não contém texto em linguagem natural

## Referências

- https://github.com/AurioNeto/ceudodespertar/pull/22#discussion_r4187819275

_Atualizado em 14/10/2026._
