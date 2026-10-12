# TSK-410: Kysely: tabelas de todos os módulos visíveis a qualquer módulo

- **Estado:** 📌 Backlog técnico
- **Responsável sugerido:** limpio

## Contexto

Achados do #20: `Kysely<DB>` é global e expõe as tabelas de todos os módulos a qualquer módulo, sem que o dependency-cruiser veja. O `expectTypeOf` de `dia` é tautológico, então a opção `dateParser` não é exercitada. No modo `--verificar`, qualquer saída diferente de zero do codegen vira "tipos divergem".

## O que precisa ser feito

- Restringir o `DB` por módulo (tipos por esquema) ou criar uma regra ou teste que impeça um módulo de consultar tabela de outro.
- Trocar o `expectTypeOf` por um teste que exercite o parser.
- Distinguir falha do codegen de divergência no `--verificar`.

## Critérios de aceite

- Um módulo que consulta tabela de outro módulo falha no CI

## Referências

- https://github.com/AurioNeto/ceudodespertar/pull/20#discussion_r4187818493
- https://github.com/AurioNeto/ceudodespertar/pull/20#discussion_r4187818282

_Atualizado em 07/10/2026._
