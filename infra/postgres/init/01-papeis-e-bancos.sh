#!/usr/bin/env bash
set -euo pipefail

# Roda uma vez, na primeira inicialização do volume de dados (contrato do
# docker-entrypoint-initdb.d). $POSTGRES_USER é o superusuário do container.

: "${CDD_OWNER_SENHA:?defina CDD_OWNER_SENHA no .env}"
: "${CDD_APP_SENHA:?defina CDD_APP_SENHA no .env}"

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres \
  --file /cdd/papeis.sql

# Senha por -v (nunca interpolada no texto do script, nunca ecoada em log de
# statement — log_statement é 'none' por padrão na imagem oficial).
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres \
  --set senha_owner="$CDD_OWNER_SENHA" \
  --set senha_app="$CDD_APP_SENHA" <<-'SQL'
	ALTER ROLE cdd_owner PASSWORD :'senha_owner';
	ALTER ROLE cdd_app PASSWORD :'senha_app';
SQL

# template0, sem locale explícito: herda o locale com que o cluster foi
# inicializado, então nunca falha por nome de locale ausente na imagem.
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres <<-'SQL'
	SELECT 'CREATE DATABASE cdd OWNER cdd_owner TEMPLATE template0 ENCODING ''UTF8'''
	WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'cdd')
	\gexec
SQL
