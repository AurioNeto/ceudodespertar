# Runbook — SPA e Keycloak no mesmo site

Requisito de implantação vindo do #30: o SPA e o Keycloak precisam estar **no mesmo site**.

## Por que

- Os tokens ficam **só em memória** (`InMemoryWebStorage`, `apps/web/src/dados/oidc.ts:52`). No
  `sessionStorage` fica só o `state`/verifier do fluxo (`oidc.ts:53`), que some no retorno. O
  escopo é `openid`, sem `offline_access` (`oidc.ts:9`).
- Por isso o F5 perde os tokens. A sessão volta pelo SSO do Keycloak num iframe com `prompt=none`,
  carregando `/silencioso.html` (`oidc.ts:7`, `apps/web/silencioso.html`, `apps/web/src/silencioso.ts`).
  O mesmo iframe recupera a sessão quando o refresh token é recusado (`apps/web/src/dados/credencialOidc.ts:42-51`).
- O iframe só funciona se o navegador enviar o cookie de sessão do Keycloak dentro dele. Com o SPA e
  o Keycloak em sites diferentes, Safari e Firefox bloqueiam esse cookie.

## Exemplos (do #30)

| Implantação | Resultado |
|---|---|
| `app.<domínio>` (SPA) e `auth.<domínio>` (Keycloak) | Correto: mesmo site |
| SPA e Keycloak em domínios diferentes | Incorreto: cada F5 pede novo login em Safari e Firefox |
| Proxy que força `X-Frame-Options` no redirect do Keycloak | Incorreto: mesmo efeito, porque o iframe não carrega |

## Configuração envolvida

- Front (`apps/web/src/env.d.ts`, lidas em `oidc.ts:34-40`): `VITE_OIDC_EMISSOR` (URL do realm,
  por exemplo `http://localhost:8080/realms/cdd` no `.env.example`) e `VITE_OIDC_CLIENTE` (`cdd-web`).
  Sem uma delas o front falha com `Variável de ambiente ausente: …`. O Vite lê o `.env` da raiz do
  repo (`envDir` em `apps/web/vite.config.ts:9`).
- `redirect_uri`, `silent_redirect_uri` e `post_logout_redirect_uri` derivam da origem do próprio
  SPA (`oidc.ts:46-49`). O cliente `cdd-web` em `infra/keycloak/realm-cdd.json` só admite
  `http://localhost:5173` hoje (`redirectUris`, `webOrigins`, `post.logout.redirect.uris`), e o
  verificador `infra/keycloak/modelo-esperado.mjs:300-308` confere esses mesmos valores. Uma nova
  origem exige mudar os dois.

## Sintoma

Login e navegação funcionam, mas **cada F5 volta para "Entrar"**. Também pode acontecer de a sessão
cair quando o refresh token é recusado, mesmo com a sessão SSO ainda ativa no Keycloak.

## Diagnóstico

1. Compare o host de `VITE_OIDC_EMISSOR` com o host onde o SPA é servido: eles estão no mesmo site?
2. No DevTools, aba Network, veja a requisição do iframe ao endpoint de autorização do Keycloak
   seguida de `/silencioso.html`. Confira se o cookie de sessão do Keycloak foi enviado ou bloqueado
   e se a resposta traz `X-Frame-Options` ou `Content-Security-Policy: frame-ancestors` que impeça o
   iframe.
3. Repita em Chrome e em Safari ou Firefox. Se só os dois últimos falham, a causa é o bloqueio de
   cookie entre sites.

## Ação

- Sirva o SPA e o Keycloak sob o mesmo domínio registrável, como `app.<domínio>` e `auth.<domínio>`.
- Ajuste `VITE_OIDC_EMISSOR` para a URL nova do realm e refaça o build: as variáveis `VITE_*` entram
  no bundle em tempo de build.
- Atualize as URIs do cliente `cdd-web` no `realm-cdd.json` e no `modelo-esperado.mjs`.
- Retire de qualquer proxy na frente do Keycloak a regra que força `X-Frame-Options` nas respostas
  do fluxo de autorização.

## Verificação

1. Entre pelo SPA, aperte F5 e confira que a tela volta sem passar por "Entrar", em Chrome, Safari e
   Firefox.
2. No DevTools, aba Application: nenhum token em `localStorage` nem em `sessionStorage`.
