-- b0-010-resolver-convite
--
-- A ativação do convite chega com o token e sem instituição no contexto, e
-- identidade.convite tem RLS FORCE: sem contexto, nem o dono leria a linha
-- para descobrir a casa. identidade.resolver_convite(hash) faz só essa
-- descoberta, no molde de identidade.resolver_sujeito (b0-002): SECURITY
-- DEFINER, search_path fixo, dono cdd_resolvedor_identidade (sem BYPASSRLS),
-- sem EXECUTE para PUBLIC.
--
-- Devolve no máximo uma linha (token_sha256 é UNIQUE) e só
-- (instituicao_id, usuario_id). A validade (usado, revogado, expirado) fica no
-- domínio, dentro do contexto da instituição já descoberta. O hash tem 256
-- bits derivados de um token aleatório: quem o apresenta já possui o segredo,
-- e não há como listar convites nem testar por prefixo ou intervalo.
--
-- O papel resolvedor ganha SELECT só nas colunas token_sha256, instituicao_id
-- e usuario_id de identidade.convite, e uma política FOR SELECT própria; cdd_app
-- continua preso à política por instituição e não ganha nada novo na tabela.
--
-- Efeito de lock e tamanho: CREATE FUNCTION não trava tabela. O GRANT de
-- coluna e o CREATE POLICY só tocam catálogo, mas a transação da migração
-- segura ACCESS EXCLUSIVE em identidade.convite até o commit (medido em
-- pg_locks); leituras e escritas da tabela esperam esse intervalo, de
-- milissegundos. Nada reescreve nem varre a tabela, e a migração não lê nem
-- grava linhas. O custo de execução da função é uma busca pelo índice único
-- de token_sha256.
--
-- Roda como cdd_owner.

CREATE FUNCTION identidade.resolver_convite(p_token_sha256 bytea)
  RETURNS TABLE (instituicao_id uuid, usuario_id uuid)
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
  SELECT c.instituicao_id, c.usuario_id
    FROM identidade.convite c
   WHERE c.token_sha256 = p_token_sha256
$$;
REVOKE ALL ON FUNCTION identidade.resolver_convite(bytea) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION identidade.resolver_convite(bytea) TO cdd_app;
GRANT SELECT (token_sha256, instituicao_id, usuario_id) ON identidade.convite TO cdd_resolvedor_identidade;
GRANT CREATE ON SCHEMA identidade TO cdd_resolvedor_identidade;
ALTER FUNCTION identidade.resolver_convite(bytea) OWNER TO cdd_resolvedor_identidade;
REVOKE CREATE ON SCHEMA identidade FROM cdd_resolvedor_identidade;
CREATE POLICY resolucao_do_convite ON identidade.convite FOR SELECT TO cdd_resolvedor_identidade USING (true);
