# TSK-405: Idempotência: detecção de `@Res` robusta

- **Estado:** ✅ Feito (#23, `ad4169c`)
- **Responsável sugerido:** limpio
- **Depende de:** [TSK-001](TSK-001-mesclar-pilha-da-fundacao.md)

## Contexto

A detecção lê a metadata pelo `name` da função. Um decorator que embrulhe o handler escaparia dela. Ela também usa constantes de `@nestjs/common/internal`, que não é API pública.

## Como terminou

`propriedadeDoHandler` percorre a cadeia de protótipos do controller até a chave cujo valor `=== getHandler()`, usando o `name` só como fallback. Há testes de handler embrulhado por decorator e de herança por subclasse.

## O que resta

- Incluir `handler-responde-por-conta-propria.ts` no checklist de upgrade do Nest, porque ele importa de `@nestjs/common/internal`. Isso foi prometido na thread e ainda não foi feito.

## Referências

- https://github.com/AurioNeto/ceudodespertar/pull/23
- https://github.com/AurioNeto/ceudodespertar/pull/23#discussion_r4188591717

_Atualizado em 07/10/2026._
