#!/usr/bin/env bash
set -uo pipefail

# Roda do host com 'pnpm infra:subir' de pé. Lê o .env da raiz porque, ao
# contrário dos serviços do Compose, este script não roda dentro de um
# container — precisa buscar a senha do usuário de fumaça sozinho.

raiz="$(cd "$(dirname "$0")/../.." && pwd)"

if [ -f "${raiz}/.env" ]; then
  while IFS= read -r linha; do
    case "$linha" in
      ''|'#'*) continue ;;
    esac
    chave="${linha%%=*}"
    valor="${linha#*=}"
    if [ -z "${!chave+x}" ]; then
      export "${chave}=${valor}"
    fi
  done < "${raiz}/.env"
fi

emissor="${OIDC_EMISSOR:-http://localhost:8080/realms/cdd}"
export OIDC_EMISSOR="$emissor"

: "${CDD_KC_DEV_SENHA:?defina CDD_KC_DEV_SENHA (no .env) antes de rodar a fumaça}"

falhou=0

falhar() {
  echo "FALHA: $1" >&2
  falhou=1
}

echo "==> discovery do realm"
if ! codigo_discovery="$(curl -s -o /dev/null -w '%{http_code}' "${emissor}/.well-known/openid-configuration")"; then
  falhar "não conseguiu contatar o discovery do realm em ${emissor}"
elif [ "$codigo_discovery" != "200" ]; then
  falhar "discovery respondeu ${codigo_discovery}, esperado 200"
else
  echo "    OK (200)"
fi

echo "==> token do cdd-teste com o usuário de desenvolvimento"
if ! resposta_token="$(curl -s -X POST "${emissor}/protocol/openid-connect/token" \
  -d grant_type=password \
  -d client_id=cdd-teste \
  -d username=dev@cdd.local \
  --data-urlencode "password=${CDD_KC_DEV_SENHA}")"; then
  falhar "não conseguiu contatar o endpoint de token para o cdd-teste"
else
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
fi

echo "==> token do cdd-web (fluxo authorization code + PKCE)"
if ! resposta_cdd_web_codigo="$(node "${raiz}/infra/keycloak/obter-token-codigo-pkce.mjs" \
  cdd-web "http://localhost:5173/callback" "dev@cdd.local" "${CDD_KC_DEV_SENHA}")"; then
  falhar "não conseguiu obter token do cdd-web pelo fluxo código + PKCE"
else
  access_token_cdd_web="$(printf '%s' "$resposta_cdd_web_codigo" | node -e "
    let entrada = '';
    process.stdin.on('data', (pedaco) => { entrada += pedaco; });
    process.stdin.on('end', () => {
      const corpo = JSON.parse(entrada);
      process.stdout.write(corpo.access_token ?? '');
    });
  ")"

  if [ -z "$access_token_cdd_web" ]; then
    falhar "não obteve access_token do cdd-web: ${resposta_cdd_web_codigo}"
  else
    claims_cdd_web="$(node -e "
      const token = process.argv[1];
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
      console.log(JSON.stringify(payload));
    " "$access_token_cdd_web")"

    audiencia_cdd_web_ok="$(node -e "
      const claims = JSON.parse(process.argv[1]);
      const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
      process.stdout.write(aud.includes('cdd-api') ? 'sim' : 'nao');
    " "$claims_cdd_web")"

    duracao_cdd_web_ok="$(node -e "
      const claims = JSON.parse(process.argv[1]);
      process.stdout.write((claims.exp - claims.iat === 300) ? 'sim' : 'nao');
    " "$claims_cdd_web")"

    sem_pii_ok="$(node -e "
      const claims = JSON.parse(process.argv[1]);
      const temPii = 'email' in claims || 'name' in claims || 'given_name' in claims || 'family_name' in claims || 'preferred_username' in claims;
      process.stdout.write(temPii ? 'nao' : 'sim');
    " "$claims_cdd_web")"

    if [ "$audiencia_cdd_web_ok" != "sim" ]; then
      falhar "access token do cdd-web não tem cdd-api no aud: ${claims_cdd_web}"
    else
      echo "    OK (aud inclui cdd-api)"
    fi

    if [ "$duracao_cdd_web_ok" != "sim" ]; then
      falhar "access token do cdd-web não tem exp-iat = 300: ${claims_cdd_web}"
    else
      echo "    OK (exp - iat = 300)"
    fi

    if [ "$sem_pii_ok" != "sim" ]; then
      falhar "access token do cdd-web carrega e-mail/nome (deveriam ir só no ID token/userinfo): ${claims_cdd_web}"
    else
      echo "    OK (access token sem e-mail e sem nome)"
    fi
  fi
fi

echo "==> autorização sem code_challenge deve ser recusada (PKCE obrigatório)"
if ! resposta_sem_pkce="$(curl -s -D - -o /dev/null -G "${emissor}/protocol/openid-connect/auth" \
  --data-urlencode "client_id=cdd-web" \
  --data-urlencode "response_type=code" \
  --data-urlencode "redirect_uri=http://localhost:5173/callback" \
  --data-urlencode "scope=openid")"; then
  falhar "não conseguiu contatar o endpoint de autorização sem code_challenge"
elif printf '%s' "$resposta_sem_pkce" | grep -qi 'location:.*error=invalid_request'; then
  echo "    OK (recusado: error=invalid_request)"
else
  falhar "autorização sem code_challenge deveria ser recusada com error=invalid_request: ${resposta_sem_pkce}"
fi

echo "==> cdd-web precisa recusar oferta de sessão offline (offline_access)"
if ! resposta_offline_cdd_web="$(curl -s -D - -o /dev/null -G "${emissor}/protocol/openid-connect/auth" \
  --data-urlencode "client_id=cdd-web" \
  --data-urlencode "response_type=code" \
  --data-urlencode "redirect_uri=http://localhost:5173/callback" \
  --data-urlencode "scope=openid offline_access" \
  --data-urlencode "code_challenge=ZS_Cv2oAD2R7s1ebkXIup64X6LXidDUT2yF4RFGVC3Y" \
  --data-urlencode "code_challenge_method=S256")"; then
  falhar "não conseguiu contatar o endpoint de autorização com offline_access"
elif printf '%s' "$resposta_offline_cdd_web" | grep -qi 'location:.*error=invalid_scope'; then
  echo "    OK (recusado: invalid_scope)"
else
  falhar "cdd-web aceitou offline_access na autorização: ${resposta_offline_cdd_web}"
fi

echo "==> cdd-web precisa recusar password grant"
if ! resposta_cdd_web="$(curl -s -X POST "${emissor}/protocol/openid-connect/token" \
  -d grant_type=password \
  -d client_id=cdd-web \
  -d username=dev@cdd.local \
  --data-urlencode "password=${CDD_KC_DEV_SENHA}")"; then
  falhar "não conseguiu contatar o endpoint de token para testar a recusa do cdd-web"
elif printf '%s' "$resposta_cdd_web" | grep -q '"error":"unauthorized_client"'; then
  echo "    OK (recusado, error=unauthorized_client)"
else
  falhar "cdd-web deveria recusar password grant com error=unauthorized_client: ${resposta_cdd_web}"
fi

echo "==> clients embutidos do Keycloak com offline_access (risco aceito, ver README)"
echo "    account, account-console, admin-cli, broker, realm-management e security-admin-console"
echo "    seguem com offline_access disponível — nenhum deles tem aud=cdd-api, então a API recusa"
echo "    qualquer token emitido por eles independentemente de terem sessão offline."

if [ "$falhou" != "0" ]; then
  exit 1
fi

echo "==> fumaça do Keycloak: todas as checagens passaram"
