# TSK-302: Contextualizar o acesso e `GET /api/v1/eu`

- **PR:** [#39](https://github.com/AurioNeto/ceudodespertar/pull/39)
- **Estado:** ✅ Feito (#39, 08/10/2026)
- **Peça do plano:** I06
- **Responsável sugerido:** escudo + limpio (crivo)
- **Depende de:** [TSK-301](TSK-301-persistencia-da-identidade-e-seed.md)

## Contexto

A guarda (#27) autentica, mas o `ResolvedorDeContextoDeAcesso` registrado hoje recusa tudo. O front (#30) já consome o `/eu` pelo contrato `Eu`.

## Como terminou

Mesclado pelo [#39](https://github.com/AurioNeto/ceudodespertar/pull/39) (`79189cd`):
- **Resolvedor real:** `resolver_sujeito` seguido de uma leitura com o contexto da instituição, com recusa por situação.
- **Cache de 60 s** com geração anti-corrida.
- **Invalidação por `@ReageA`.**
- **`GET /eu`:** relê a situação e grava `ultimoAcessoEm` no máximo uma vez por hora, fora do agregado.
- **Fiação mínima:** `IdentidadeModule` no `AppModule` e `AutenticacaoModule.comResolvedor`.

**Decisões confirmadas pelo dono:**
- os repositórios entram com o outbox;
- a troca do resolvedor é feita por módulo dinâmico;
- `ultimoAcessoEm` é gravado fora do agregado.

## O que resta

- A invalidação por evento só roda depois do TSK-313.
- Não há evento de revogação no domínio.
- Com várias réplicas, cada uma invalida só o próprio cache.
- O cache usa só o `sub` como chave. Com mais de um emissor de token, o emissor precisa entrar na chave.

## Referências

- https://github.com/AurioNeto/ceudodespertar/pull/27
- https://github.com/AurioNeto/ceudodespertar/pull/30

_Atualizado em 08/10/2026._
