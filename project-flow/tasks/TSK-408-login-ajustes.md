# TSK-408: Login: refetch do `/eu`, recusa no meio da sessão e prazo do `.well-known`

- **Estado:** 🔍 Em revisão (refetch do `/eu`, recusa no meio da sessão e prazo do OIDC); a revisão da classificação de erros continua aberta
- **Responsável sugerido:** vitro
- **Depende de:** [TSK-002](TSK-002-mesclar-identidade-guarda-front-tema.md)

## Contexto

A busca do `.well-known` na primeira renovação não tem prazo próprio na biblioteca. Erro de renovação não classificado mantém a sessão, uma decisão conservadora.

## O que precisa ser feito

- 🟠 **Uma falha no refetch de `/eu` em segundo plano manda o usuário logado para `/entrar`**, e o formulário em andamento se perde (`apps/web/src/app/sessao/`: `SessaoProvider` e `utils/derivarEstado.ts`). Uma falha transitória com sessão válida deve manter a tela e tentar de novo.
- Suspensão ou revogação no meio da sessão nunca chega à tela de recusa (`apps/web/src/app/sessao/estadoDaSessao.ts`).
- Pré-carregar os metadados do `.well-known` no boot com timeout, ou envolver a busca num `AbortSignal`.
- Revisar a classificação de erros depois de uso real. **Continua aberto:** depende de uso real e fica fora do PR do refetch e da recusa.

## Critérios de aceite

- Teste: falha transitória do refetch mantém a rota e o formulário
- Teste: 401 `USUARIO_SUSPENSO` no meio da sessão leva à tela de recusa
- Nenhuma chamada da credencial sem prazo

## Referências

- https://github.com/AurioNeto/ceudodespertar/pull/30
- https://github.com/AurioNeto/ceudodespertar/pull/30#discussion_r4187822341
- https://github.com/AurioNeto/ceudodespertar/pull/30#discussion_r4187822518

## Como ficou (13/10)

- Com o `/eu` já carregado, indisponibilidade, rede ou erro desconhecido no refetch mantêm a sessão ativa com os dados que havia, e a consulta tenta de novo a cada 30 s enquanto a falha for passageira; recusa e sessão vencida não insistem. `NAO_AUTENTICADO` continua levando à entrada. Custo aceito: um 500 permanente com o acesso já carregado mantém a sessão com as permissões antigas até o próximo sucesso, sem aviso na tela.
- O cliente HTTP avisa a sessão quando qualquer chamada recebe 401 `USUARIO_SUSPENSO` ou `USUARIO_REVOGADO`. A sessão refaz o `/eu`, e a recusa leva à tela de entrada com a mensagem própria. A guarda contra laço só refaz quando o `/eu` está parado; um aviso que chega com o `/eu` em voo é descartado, e a recusa aparece no próximo 401.
- `requestTimeoutInSeconds` (10 s) dá prazo a toda chamada da `oidc-client-ts` ao provedor, inclusive a busca do `.well-known`, o jwks e a troca do código; o refresh usa o prazo da renovação silenciosa (5 s).

_Atualizado em 13/10/2026._
