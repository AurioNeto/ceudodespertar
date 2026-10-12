# TSK-501: Etapa B1: financeiro núcleo

- **Estado:** 🗺️ Roadmap
- **Responsável sugerido:** por módulo (molde P1–P11)
- **Depende de:** [TSK-311](TSK-311-ci-e2e.md)

## Contexto

Etapa do roteiro do plano, estimada em **7–8 semanas**. Cada módulo segue o molde P1 (contrato) → P2 (domínio) → P3 (migration) → P4 (persistência) → P5 (comandos) → P6 (HTTP) → P7 (read models) → P8 (casos T e concorrência) → P9 e P10 (front) → P11 (docs).

## O que precisa ser feito

- **Entrega:** Unidade, GrupoDeCusto, Categoria, Conta, Fundo, Lancamento (etiquetas, pendência, estorno derivado), Transferencia, PeriodoContabil (hash; lock no repositório), Pessoa mínima, Evento mínimo; read models de DRE, saldo e resultado; porta S3 (comprovante); telas F-01 a F-23 e Painel.
- **Decisões abertas:** regime de Chácara/Dormitórios, unidade ativa, transferência no hash, permissão para confirmar transferência, `confirmado_por` de integração.
- **Casos T:** T9 e T13–T16e, 10 casos no catálogo executável do #75. O plano listava também T2, T3 e T6, que o catálogo pôs na B5.
- Dividir em tasks por módulo e peça antes de começar.

## Critérios de aceite

- Percurso 1 sem conciliação contra a API; carga M1 sem divergência além do que depende do B2.

## Referências

- Plano: "Roteiro B1–B6 e migração"
- Doc 7: anexo "Inventário do corte"

_Atualizado em 12/10/2026._
