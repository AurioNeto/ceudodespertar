-- Executar como postgres, depois de infra/postgres/papeis.sql.
-- As senhas dos papéis são configuradas separadamente, fora do versionamento.
GRANT cdd_owner TO postgres WITH INHERIT FALSE, SET TRUE;

DO $$
BEGIN
  EXECUTE format('GRANT CONNECT, CREATE ON DATABASE %I TO cdd_owner', current_database());
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO cdd_app', current_database());
END $$;

GRANT USAGE, CREATE ON SCHEMA public TO cdd_owner;
SET ROLE cdd_owner;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM PUBLIC, anon, authenticated, service_role;
RESET ROLE;
