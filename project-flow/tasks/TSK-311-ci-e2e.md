# TSK-311: CI end-to-end do aceite do B0

- **Estado:** ✅ Concluída (#94)
- **Peça do plano:** E01
- **Responsável sugerido:** continuum + testudo
- **Depende de:** [TSK-306](TSK-306-cli-bootstrap-e-seed-demo.md), [TSK-310](TSK-310-aba-de-acessos.md)

## Contexto

O aceite do B0 automatizado.

## O que precisa ser feito

- Job `e2e`: compose num projeto isolado, migrar, seed demo e API compilada pelo `tsc`.
- Login real, convite via Mailpit, escrita auditada e T26.
- Abaixo de 6 min de relógio somando os jobs.

## Decisões (10/10)

- Medido no runner antes de implementar: job e2e ~70 s; roda em paralelo, então o relógio da CI segue limitado pelo job qualidade.
- O job reaproveita `pnpm test:keycloak`; com `CI=true` e sem `.env`, o script usa o `.env.example`; em falha publica o log da API como artefato (3 dias).
- Escrita auditada coberta por teste da trilha após escritas reais com token real; T26 · Keycloak coberto no aceite.
- Lacuna T26 (decisão do dono, opção C): continua declarada no catálogo, e o meta-teste M5 exige teste ativo com a marca em `keycloak-real/*.aceite.ts` enquanto ela existir. Estender o meta-teste ao aceite inteiro fica para quando surgir uma segunda marca só no aceite.

## Critérios de aceite

- O aceite do B0 roda na CI

_Atualizado em 10/10/2026._
