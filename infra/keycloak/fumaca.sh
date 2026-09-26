#!/usr/bin/env bash
set -euo pipefail

# Roda do host com 'pnpm infra:subir' de pé. Lê o .env da raiz porque, ao
# contrário dos serviços do Compose, este script não roda dentro de um
# container — precisa buscar a senha do usuário de fumaça sozinho.

raiz="$(cd "$(dirname "$0")/../.." && pwd)"
emissor="${OIDC_EMISSOR:-http://localhost:8080/realms/cdd}"

if [ -f "${raiz}/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  . "${raiz}/.env"
  set +a
fi

: "${CDD_KC_DEV_SENHA:?defina CDD_KC_DEV_SENHA (no .env) antes de rodar a fumaça}"

falhou=0

falhar() {
  echo "FALHA: $1" >&2
  falhou=1
}

echo "==> discovery do realm"
codigo_discovery="$(curl -s -o /dev/null -w '%{http_code}' "${emissor}/.well-known/openid-configuration")"
if [ "$codigo_discovery" != "200" ]; then
  falhar "discovery respondeu ${codigo_discovery}, esperado 200"
else
  echo "    OK (200)"
fi

echo "==> token do cdd-teste com o usuário de desenvolvimento"
resposta_token="$(curl -s -X POST "${emissor}/protocol/openid-connect/token" \
  -d grant_type=password \
  -d client_id=cdd-teste \
  -d username=dev@cdd.local \
  --data-urlencode "password=${CDD_KC_DEV_SENHA}")"

access_token="$(printf '%s' "$resposta_token" | node -e "
  let entrada = '';
  process.stdin.on('data', (pedaco) => { entrada += pedaco; });
  process.stdin.on('end', () => {
    const corpo = JSON.parse(entrada);
    process.stdout.write(corpo.access_token ?? '');
  });
")"

if [ -z "$access_token" ]; then
  falhar "não obteve access_token do cdd-teste: ${resposta_token}"
else
  claims="$(node -e "
    const token = process.argv[1];
    const partes = token.split('.');
    const payload = JSON.parse(Buffer.from(partes[1], 'base64url').toString('utf8'));
    console.log(JSON.stringify(payload));
  " "$access_token")"

  audiencia_ok="$(node -e "
    const claims = JSON.parse(process.argv[1]);
    const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    process.stdout.write(aud.includes('cdd-api') ? 'sim' : 'nao');
  " "$claims")"

  duracao_ok="$(node -e "
    const claims = JSON.parse(process.argv[1]);
    process.stdout.write((claims.exp - claims.iat === 300) ? 'sim' : 'nao');
  " "$claims")"

  if [ "$audiencia_ok" != "sim" ]; then
    falhar "access token do cdd-teste não tem cdd-api no aud: ${claims}"
  else
    echo "    OK (aud inclui cdd-api)"
  fi

  if [ "$duracao_ok" != "sim" ]; then
    falhar "access token do cdd-teste não tem exp-iat = 300: ${claims}"
  else
    echo "    OK (exp - iat = 300)"
  fi
fi

echo "==> cdd-web precisa recusar password grant"
resposta_cdd_web="$(curl -s -w '\n%{http_code}' -X POST "${emissor}/protocol/openid-connect/token" \
  -d grant_type=password \
  -d client_id=cdd-web \
  -d username=dev@cdd.local \
  --data-urlencode "password=${CDD_KC_DEV_SENHA}")"

codigo_cdd_web="$(printf '%s' "$resposta_cdd_web" | tail -n1)"
if [ "$codigo_cdd_web" = "200" ]; then
  falhar "cdd-web aceitou password grant (deveria recusar)"
else
  echo "    OK (recusado, código ${codigo_cdd_web})"
fi

if [ "$falhou" != "0" ]; then
  exit 1
fi

echo "==> fumaça do Keycloak: todas as checagens passaram"
