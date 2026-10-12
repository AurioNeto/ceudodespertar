# TSK-202: Tipos do Kysely gerados do banco migrado (#20)

- **Estado:** ✅ Feito (mesclado em 06/10/2026, `cec80ca`)
- **Peça do plano:** F13
- **PR:** [#20](https://github.com/AurioNeto/ceudodespertar/pull/20)
- **Responsável sugerido:** radix
- **Depende de:** [TSK-201](TSK-201-unidade-de-trabalho-e-borda.md)

## Contexto

Leitura tipada via `em.getKysely()`.

## O que foi entregue

- Configuração do `kysely-codegen` (int8 → number, date → string).
- Arquivo gerado versionado.
- A CI falha se o gerado divergir do banco migrado.

## Como terminou

- Correções antes do merge: `end()` duplo do superusuário (`2b10d77`) e container que vazava quando o `connect()` falhava (`8adb01e`).
- O gate `db:gerar-tipos:verificar` passou a valer. Os PRs seguintes regeneraram os tipos (`corpo_hash` do #23).
- Achados sem correção: `expectTypeOf` de `dia` é tautológico, e o `Kysely<DB>` global expõe as tabelas de todos os módulos sem que o dependency-cruiser veja (TSK-410).

## O que resta

- TSK-410.

## Referências

- https://github.com/AurioNeto/ceudodespertar/pull/20
- https://github.com/AurioNeto/ceudodespertar/pull/20#discussion_r4187818282
- https://github.com/AurioNeto/ceudodespertar/pull/20#discussion_r4187818493

_Atualizado em 07/10/2026._
