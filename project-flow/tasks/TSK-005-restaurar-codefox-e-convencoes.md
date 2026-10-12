# TSK-005: Restaurar o `.codefox.yaml` do projeto com as convenções

- **Estado:** ✅ Feito (versionado no #37, 08/10/2026)
- **Responsável sugerido:** orquestrador

## Contexto

O `.codefox.yaml` do projeto não é versionado e sumiu da raiz. Os pre-reviews passaram a usar o doc BASE global. A convenção de 28/09 morava nele: docs, comentários, nomes de teste e corpos de PR **não** citam IDs do plano local (Fxx, Ixx, Wxx…); citam a etapa B0–B6, o #PR ou a seção do Doc 7.

## Como terminou

O `.codefox.yaml` do projeto foi recriado em 07/10 e **versionado pelo #37**. Antes, a menção a ID de plano num dos learnings foi trocada por "Doc 7 §5".

## Próximos passos

- Acrescentar novos learnings a cada decisão do dono.
- Um a registrar: reativar zera `suspenso_em`.

## Referências

- ~/.claude/.codefox.yaml

_Atualizado em 08/10/2026._
