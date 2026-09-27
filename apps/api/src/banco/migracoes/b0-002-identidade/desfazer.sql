-- Reversão de b0-002-identidade.
--
-- Ordem: primeiro quem referencia (FK ou corpo de função SQL, que o Postgres
-- também rastreia como dependência), depois o referenciado — sem CASCADE
-- escondendo o que sai. `identidade.resolver_sujeito` pertence a
-- `cdd_resolvedor_identidade` desde o up(): `cdd_owner` só tem essa
-- pertinência WITH INHERIT FALSE (Doc 7 §8), então dropar a função exige
-- assumir o papel com SET ROLE (autorizado pelo WITH SET TRUE do papel) e
-- devolver a sessão a cdd_owner com RESET ROLE antes de seguir.

DROP TABLE IF EXISTS identidade.registro_de_auditoria;
DROP TABLE IF EXISTS identidade.convite;
DROP TABLE IF EXISTS identidade.usuario_grupo;
DROP TABLE IF EXISTS identidade.grupo_permissao;

SET ROLE cdd_resolvedor_identidade;
DROP FUNCTION IF EXISTS identidade.resolver_sujeito(text);
RESET ROLE;
REVOKE USAGE ON SCHEMA identidade FROM cdd_resolvedor_identidade;

DROP TABLE IF EXISTS identidade.usuario;
DROP TABLE IF EXISTS identidade.grupo;
DROP TABLE IF EXISTS identidade.permissao;
