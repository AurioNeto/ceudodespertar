-- Reversão de b0-010-resolver-convite.
--
-- A função pertence a cdd_resolvedor_identidade; cdd_owner a derruba sem SET
-- ROLE, pela pertinência (mesma razão de b0-002-identidade/desfazer.sql).
-- Lock: ACCESS EXCLUSIVE em identidade.convite até o commit (medido em
-- pg_locks), só catálogo, de milissegundos.

DROP POLICY IF EXISTS resolucao_do_convite ON identidade.convite;
DROP FUNCTION IF EXISTS identidade.resolver_convite(bytea);
REVOKE SELECT (token_sha256, instituicao_id, usuario_id) ON identidade.convite FROM cdd_resolvedor_identidade;
