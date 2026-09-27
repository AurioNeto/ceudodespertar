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
: "${CDD_KC_ADMIN_SEGREDO:?defina CDD_KC_ADMIN_SEGREDO (no .env) antes de rodar a fumaça}"

falhou=0

falhar() {
  echo "FALHA: $1" >&2
  falhou=1
}

echo "==> discovery do realm"
if ! codigo_discovery="$(curl -s --max-time 20 -o /dev/null -w '%{http_code}' "${emissor}/.well-known/openid-configuration")"; then
  falhar "não conseguiu contatar o discovery do realm em ${emissor}"
elif [ "$codigo_discovery" != "200" ]; then
  falhar "discovery respondeu ${codigo_discovery}, esperado 200"
else
  echo "    OK (200)"
fi

echo "==> token do cdd-teste com o usuário de desenvolvimento"
if ! resposta_token="$(curl -s --max-time 20 -X POST "${emissor}/protocol/openid-connect/token" \
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

    sem_pii_cdd_teste_ok="$(node -e "
      const claims = JSON.parse(process.argv[1]);
      const temPii = 'email' in claims || 'name' in claims || 'given_name' in claims || 'family_name' in claims || 'preferred_username' in claims || 'upn' in claims;
      process.stdout.write(temPii ? 'nao' : 'sim');
    " "$claims")"

    if [ "$sem_pii_cdd_teste_ok" != "sim" ]; then
      falhar "access token do cdd-teste carrega e-mail/nome/upn: ${claims}"
    else
      echo "    OK (access token sem e-mail, sem nome e sem upn)"
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
if ! resposta_sem_pkce="$(curl -s --max-time 20 -D - -o /dev/null -G "${emissor}/protocol/openid-connect/auth" \
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
if ! resposta_offline_cdd_web="$(curl -s --max-time 20 -D - -o /dev/null -G "${emissor}/protocol/openid-connect/auth" \
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
  falhar "cdd-web deveria recusar offline_access com error=invalid_scope, resposta obtida: ${resposta_offline_cdd_web}"
fi

echo "==> cdd-web precisa recusar password grant"
if ! resposta_cdd_web="$(curl -s --max-time 20 -X POST "${emissor}/protocol/openid-connect/token" \
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

echo "==> cdd-teste precisa recusar oferta de sessão offline (offline_access)"
if ! resposta_offline_cdd_teste="$(curl -s --max-time 20 -X POST "${emissor}/protocol/openid-connect/token" \
  -d grant_type=password \
  -d client_id=cdd-teste \
  -d scope="openid offline_access" \
  -d username=dev@cdd.local \
  --data-urlencode "password=${CDD_KC_DEV_SENHA}")"; then
  falhar "não conseguiu contatar o endpoint de token para testar offline_access no cdd-teste"
elif printf '%s' "$resposta_offline_cdd_teste" | grep -q '"error":"invalid_scope"'; then
  echo "    OK (recusado: invalid_scope)"
else
  falhar "cdd-teste deveria recusar offline_access com error=invalid_scope, resposta obtida: ${resposta_offline_cdd_teste}"
fi

echo "==> admin-cli precisa recusar oferta de sessão offline (offline_access)"
if ! resposta_offline_admin_cli="$(curl -s --max-time 20 -X POST "${emissor}/protocol/openid-connect/token" \
  -d grant_type=password \
  -d client_id=admin-cli \
  -d scope="openid offline_access" \
  -d username=dev@cdd.local \
  --data-urlencode "password=${CDD_KC_DEV_SENHA}")"; then
  falhar "não conseguiu contatar o endpoint de token para testar offline_access no admin-cli"
elif printf '%s' "$resposta_offline_admin_cli" | grep -q '"error":"invalid_scope"'; then
  echo "    OK (recusado: invalid_scope)"
else
  falhar "admin-cli deveria recusar offline_access com error=invalid_scope, resposta obtida: ${resposta_offline_admin_cli}"
fi

echo "==> admin-cli precisa continuar autenticando por password grant, sem aud=cdd-api"
if ! resposta_admin_cli="$(curl -s --max-time 20 -X POST "${emissor}/protocol/openid-connect/token" \
  -d grant_type=password \
  -d client_id=admin-cli \
  -d username=dev@cdd.local \
  --data-urlencode "password=${CDD_KC_DEV_SENHA}")"; then
  falhar "não conseguiu contatar o endpoint de token para o admin-cli"
else
  access_token_admin_cli="$(printf '%s' "$resposta_admin_cli" | node -e "
    let entrada = '';
    process.stdin.on('data', (pedaco) => { entrada += pedaco; });
    process.stdin.on('end', () => {
      const corpo = JSON.parse(entrada);
      process.stdout.write(corpo.access_token ?? '');
    });
  ")"

  if [ -z "$access_token_admin_cli" ]; then
    falhar "admin-cli deveria continuar autenticando por password grant: ${resposta_admin_cli}"
  else
    audiencia_admin_cli_ok="$(node -e "
      const token = process.argv[1];
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
      const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud].filter(Boolean);
      process.stdout.write(aud.includes('cdd-api') ? 'nao' : 'sim');
    " "$access_token_admin_cli")"

    if [ "$audiencia_admin_cli_ok" != "sim" ]; then
      falhar "token do admin-cli não deveria ter cdd-api no aud"
    else
      echo "    OK (password grant funciona, sem aud=cdd-api)"
    fi
  fi
fi

echo "==> device flow do cdd-web precisa ser recusado (device grant desligado)"
if ! resposta_device_cdd_web="$(curl -s --max-time 20 -X POST "${emissor}/protocol/openid-connect/auth/device" \
  -d client_id=cdd-web \
  -d code_challenge=ZS_Cv2oAD2R7s1ebkXIup64X6LXidDUT2yF4RFGVC3Y \
  -d code_challenge_method=S256)"; then
  falhar "não conseguiu contatar o endpoint de device authorization"
elif printf '%s' "$resposta_device_cdd_web" | grep -q '"error":"unauthorized_client"'; then
  echo "    OK (recusado, error=unauthorized_client)"
else
  falhar "cdd-web deveria recusar o device flow com error=unauthorized_client: ${resposta_device_cdd_web}"
fi

echo "==> cdd-api-admin precisa recusar client_credentials com o texto literal do placeholder"
if ! resposta_segredo_literal="$(curl -s --max-time 20 -X POST "${emissor}/protocol/openid-connect/token" \
  -d grant_type=client_credentials \
  -d client_id=cdd-api-admin \
  --data-urlencode 'client_secret=${CDD_KC_ADMIN_SEGREDO}')"; then
  falhar "não conseguiu contatar o endpoint de token para testar o segredo literal do cdd-api-admin"
else
  tem_access_token_literal="$(printf '%s' "$resposta_segredo_literal" | node -e "
    let entrada = '';
    process.stdin.on('data', (pedaco) => { entrada += pedaco; });
    process.stdin.on('end', () => {
      const corpo = JSON.parse(entrada);
      process.stdout.write(corpo.access_token ? 'sim' : 'nao');
    });
  ")"
  if [ "$tem_access_token_literal" = "sim" ]; then
    falhar "cdd-api-admin aceitou o texto literal do placeholder como segredo (a variável de ambiente não foi resolvida): ${resposta_segredo_literal}"
  else
    echo "    OK (recusado; resposta obtida: ${resposta_segredo_literal})"
  fi
fi

echo "==> cdd-api-admin precisa aceitar client_credentials com o segredo real e só ter manage-users"
if ! resposta_segredo_real="$(curl -s --max-time 20 -X POST "${emissor}/protocol/openid-connect/token" \
  -d grant_type=client_credentials \
  -d client_id=cdd-api-admin \
  --data-urlencode "client_secret=${CDD_KC_ADMIN_SEGREDO}")"; then
  falhar "não conseguiu contatar o endpoint de token para o segredo real do cdd-api-admin"
else
  access_token_cdd_api_admin="$(printf '%s' "$resposta_segredo_real" | node -e "
    let entrada = '';
    process.stdin.on('data', (pedaco) => { entrada += pedaco; });
    process.stdin.on('end', () => {
      const corpo = JSON.parse(entrada);
      process.stdout.write(corpo.access_token ?? '');
    });
  ")"

  if [ -z "$access_token_cdd_api_admin" ]; then
    falhar "não obteve access_token do cdd-api-admin com o segredo real: ${resposta_segredo_real}"
  else
    claims_cdd_api_admin="$(node -e "
      const token = process.argv[1];
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
      console.log(JSON.stringify(payload));
    " "$access_token_cdd_api_admin")"

    papeis_esperados_ok="$(node -e "
      const claims = JSON.parse(process.argv[1]);
      const resourceAccess = claims.resource_access ?? {};
      const chaves = Object.keys(resourceAccess);
      const papeisDeRealmManagement = resourceAccess['realm-management']?.roles ?? [];
      const soManageUsers = papeisDeRealmManagement.length === 1 && papeisDeRealmManagement[0] === 'manage-users';
      const soRealmManagement = chaves.length === 1 && chaves[0] === 'realm-management';
      const semRealmAccess = !claims.realm_access || (claims.realm_access.roles ?? []).length === 0;
      process.stdout.write(soManageUsers && soRealmManagement && semRealmAccess ? 'sim' : 'nao');
    " "$claims_cdd_api_admin")"

    if [ "$papeis_esperados_ok" != "sim" ]; then
      falhar "token do cdd-api-admin devia ter só resource_access.realm-management.roles=[manage-users] e nenhum realm_access, obteve: ${claims_cdd_api_admin}"
    else
      echo "    OK (aceito; papéis obtidos: resource_access.realm-management.roles=[manage-users], sem realm_access)"
    fi
  fi
fi

if [ "$falhou" != "0" ]; then
  exit 1
fi

echo "==> fumaça do Keycloak: todas as checagens passaram"
