# TSK-015: E-mail em `USUARIO_CONVIDADO` × trilha de auditoria (LGPD)

- **Estado:** ✅ Decidido (implementa no TSK-303)
- **Responsável sugerido:** usuário + escudo

## Contexto

O evento de convite leva o e-mail nos `dados`, porque a reação do Keycloak precisa dele. A trilha `identidade.registro_de_auditoria` só aceita inserção e guarda o alvo por referência, justamente para a anonimização não ter de reescrevê-la.

## Decisão

O e-mail fica no payload de `USUARIO_CONVIDADO`, porque a reação que cria o usuário no Keycloak precisa dele. A trilha recebe um **mapeamento explícito** evento → `detalhes` (autor, alvo por id, operação), **sem** copiar `dados` e **sem** o `email`. Assim a anonimização da LGPD não precisa reescrever uma trilha que só aceita inserção. A decisão está registrada na thread do #26 e é implementada no TSK-303.

## Critérios de aceite

- Nenhum dado pessoal em `detalhes` da trilha
- Teste que fixa isso (no TSK-303)

## Referências

- https://github.com/AurioNeto/ceudodespertar/pull/26
- https://github.com/AurioNeto/ceudodespertar/pull/26#discussion_r4189897878

_Atualizado em 07/10/2026._
