# TSK-408: Login: refetch do `/eu`, recusa no meio da sessão e prazo do `.well-known`

- **Estado:** 📌 Backlog técnico
- **Responsável sugerido:** vitro
- **Depende de:** [TSK-002](TSK-002-mesclar-identidade-guarda-front-tema.md)

## Contexto

A busca do `.well-known` na primeira renovação não tem prazo próprio na biblioteca. Erro de renovação não classificado mantém a sessão, uma decisão conservadora.

## O que precisa ser feito

- 🟠 **Uma falha no refetch de `/eu` em segundo plano manda o usuário logado para `/entrar`**, e o formulário em andamento se perde (`apps/web/src/app/sessao/`: `SessaoProvider` e `utils/derivarEstado.ts`). Uma falha transitória com sessão válida deve manter a tela e tentar de novo.
- Suspensão ou revogação no meio da sessão nunca chega à tela de recusa (`apps/web/src/app/sessao/estadoDaSessao.ts`).
- Pré-carregar os metadados do `.well-known` no boot com timeout, ou envolver a busca num `AbortSignal`.
- Revisar a classificação de erros depois de uso real.

## Critérios de aceite

- Teste: falha transitória do refetch mantém a rota e o formulário
- Teste: 401 `USUARIO_SUSPENSO` no meio da sessão leva à tela de recusa
- Nenhuma chamada da credencial sem prazo

## Referências

- https://github.com/AurioNeto/ceudodespertar/pull/30
- https://github.com/AurioNeto/ceudodespertar/pull/30#discussion_r4187822341
- https://github.com/AurioNeto/ceudodespertar/pull/30#discussion_r4187822518

_Atualizado em 12/10/2026._
