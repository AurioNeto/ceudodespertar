# TSK-416: Tema do Keycloak: texto de senha, e-mail de ações e título

- **Estado:** 📌 Backlog técnico
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

_Atualizado em 12/10/2026._
