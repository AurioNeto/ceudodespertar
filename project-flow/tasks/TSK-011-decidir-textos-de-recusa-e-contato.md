# TSK-011: Textos das telas de recusa e contato do administrador

- **Estado:** 🧭 Decisão pendente (coordenação)
- **Responsável sugerido:** usuário + coordenação

## Contexto

O T-01 do Doc 4 pede "tela explicativa com contato do administrador" para cada recusa: convite pendente, suspenso, revogado e desconhecido. O PR #30 trouxe textos provisórios, sem contato concreto. Desde a refatoração do front (#126), eles estão em `MENSAGENS_DE_RECUSA`, no arquivo `apps/web/src/pages/transversal/entrada/EntrarPage/constantes.ts`.

## O que precisa ser feito

- **Decisão do usuário (07/10):** aguardar a coordenação. Até lá vale a mensagem genérica ("procure quem administra o acesso da casa").
- As opções de origem do contato estão na issue #32, com custo e risco de cada uma:
  - fixo por instituição;
  - configuração do ambiente;
  - quem tem `sistema.usuario.gerenciar`, que expõe dado pessoal do administrador.
- A coordenação aprova ou reescreve os quatro textos de `MENSAGENS_DE_RECUSA`.
- Atenção: para o usuário **desconhecido**, a API ainda não sabe a qual casa ele pertence.

## Critérios de aceite

- Textos aprovados em `MENSAGENS_DE_RECUSA`
- Contato definido e implementado, ou a decisão de manter o genérico registrada
- Issue #32 fechada

## Referências

- https://github.com/AurioNeto/ceudodespertar/pull/30
- https://github.com/AurioNeto/ceudodespertar/issues/32

_Atualizado em 12/10/2026._
