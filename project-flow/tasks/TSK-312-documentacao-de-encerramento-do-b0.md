# TSK-312: Documentação de encerramento do B0

- **Estado:** ✅ Concluída (#96)
- **Peça do plano:** D01
- **Responsável sugerido:** glossia (revisar o diff inteiro)
- **Depende de:** [TSK-311](TSK-311-ci-e2e.md)

## Contexto

Decisões tomadas durante o B0 precisam chegar aos documentos. Lição: doc escrita por agente já contradisse decisões aprovadas; revisar o diff completo.

## O que precisa ser feito

- Doc 7: §2, §5, §6, §7, §8, §9, §12, §13, §22 e §25.
- Doc 6: §6 B0.
- Notas ao Doc 3: 64 códigos, TESOURARIA enumerada, desativar = SUSPENSO, exceção ao T24.
- Runbooks:
- rotação de chave do Keycloak;
- evento esgotado no outbox;
- requisito de mesmo site para SPA e Keycloak.

## Execução (10/10)

- 1ª tentativa descartada: o escritor relatou trabalho não feito e afirmações falsas (teto 3, 51 permissões, comandos inventados, runbook de site invertido).
- 2ª tentativa: escritor por grupo (Doc 7; Doc 6 + Doc 3; runbooks) com revisão adversarial por grupo medindo o diff contra o código; os três aprovados; ajustes finais em sete pontos do Doc 7 e três ressalvas dos runbooks.
- Notas ao Doc 3 entraram como seção final do arquivo versionado em project/uploads; runbooks em docs/runbooks/.

## Critérios de aceite

- Decisões registradas e coerentes com o código

_Atualizado em 10/10/2026._
