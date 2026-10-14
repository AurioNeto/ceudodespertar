# TSK-415: Fakes de teste em `src/` entram no build

- **Estado:** ✅ Feito (#213): `tsconfig.build.json` exclui `**/*.fake.ts`, com teste estrutural do build
- **Responsável sugerido:** limpio

## Contexto

`tsconfig.build.json` só exclui `**/*.spec.ts`, então arquivos `*.fake.ts` em `src/` vão para o `dist` (por exemplo `banco/erros-de-banco.fake.ts`, #24).

## O que precisa ser feito

- Mover os fakes para `test/`, ou acrescentar `**/*.fake.ts` ao exclude do build.

## Critérios de aceite

- `dist/` sem nenhum `*.fake.js`

## Referências

- https://github.com/AurioNeto/ceudodespertar/pull/24

_Atualizado em 14/10/2026._
