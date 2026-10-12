# TSK-212: Login real por OIDC e sessão vinda do `GET /eu` (#30)

- **Estado:** ✅ Feito (mesclado em 06/10/2026, `b2dfcaa`)
- **Peça do plano:** W02
- **PR:** [#30](https://github.com/AurioNeto/ceudodespertar/pull/30)
- **Responsável sugerido:** vitro
- **Depende de:** [TSK-210](TSK-210-camada-de-dados-do-front.md)

## Contexto

Troca o login simulado pelo Keycloak.

## O que foi entregue

- `oidc-client-ts` com PKCE; tokens em memória.
- Renovação única com prazo e três resultados; `invalid_grant` tenta recuperar pelo SSO antes de encerrar.
- F5 pelo SSO (`/silencioso.html`).
- Sessão vinda do `/eu` com `pode()` mantido; recusas e 503 na entrada.
- Telas de senha e convite removidas (agora no Keycloak).
- Sessão de demonstração só em DEV com flag.

## Como terminou

- Antes do merge, recebeu o #28 (`358cfb0`) e conciliou a porta nova `renovar()` com a checagem de token já trocado.
- O requisito de **mesmo site** entrou no Doc 7 §13 (`d599684`).
- O contato do administrador ficou para a coordenação (TSK-011, issue #32).
- Sem correção (TSK-408):
  - uma falha no refetch de `/eu` em segundo plano manda o usuário logado para `/entrar`, e ele perde o formulário;
  - suspensão ou revogação no meio da sessão nunca chega à tela de recusa.

## O que resta

- TSK-408 e TSK-011.

## Referências

- https://github.com/AurioNeto/ceudodespertar/pull/30
- https://github.com/AurioNeto/ceudodespertar/pull/30#discussion_r4187822341
- https://github.com/AurioNeto/ceudodespertar/pull/30#discussion_r4187822518

_Atualizado em 07/10/2026._
