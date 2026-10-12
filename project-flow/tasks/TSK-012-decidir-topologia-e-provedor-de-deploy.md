# TSK-012: Topologia e provedor de deploy (SPA e Keycloak no mesmo site)

- **Estado:** 🧭 Decisão pendente
- **Responsável sugerido:** usuário

## Contexto

O F5 sem novo login e a recuperação de refresh recusado usam um iframe `prompt=none` com o cookie do Keycloak. Em produção, SPA e Keycloak precisam estar no **mesmo domínio registrável** (por exemplo `app.<domínio>` e `auth.<domínio>`), sem `X-Frame-Options: DENY` no redirect. A escolha do provedor de deploy é a decisão #9 do plano ("até o fim do B2").

## O que precisa ser feito

- Escolher o provedor.
- Fixar os domínios. O requisito de **mesmo site já está no Doc 7 §13** (linha "Sessão silenciosa", `d599684`, entrou pelo #30): SPA e Keycloak sob o mesmo domínio registrável, sem `X-Frame-Options` nem CSP `frame-ancestors` que bloqueiem o `prompt=none`.
- O runbook `docs/runbooks/mesmo-site-spa-keycloak.md` (#96) descreve a configuração. Os domínios concretos dependem do provedor.
- Quando o deploy existir, também entram:
  - o filtro de métrica ou Sentry para o log `outbox: eventos esgotados` (TSK-413);
  - o e2e de F5;
  - a revisão do lock de `CREATE INDEX` sem `CONCURRENTLY` em tabelas grandes.

## Critérios de aceite

- Decisão de provedor e domínios registrada no Doc 7
- Requisito de mesmo site no Doc 7 (✅ já registrado)

## Referências

- https://github.com/AurioNeto/ceudodespertar/pull/30
- Plano: decisões pendentes #9

_Atualizado em 12/10/2026._
