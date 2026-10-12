# TSK-303: Auditoria síncrona e `GET /identidade/auditoria`

- **PR:** [#41](https://github.com/AurioNeto/ceudodespertar/pull/41)
- **Estado:** ✅ Feito (mesclado em 08/10/2026, `38782e7`)
- **Peça do plano:** I07
- **Responsável sugerido:** limpio + testudo
- **Depende de:** [TSK-302](TSK-302-contextualizar-e-get-eu.md), [TSK-313](TSK-313-ligar-borda-idempotencia-e-outbox-na-aplicacao.md)

## Contexto

A trilha `identidade.registro_de_auditoria` já existe na migration, com `autor_tipo` USUARIO, SISTEMA ou LINK_PUBLICO. O contrato `RegistroDeAuditoria` ainda tem `autorId` não nulo (adiado para esta peça).

## Como terminou

- Migração b0-008: `GRUPO_EDITADO` entra no CHECK de `operacao`. O `desfazer` restaura com `NOT VALID`, porque a trilha só aceita inserção.
- O mapeamento evento → trilha é explícito e fica fora do e-mail, do nome e do subject. Um evento sem mapeamento derruba o ato.
- O `GravadorDeTrilha` grava na mesma transação do agregado e do outbox, **antes** do agregado. Assim, `autor_grupos` registra os grupos do autor antes do ato.
- `GET /identidade/auditoria`:
  - exige `sistema.auditoria.ler` e pagina por cursor opaco (`em` + `id`);
  - aceita filtro por período e por operação;
  - resolve os nomes por junção na leitura;
  - registra `AUDITORIA_CONSULTADA` a cada página.
- Motivo da suspensão: no máximo 500 caracteres (`MOTIVO_LONGO_DEMAIS`, 422), e o registro `USUARIO_SUSPENSO` é marcado como sensível. O aviso na tela fica para a TSK-310.

## O que resta

- Cursor em milissegundos: um gravador futuro que use `now()` pularia linhas (TSK-412).
- Filtro por operação rara: se ficar quente, criar o índice `(instituicao_id, operacao, em)`.
- `ADD CONSTRAINT` com volume: usar `NOT VALID` + `VALIDATE`.
- `Grupo.criar` não emite evento (TSK-414).
- `pessoa_alvo_id` fica nulo até o módulo de pessoas.

_Atualizado em 08/10/2026._
