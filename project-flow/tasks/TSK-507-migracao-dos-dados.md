# TSK-507: Migração dos dados históricos

- **Estado:** 🗺️ Roadmap
- **Responsável sugerido:** por módulo (molde P1–P11)
- **Depende de:** [TSK-311](TSK-311-ci-e2e.md)

## Contexto

Etapa do roteiro do plano, estimada em **3 (paralelo a B1–B2) semanas**. Cada módulo segue o molde P1 (contrato) → P2 (domínio) → P3 (migration) → P4 (persistência) → P5 (comandos) → P6 (HTTP) → P7 (read models) → P8 (casos T e concorrência) → P9 e P10 (front) → P11 (docs).

## O que precisa ser feito

- **Entrega:** Módulo `migracao`: extrair → propor → validar → carregar [--pseudonimizar] → conciliar → fechar → verificar-hash, pela via dos comandos do domínio (UUIDv5).
- **Decisões abertas:** as 11 decisões do Doc 1 §7.2 + os três níveis das cerimônias históricas.
- **Casos T:** —
- Dividir em tasks por módulo e peça antes de começar.

## Critérios de aceite

- Relatório com 0 centavo de diferença antes de fechar.

## Referências

- Plano: "Roteiro B1–B6 e migração"
- Doc 7: anexo "Inventário do corte"

_Atualizado em 05/10/2026._
