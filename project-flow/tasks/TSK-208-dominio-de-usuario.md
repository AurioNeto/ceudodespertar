# TSK-208: Domínio do usuário, convite e último administrador (#26)

- **Estado:** ✅ Feito (mesclado em 06/10/2026, `0238da4`)
- **Peça do plano:** I03
- **PR:** [#26](https://github.com/AurioNeto/ceudodespertar/pull/26)
- **Responsável sugerido:** limpio
- **Depende de:** [TSK-207](TSK-207-dominio-de-grupos.md)

## Contexto

Agregado `Usuario` e as políticas US2 e US5.

## O que foi entregue

- Convite por hash, validado dentro de `ativar`; desativar = SUSPENSO; reativar.
- `verificarAcesso` (US4); `definirGrupos` (US6); `nome`; `convitesSubstituidos`.
- `PoliticaDoUltimoAdministrador.verificar(antes, depois, autorId)` por id.
- US1 como `todo` da etapa B1.

## Como terminou

- `96c3e77`: `UsuarioDaInstituicao.de(usuario, permissoesEfetivas)` resolve o `TS2740`.
- Sem correção (TSK-414):
  - a política do último administrador é contornada por **write skew** entre duas transações concorrentes. Isso vira aceite do TSK-304;
  - a validade de 72 h do convite não é garantida pelo domínio;
  - o agregado não guarda `convite.criado_por`, `usuario.ativado_em` e `suspenso_em`.

## O que resta

- TSK-414 e TSK-304.

## Referências

- https://github.com/AurioNeto/ceudodespertar/pull/26
- https://github.com/AurioNeto/ceudodespertar/pull/26#discussion_r4187820681
- https://github.com/AurioNeto/ceudodespertar/pull/26#discussion_r4187820854
- https://github.com/AurioNeto/ceudodespertar/pull/26#discussion_r4187821053

_Atualizado em 07/10/2026._
