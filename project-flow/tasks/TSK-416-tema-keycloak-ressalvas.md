# TSK-416: Tema do Keycloak: texto de senha, e-mail de ações e título

- **Estado:** 🔍 Em revisão (texto da senha pela política, título sem marcação, e-mail de ações genérico e tema de e-mail na Força da Mata)
- **Responsável sugerido:** vitro

## Contexto

Achados do #29. O tema de login foi refeito na Força da Mata (#180 e #197, na `main` desde o #196): Noite fixa, fontes hospedadas, erro de campo e borda com contraste mínimo. Os três pontos abaixo continuam abertos, e o tema de e-mail ainda cita Archivo e caixa alta inline (ver [TSK-602](TSK-602-backlog-tecnico-do-redesign.md), item 7).

## O que precisa ser feito

- O texto da regra de senha está fixo no tema, ao lado de um validador que já recebe a política real. Gerar o texto a partir da política.
- O e-mail de `executeActions` só fala em convite e senha, mas a lista de ações é dinâmica e o template é reaproveitado.
- O `<title>` recebe o header capturado das páginas herdadas e mostra a marcação como texto.

## Critérios de aceite

- Mudar a política no realm muda o texto da tela sem editar o tema

## Referências

- https://github.com/AurioNeto/ceudodespertar/pull/29#discussion_r4187822019
- https://github.com/AurioNeto/ceudodespertar/pull/29#discussion_r4187822143

## Decisões do dono

- **Assunto do e-mail de convite (13/10):** "Sistema de Gestão CDD" (`executeActionsSubject`). O assunto da redefinição de senha não muda.

## Conferência ao vivo (12/10)

Num Keycloak 26.4.7 isolado, com o tema da branch:
- a tela de definir senha mostrou a política `length(10) and digits(1) and notEmail and notUsername and lowerCase(1)` como "Use pelo menos 10 caracteres, com uma letra minúscula e um número. A senha não pode ser igual ao seu e-mail.";
- trocar a política no realm por `length(12) and maxLength(64) and upperCase(2) and digits(1) and specialChars(1) and passwordHistory(3)` mudou o texto sem editar o tema;
- o `<title>` da tela de consentimento deixou de mostrar a marcação do header herdado;
- os e-mails de ações e de redefinição saíram no Mailpit sem Archivo e sem caixa alta.

`passwordPolicies` chega ao tema como bean, não como mapa: `notEmail` e `notUsername` são booleanos sempre presentes, e o `msg()` do Keycloak repassa os argumentos como texto, então o plural usa duas chaves em vez de `choice`.

_Atualizado em 13/10/2026 (assunto do e-mail de convite decidido pelo dono)._
