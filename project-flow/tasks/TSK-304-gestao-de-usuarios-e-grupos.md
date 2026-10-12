# TSK-304: Gestão de usuários e grupos (comandos e HTTP)

- **Estado:** ✅ Feito (mesclado em #45 (`0729605`), #48 e #49 (`035877b`))
- **Peça do plano:** I08
- **Responsável sugerido:** limpio + testudo (crivo)
- **Depende de:** [TSK-303](TSK-303-auditoria-sincrona.md)

## Contexto

Os comandos de identidade sobre os agregados, ainda com um provedor de identidade fake (o Keycloak real entra no TSK-305).

## Como terminou

A task saiu em três PRs:

1. **#45: política do último administrador.**
   - Trava advisory por instituição, fotografia sem PII e o serviço `AlteracaoQuePodeTirarAdministrador`.
   - Rotas de desativar, reativar (com motivo sensível) e definir grupos.
   - 409 `SITUACAO_DO_USUARIO_NAO_PERMITE` quando a recusa é por causa da situação do usuário-alvo.
2. **#48: convite e consulta de usuários.**
   - Rotas: convidar (`POST /usuarios`, com `Location`), reenviar convite, listagem por cursor (50/100) e `GET /usuarios/:id` com a `versao`.
   - Token de 32 bytes em base64url; o banco guarda o SHA-256 do texto.
   - O envio sai no `aoConfirmar`. Por enquanto o enviador só registra no log que há um convite pendente.
3. **#49: gestão de grupos.**
   - `GET /grupos` aceita qualquer das duas permissões.
   - Conceder e revogar permissão; revogar passa pela trava e pela política do último administrador.
   - Renomear grupo.
   - Grupo excluído responde 404 `GRUPO_INEXISTENTE`, mesmo com a versão anterior à exclusão.
   - Migração b0-009: índice por grupo, FK nomeada (23503 vira `GRUPO_INEXISTENTE`) e índice da listagem de usuários. Fechou a #44.

**Aceite atendido:**
- trilha gravada;
- T23 e T25 verdes;
- teste de zerar administradores por cada caminho;
- corrida entre duas transações, com uma recusada, nas duas permissões e no cruzamento grupo × usuário.

## O que resta

- **TSK-305 (Keycloak):** envio real do convite, `POST /eu/ativacao`, encerrar as sessões ao suspender e limite de taxa do reenvio.
- **Issue #47:** NUL na entrada, UUID em maiúsculas e `Cache-Control: no-store`.
- **Issue #43:** retenção do outbox, que guarda o motivo em texto claro.
- **Fora desta task:** criar e excluir grupo, revogar acesso.
- **Sem teste:** duas revogações concorrentes.
- **Sem mapeamento de erro:** as FKs `usuario_grupo → usuario` e `grupo_permissao → grupo`, hoje inalcançáveis.
- **LGPD pendente:** trilha de consulta da listagem.

## Referências

- https://github.com/AurioNeto/ceudodespertar/pull/26
- https://github.com/AurioNeto/ceudodespertar/pull/45
- https://github.com/AurioNeto/ceudodespertar/issues/43
- https://github.com/AurioNeto/ceudodespertar/issues/44
- PR #45: https://github.com/AurioNeto/ceudodespertar/pull/45
- PR #48: https://github.com/AurioNeto/ceudodespertar/pull/48
- PR #49: https://github.com/AurioNeto/ceudodespertar/pull/49

_Atualizado em 09/10/2026._
