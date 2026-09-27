#!/usr/bin/env bash
set -euo pipefail

# A máquina que chama este script não tem psql — só o container tem. Cada
# rodada cria um banco descartável, roda o esquema de referência (Doc 7) e a
# verificação (113 casos), confere a saída e apaga o banco.

servico=postgres
esquema=/cdd/referencia/cdd-07-esquema.sql
verificacao=/cdd/referencia/cdd-07-verificacao.sql
minimo_de_oks=113

psql_superusuario() {
  docker compose exec -T "$servico" \
    psql -v ON_ERROR_STOP=1 --username postgres --dbname postgres "$@"
}

verificar_papeis_de_cluster() {
  echo "==> verificando papéis de cluster: sem SUPERUSER/BYPASSRLS em cdd_owner e cdd_app, grants de cdd_owner com INHERIT FALSE / SET TRUE"

  local papeis_inseguros
  papeis_inseguros="$(psql_superusuario -tAc "
    SELECT rolname FROM pg_roles
    WHERE rolname IN ('cdd_owner', 'cdd_app') AND (rolsuper OR rolbypassrls)
    ORDER BY rolname
  ")"

  if [ -n "$papeis_inseguros" ]; then
    echo "FALHA: papel(is) com SUPERUSER ou BYPASSRLS ligado: ${papeis_inseguros}" >&2
    exit 1
  fi

  local grants_corretos
  grants_corretos="$(psql_superusuario -tAc "
    SELECT count(*) FROM pg_auth_members m
    JOIN pg_roles concedido ON concedido.oid = m.roleid
    JOIN pg_roles beneficiario ON beneficiario.oid = m.member
    WHERE beneficiario.rolname = 'cdd_owner'
      AND concedido.rolname IN ('cdd_resolvedor_link', 'cdd_resolvedor_identidade', 'cdd_app')
      AND m.inherit_option = false
      AND m.set_option = true
  ")"

  if [ "$grants_corretos" -ne 3 ]; then
    echo "FALHA: esperava 3 grants para cdd_owner com INHERIT FALSE / SET TRUE (cdd_resolvedor_link, cdd_resolvedor_identidade, cdd_app), achei ${grants_corretos}" >&2
    exit 1
  fi

  echo "==> papéis de cluster OK"
}

rodar_rodada() {
  local papel="$1" banco="$2" clausula_owner="$3" exigir_nao_superusuario="$4"

  echo "==> rodada como ${papel} (banco ${banco})"

  psql_superusuario \
    -c "DROP DATABASE IF EXISTS ${banco};" \
    -c "CREATE DATABASE ${banco} ${clausula_owner} TEMPLATE template0 ENCODING 'UTF8';" \
    >/dev/null

  if [ "$exigir_nao_superusuario" = "sim" ]; then
    local eh_superusuario
    eh_superusuario="$(docker compose exec -T "$servico" \
      psql -v ON_ERROR_STOP=1 --username "${papel}" --dbname "${banco}" -tAc \
      "SELECT rolsuper FROM pg_roles WHERE rolname = current_user")"

    if [ "$eh_superusuario" != "f" ]; then
      echo "FALHA na rodada ${papel}: current_user está conectado como SUPERUSER — a prova de 'não depende de superusuário' não vale" >&2
      psql_superusuario -c "DROP DATABASE IF EXISTS ${banco};" >/dev/null 2>&1 || true
      exit 1
    fi
  fi

  local saida
  if ! saida="$(docker compose exec -T "$servico" \
    psql -v ON_ERROR_STOP=1 --username "${papel}" --dbname "${banco}" \
    --file "$esquema" --file "$verificacao" 2>&1)"; then
    echo "$saida"
    echo "FALHA na rodada ${papel}: psql saiu com erro" >&2
    docker compose exec -T "$servico" psql -v ON_ERROR_STOP=1 --username postgres --dbname postgres \
      -c "DROP DATABASE IF EXISTS ${banco};" >/dev/null 2>&1 || true
    exit 1
  fi

  echo "$saida"

  local oks
  oks="$(printf '%s\n' "$saida" | grep -c 'NOTICE:  OK' || true)"

  docker compose exec -T "$servico" psql -v ON_ERROR_STOP=1 --username postgres --dbname postgres \
    -c "DROP DATABASE ${banco};" >/dev/null

  if [ "$oks" -lt "$minimo_de_oks" ]; then
    echo "FALHA na rodada ${papel}: ${oks} linhas OK, esperado >= ${minimo_de_oks}" >&2
    exit 1
  fi

  if ! printf '%s\n' "$saida" | grep -q 'Verificação concluída'; then
    echo "FALHA na rodada ${papel}: faltou a linha 'Verificação concluída'" >&2
    exit 1
  fi

  echo "==> rodada ${papel}: ${oks} linhas OK, verificação concluída"
}

verificar_papeis_de_cluster
rodar_rodada postgres cdd_verificacao_superusuario "" nao
rodar_rodada cdd_owner cdd_verificacao_owner "OWNER cdd_owner" sim

echo "db:referencia — as duas rodadas passaram"
