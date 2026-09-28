-- Papéis de cluster do CDD (Doc 7 §8, Doc 7 §22: "papéis de cluster criados
-- pela infra, não pela migration"). Puro, idempotente, sem senha — a senha
-- de cdd_owner e cdd_app é aplicada à parte por infra/postgres/init/01-papeis-e-bancos.sh
-- a partir do ambiente. Roda sempre como superusuário (docker-entrypoint-initdb.d).
--
-- cdd-07-esquema.sql cria cdd_app e cdd_resolvedor_link com CREATE ROLE ...
-- IF NOT EXISTS quando rodado sozinho (ex.: verificar-referencia.sh); aqui eles
-- já existem antes disso, então aquele bloco vira no-op e a LOGIN de cdd_app
-- sobrevive.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cdd_owner') THEN
    CREATE ROLE cdd_owner LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cdd_app') THEN
    CREATE ROLE cdd_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  END IF;

  -- Dono só de eventos.resolver_link (Doc 7 §8): lê o token de qualquer
  -- instituição por uma política própria, sem BYPASSRLS.
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cdd_resolvedor_link') THEN
    CREATE ROLE cdd_resolvedor_link NOLOGIN NOBYPASSRLS;
  END IF;

  -- Dono de identidade.resolver_sujeito (plano B0, item 4 da Arquitetura):
  -- resolve o `sub` do token sem instituição no contexto ainda.
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cdd_resolvedor_identidade') THEN
    CREATE ROLE cdd_resolvedor_identidade NOLOGIN NOBYPASSRLS;
  END IF;
END $$;

-- cdd_owner precisa assumir os três papéis (SET ROLE) para rodar migration —
-- inclusive o ALTER FUNCTION ... OWNER TO que transfere as funções resolvedoras
-- para o dono certo — mas não deve herdar as permissões deles por acidente:
-- sem INHERIT FALSE, cdd_owner leria o link ou o `sub` de qualquer instituição
-- sem contexto, o que o Doc 7 §8 proíbe até para o dono.
GRANT cdd_resolvedor_link, cdd_resolvedor_identidade, cdd_app
  TO cdd_owner
  WITH INHERIT FALSE, SET TRUE;

-- Orçamento de uma requisição web (Doc 7 §13): nunca uma conexão presa a uma
-- transação parada, nunca uma escrita esperando um lock por muito tempo.
ALTER ROLE cdd_app SET statement_timeout = '15s';
ALTER ROLE cdd_app SET idle_in_transaction_session_timeout = '30s';
ALTER ROLE cdd_app SET lock_timeout = '5s';
