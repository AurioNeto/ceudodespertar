#!/usr/bin/env bash
set -euo pipefail

# A máquina que chama este script não tem psql — só o container tem. Cada
# rodada cria um banco descartável, roda o esquema de referência (Doc 7) e a
# verificação (113 casos), confere a saída e apaga o banco.

servico=postgres
esquema=/cdd/referencia/cdd-07-esquema.sql
verificacao=/cdd/referencia/cdd-07-verificacao.sql
minimo_de_oks=113

rodar_rodada() {
  local papel="$1" banco="$2" clausula_owner="$3"

  echo "==> rodada como ${papel} (banco ${banco})"

  docker compose exec -T "$servico" \
    psql -v ON_ERROR_STOP=1 --username postgres --dbname postgres \
    -c "DROP DATABASE IF EXISTS ${banco};" \
    -c "CREATE DATABASE ${banco} ${clausula_owner} TEMPLATE template0 ENCODING 'UTF8';" \
    >/dev/null

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

rodar_rodada postgres cdd_verificacao_superusuario ""
rodar_rodada cdd_owner cdd_verificacao_owner "OWNER cdd_owner"

echo "db:verificar — as duas rodadas passaram"
