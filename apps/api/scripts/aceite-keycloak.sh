#!/usr/bin/env bash
set -euo pipefail

raiz="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$raiz"

if [ ! -f .env ]; then
  echo "aceite-keycloak: .env ausente na raiz; copie de .env.example" >&2
  exit 1
fi

set -a
. ./.env
set +a

porta_livre() {
  node -e "const s=require('node:net').createServer().listen(0,'127.0.0.1',()=>{console.log(s.address().port);s.close()})"
}

export ACEITE_PORTA_KEYCLOAK="${ACEITE_PORTA_KEYCLOAK:-$(porta_livre)}"
export ACEITE_PORTA_POSTGRES="${ACEITE_PORTA_POSTGRES:-$(porta_livre)}"
export ACEITE_PORTA_MAILPIT="${ACEITE_PORTA_MAILPIT:-$(porta_livre)}"
export ACEITE_PORTA_API="${ACEITE_PORTA_API:-$(porta_livre)}"

projeto="cdd-aceite-$$"
compose=(docker compose -p "$projeto" --env-file .env -f compose.yaml -f infra/aceite/compose.aceite.yaml)

diretorio_do_log="$(mktemp -d "${TMPDIR:-/tmp}/cdd-aceite-api-XXXXXX")"
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
    rm -rf "$diretorio_do_log"
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
