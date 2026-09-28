-- Reversão de b0-002-identidade.
--
-- Ordem: primeiro quem referencia por FK (identidade.convite e
-- identidade.usuario_grupo apontam para identidade.usuario), depois o
-- referenciado — sem CASCADE escondendo o que sai.
--
-- `identidade.resolver_sujeito` pertence a `cdd_resolvedor_identidade` desde
-- o up() (ALTER FUNCTION ... OWNER TO), e `cdd_owner` só tem essa pertinência
-- WITH INHERIT FALSE (Doc 7 §8) — mas DROP FUNCTION não exige SET ROLE: a
-- checagem de posse de objeto do Postgres é por pertinência (equivalente a
-- pg_has_role(..., 'MEMBER')), não pelas "privileges of role" que exigem
-- INHERIT (pg_has_role(..., 'USAGE')). SET ROLE só seria necessário se algo
-- exigisse a sessão *ser* cdd_resolvedor_identidade (current_user), o que
-- não é o caso de um DROP. Confirmado ao vivo: `DROP FUNCTION
-- identidade.resolver_sujeito(text)` conectado como cdd_owner, sem nenhum
-- SET ROLE, funciona (Postgres 16.15).
--
-- A função sai antes de identidade.usuario só por organização do arquivo,
-- não porque o banco exija: uma função LANGUAGE sql não registra em
-- pg_depend as tabelas que só aparecem no texto do seu corpo — confirmado ao
-- vivo, DROP TABLE identidade.usuario passou com identidade.resolver_sujeito
-- (cujo corpo faz SELECT nela) ainda viva. Quem de fato protege a ordem
-- entre tabelas é a FK, não a função.

DROP TABLE IF EXISTS identidade.registro_de_auditoria;
DROP TABLE IF EXISTS identidade.convite;
DROP TABLE IF EXISTS identidade.usuario_grupo;
DROP TABLE IF EXISTS identidade.grupo_permissao;

DROP FUNCTION IF EXISTS identidade.resolver_sujeito(text);
REVOKE USAGE ON SCHEMA identidade FROM cdd_resolvedor_identidade;

DROP TABLE IF EXISTS identidade.usuario;
DROP TABLE IF EXISTS identidade.grupo;
DROP TABLE IF EXISTS identidade.permissao;
