#!/usr/bin/env bash
set -euo pipefail

raiz="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$raiz"

# Na CI (CI=true) não há .env: usa o .env.example, que só tem valores de dev local.
# Fora da CI a ausência do .env continua sendo erro, para ninguém rodar com defaults sem perceber.
arquivo_de_ambiente=.env
if [ ! -f "$arquivo_de_ambiente" ]; then
  if [ "${CI:-}" = "true" ] && [ -f .env.example ]; then
    arquivo_de_ambiente=.env.example
    echo "aceite-keycloak: CI sem .env; usando .env.example (valores de dev)"
  else
    echo "aceite-keycloak: .env ausente na raiz; copie de .env.example" >&2
    exit 1
  fi
fi

set -a
. "./$arquivo_de_ambiente"
set +a

porta_livre() {
  node -e "const s=require('node:net').createServer().listen(0,'127.0.0.1',()=>{console.log(s.address().port);s.close()})"
}

export ACEITE_PORTA_KEYCLOAK="${ACEITE_PORTA_KEYCLOAK:-$(porta_livre)}"
export ACEITE_PORTA_POSTGRES="${ACEITE_PORTA_POSTGRES:-$(porta_livre)}"
export ACEITE_PORTA_MAILPIT="${ACEITE_PORTA_MAILPIT:-$(porta_livre)}"
export ACEITE_PORTA_API="${ACEITE_PORTA_API:-$(porta_livre)}"

projeto="cdd-aceite-$$"
compose=(docker compose -p "$projeto" --env-file "$arquivo_de_ambiente" -f compose.yaml -f infra/aceite/compose.aceite.yaml)

# ACEITE_DIRETORIO_DO_LOG pré-definido (a CI usa isso para publicar o log): o script o cria e nunca o apaga
if [ -n "${ACEITE_DIRETORIO_DO_LOG:-}" ]; then
  diretorio_do_log="$ACEITE_DIRETORIO_DO_LOG"
  mkdir -p "$diretorio_do_log"
  apagar_log_no_sucesso=0
else
  diretorio_do_log="$(mktemp -d "${TMPDIR:-/tmp}/cdd-aceite-api-XXXXXX")"
  apagar_log_no_sucesso=1
fi
export ACEITE_DIRETORIO_DO_LOG="$diretorio_do_log"

derrubar() {
  local status=$?
  trap - EXIT INT TERM
  case "$projeto" in
    cdd-aceite-?*)
      if "${compose[@]}" down -v --remove-orphans >/dev/null 2>&1; then
        echo "aceite-keycloak: projeto $projeto derrubado"
      else
        echo "aceite-keycloak: FALHA ao derrubar o projeto $projeto; derrube à mão: docker compose -p $projeto down -v --remove-orphans" >&2
        [ "$status" -eq 0 ] && status=1
      fi
      ;;
  esac
  if [ "$status" -eq 0 ]; then
    if [ "$apagar_log_no_sucesso" -eq 1 ]; then
      rm -rf "$diretorio_do_log"
    fi
  else
    echo "aceite-keycloak: log da API mantido em $diretorio_do_log/api.log" >&2
  fi
  exit "$status"
}
trap derrubar EXIT INT TERM

echo "aceite-keycloak: projeto $projeto (keycloak:$ACEITE_PORTA_KEYCLOAK postgres:$ACEITE_PORTA_POSTGRES mailpit:$ACEITE_PORTA_MAILPIT api:$ACEITE_PORTA_API)"
"${compose[@]}" up -d --wait --wait-timeout 300 postgres keycloak mailpit

pnpm --filter @cdd/api build

(
  cd apps/api
  export BANCO_URL_MIGRACAO="postgres://cdd_owner:${CDD_OWNER_SENHA}@localhost:${ACEITE_PORTA_POSTGRES}/cdd"
  node --enable-source-maps dist/banco/cli.js migrar
)

(
  cd apps/api
  npx vitest run --config vitest.keycloak.config.ts --reporter=verbose "$@"
)
