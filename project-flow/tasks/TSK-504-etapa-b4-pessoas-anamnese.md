# TSK-504: Etapa B4: pessoas e anamnese

- **Estado:** 🗺️ Roadmap
- **Responsável sugerido:** por módulo (molde P1–P11)
- **Depende de:** [TSK-311](TSK-311-ci-e2e.md)

## Contexto

Etapa do roteiro do plano, estimada em **4 semanas**. Cada módulo segue o molde P1 (contrato) → P2 (domínio) → P3 (migration) → P4 (persistência) → P5 (comandos) → P6 (HTTP) → P7 (read models) → P8 (casos T e concorrência) → P9 e P10 (front) → P11 (docs).

## O que precisa ser feito

- **Entrega:** Pessoa completa, AutorizacaoDeResponsavel, Consentimento, FormularioDeAnamnese, RespostaDeAnamnese, Declaracao, RegistroDeAcesso e Parecer; US1 passa a valer.
- **Decisões abertas:** texto do consentimento; AR2 × esquema; validade da anamnese em meses (Doc 6 §9.2 #7); equipe que consagra sem anamnese (#8).
- **Casos T:** T11, T21, T22
- Dividir em tasks por módulo e peça antes de começar.
- **Todo comando que devolve dado pessoal usa `@RespostaSemCorpoNoReplay`** (#36). Sem a marca, o corpo vai para `shared.chave_de_idempotencia` por até 24 h além do expurgo.

## Critérios de aceite

- Nova versão gera pendência só para quem a pergunta afeta; toda leitura registrada.
- Teste estrutural: comando de pessoas e anamnese sem a marca falha

## Referências

- Plano: "Roteiro B1–B6 e migração"
- Doc 7: anexo "Inventário do corte"

_Atualizado em 12/10/2026._
