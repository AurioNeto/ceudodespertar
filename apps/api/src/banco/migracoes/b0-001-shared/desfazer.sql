-- Reversão de b0-001-shared.
--
-- Roda depois do down() de qualquer migration que crie tabela em `shared`
-- ou `identidade` (ordem inversa das migrations). As tabelas primeiro: cada
-- DROP TABLE carrega consigo a política e o RLS que
-- aplicar_isolamento_por_instituicao() tiver aplicado, e só depois disso as
-- funções ficam livres de dependente para sair — a política usa
-- shared.instituicao_atual() na expressão, e o Postgres não deixa dropar a
-- função enquanto uma política ainda a referencia.

DROP TABLE IF EXISTS shared.chave_de_idempotencia;
DROP TABLE IF EXISTS shared.evento_processado;
DROP TABLE IF EXISTS shared.outbox;
DROP TABLE IF EXISTS shared.instituicao;

DROP FUNCTION IF EXISTS shared.aplicar_isolamento_por_instituicao();
DROP FUNCTION IF EXISTS shared.proibir_truncate(regclass[]);
DROP FUNCTION IF EXISTS shared.somente_insercao();
DROP FUNCTION IF EXISTS shared.instituicao_atual();
