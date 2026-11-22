# TSK-012: Topologia e provedor de deploy (SPA e Keycloak no mesmo site)

- **Estado:** 🧭 Em uso desde 20/11/2026; decisão formal a confirmar com o dono
- **Responsável sugerido:** usuário

## Em uso desde 20/11/2026

Não há registro escrito de que o dono decidiu o provedor; o que segue é o que os runbooks descrevem.

- **Front:** Vercel, projeto `ceudodespertar-web` com Root Directory `apps/web` (`docs/runbooks/vercel-web.md`).
- **API:** Oracle Cloud, VM Micro em San Jose com serviço systemd `cdd-api`; HTTPS por Caddy e domínio DuckDNS (`docs/runbooks/oracle-api-micro.md`, `docs/runbooks/oracle-api-https.md`).
- **Banco e anexos:** Supabase, PostgreSQL e armazenamento privado pela API S3 (`docs/runbooks/supabase.md`).
- **Keycloak:** Cloud-IAM, ambiente gratuito de homologação criado em 20/11/2026; a própria Cloud-IAM não recomenda esse plano para produção (`docs/runbooks/cloud-iam.md`).
- **Pendente**, segundo `docs/runbooks/oracle-api-micro.md`: a validação completa do login pelo front. A SPA (`ceudodespertar-web.vercel.app`) e o Keycloak (`lemur-2.cloud-iam.com`) não estão no mesmo domínio registrável (`docs/runbooks/vercel-web.md`), então o requisito de mesmo site abaixo continua aberto.

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

_Atualizado em 22/11/2026._
