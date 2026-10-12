# TSK-211: Tema CDD do Keycloak (login e e-mail em pt-BR) (#29)

- **Estado:** ✅ Feito (mesclado em 06/10/2026, `32ce9f8`)
- **Peça do plano:** I09
- **PR:** [#29](https://github.com/AurioNeto/ceudodespertar/pull/29)
- **Responsável sugerido:** vitro

## Contexto

Telas do Keycloak com a marca da casa.

## O que foi entregue

- Login, esqueci a senha, definir e trocar senha (convite), info e erro, todos em pt-BR.
- E-mails de convite e de redefinição sem recurso externo.
- Realm com `loginTheme`/`emailTheme` = `cdd`; verificador de modelo exato atualizado.
- Fumaça confere que o tema está sendo servido.

## Como terminou

- A divergência da regra de senha sumiu: o #30 removeu `lib/senha.ts` e a regra ficou só no realm.
- O `redirect_uri` do convite virou aceite do TSK-305.
- Sem correção (TSK-416): o texto da regra de senha está fixo no tema, o e-mail de `executeActions` só fala em convite e o `<title>` mostra marcação.

## O que resta

- TSK-416.

## Referências

- https://github.com/AurioNeto/ceudodespertar/pull/29
- https://github.com/AurioNeto/ceudodespertar/pull/29#discussion_r4187822019
- https://github.com/AurioNeto/ceudodespertar/pull/29#discussion_r4187822143

_Atualizado em 07/10/2026._
