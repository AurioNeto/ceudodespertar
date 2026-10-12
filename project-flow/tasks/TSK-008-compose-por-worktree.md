# TSK-008: Isolar o Docker por worktree

- **Estado:** 🔧 Processo (ação manual), parcial: o aceite já roda isolado
- **Responsável sugerido:** continuum

## Contexto

Com `name: cdd` fixo, subir a infra em qualquer worktree mexe no ambiente do usuário. Os agentes passaram a usar `-p <nome>`, mas os scripts `pnpm infra:*` não aceitam isso.

Já resolvido para o aceite: `pnpm test:keycloak` (#80 e #94) sobe um projeto próprio (`cdd-aceite-<pid>`), com portas livres, e só roda `down -v` nesse projeto. Continuam sem isolamento `infra:subir`, `infra:zerar` (`docker compose down -v` sem guarda) e a fumaça. As portas 8080, 8025, 1025 e 9000 são fixas, e só a do Postgres é configurável.

## O que precisa ser feito

- Fazer `infra:subir`, `infra:zerar` e a fumaça respeitarem `COMPOSE_PROJECT_NAME`, ou derivar o nome do diretório.
- Garantir que `infra:zerar` nunca apague volumes de outro projeto.
- Tornar configuráveis as portas do Keycloak, do Mailpit e do SeaweedFS, como já é a do Postgres.
- Pela documentação do Compose, `COMPOSE_PROJECT_NAME` vence o `name:`. Se isso se confirmar, o primeiro item já está quase atendido e o bloqueio real são as portas.
- Documentar no README.

## Critérios de aceite

- Duas worktrees sobem a infra em paralelo sem colisão de volume (portas configuráveis)

## Referências

- Memória: compose-projeto-compartilhado

_Atualizado em 12/10/2026._
