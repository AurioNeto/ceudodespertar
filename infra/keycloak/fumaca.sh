#!/usr/bin/env bash
set -uo pipefail

# Roda do host com 'pnpm infra:subir' de pé. As credenciais nunca entram na
# linha de comando de curl/node (apareceriam no ps de qualquer usuário local):
# vão por arquivo temporário (chmod 600, apagado no trap) ou por stdin.

raiz="$(cd "$(dirname "$0")/../.." && pwd)"
tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT

resolver_variaveis_do_compose() {
  local saida_compose
  saida_compose="$(cd "$raiz" && docker compose config --format json 2>/dev/null)" || return 0
  local arquivo_config="${tmpdir}/compose-config.json"
  printf '%s' "$saida_compose" > "$arquivo_config"
  while IFS='=' read -r chave valor; do
    [ -z "$chave" ] && continue
    if [ -z "${!chave+x}" ]; then
      export "${chave}=${valor}"
    fi
  done < <(node -e "
    const fs = require('node:fs');
    let config;
    try { config = JSON.parse(fs.readFileSync(process.argv[1], 'utf8')); } catch { process.exit(0); }
    const ambiente = config.services?.keycloak?.environment ?? {};
    for (const [chave, valorDaVariavel] of Object.entries(ambiente)) {
      if (valorDaVariavel === undefined || valorDaVariavel === null) continue;
      process.stdout.write(chave + '=' + String(valorDaVariavel) + '\n');
    }
  " "$arquivo_config")
}

resolver_variaveis_do_compose

emissor="${OIDC_EMISSOR:-http://localhost:8080/realms/cdd}"
export OIDC_EMISSOR="$emissor"
url_base="${emissor%/realms/*}"

: "${CDD_KC_DEV_SENHA:?defina CDD_KC_DEV_SENHA (no .env) antes de rodar a fumaça}"
: "${CDD_KC_ADMIN_SEGREDO:?defina CDD_KC_ADMIN_SEGREDO (no .env) antes de rodar a fumaça}"

falhou=0

falhar() {
  echo "FALHA: $1" >&2
  falhou=1
}

arquivo_de_segredo() {
  local nome="$1"
  local valor="$2"
  local caminho="${tmpdir}/${nome}"
  printf '%s' "$valor" > "$caminho"
  chmod 600 "$caminho"
  printf '%s' "$caminho"
}

arq_senha_dev="$(arquivo_de_segredo senha-dev "$CDD_KC_DEV_SENHA")"
arq_segredo_admin="$(arquivo_de_segredo segredo-admin "$CDD_KC_ADMIN_SEGREDO")"
arq_segredo_placeholder="$(arquivo_de_segredo segredo-placeholder '${CDD_KC_ADMIN_SEGREDO}')"

campo_do_json() {
  local campo="$1"
  node -e "
    let entrada = '';
    process.stdin.on('data', (pedaco) => { entrada += pedaco; });
    process.stdin.on('end', () => {
      let corpo;
      try { corpo = JSON.parse(entrada); } catch { corpo = {}; }
      const valor = corpo[process.argv[1]];
      process.stdout.write(valor === undefined || valor === null ? '' : String(valor));
    });
  " "$campo"
}

claims_do_token() {
  node -e "
    let entrada = '';
    process.stdin.on('data', (pedaco) => { entrada += pedaco; });
    process.stdin.on('end', () => {
      const token = entrada.trim();
      if (!token) { process.stdout.write('{}'); return; }
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
      process.stdout.write(JSON.stringify(payload));
    });
  "
}

tem_pii_de_id_token() {
  node -e "
    let entrada = '';
    process.stdin.on('data', (pedaco) => { entrada += pedaco; });
    process.stdin.on('end', () => {
      const claims = JSON.parse(entrada);
      const temPii = 'email' in claims || 'name' in claims || 'given_name' in claims || 'family_name' in claims || 'preferred_username' in claims || 'upn' in claims || 'mail' in claims;
      process.stdout.write(temPii ? 'nao' : 'sim');
    });
  "
}

audiencia_inclui() {
  local alvo="$1"
  node -e "
    let entrada = '';
    process.stdin.on('data', (pedaco) => { entrada += pedaco; });
    process.stdin.on('end', () => {
      const claims = JSON.parse(entrada);
      const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud].filter(Boolean);
      process.stdout.write(aud.includes(process.argv[1]) ? 'sim' : 'nao');
    });
  " "$alvo"
}

duracao_e() {
  local esperado="$1"
  node -e "
    let entrada = '';
    process.stdin.on('data', (pedaco) => { entrada += pedaco; });
    process.stdin.on('end', () => {
      const claims = JSON.parse(entrada);
      process.stdout.write((claims.exp - claims.iat === Number(process.argv[1])) ? 'sim' : 'nao');
    });
  " "$esperado"
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
  --data-urlencode "password@${arq_senha_dev}")"; then
  falhar "não conseguiu contatar o endpoint de token para o cdd-teste"
else
  access_token="$(printf '%s' "$resposta_token" | campo_do_json access_token)"

  if [ -z "$access_token" ]; then
    falhar "não obteve access_token do cdd-teste (error=$(printf '%s' "$resposta_token" | campo_do_json error))"
  else
    claims="$(printf '%s' "$access_token" | claims_do_token)"
    audiencia_ok="$(printf '%s' "$claims" | audiencia_inclui cdd-api)"
    duracao_ok="$(printf '%s' "$claims" | duracao_e 300)"
    sem_pii_cdd_teste_ok="$(printf '%s' "$claims" | tem_pii_de_id_token)"

    if [ "$audiencia_ok" != "sim" ]; then
      falhar "access token do cdd-teste não tem cdd-api no aud"
    else
      echo "    OK (aud inclui cdd-api)"
    fi

    if [ "$duracao_ok" != "sim" ]; then
      falhar "access token do cdd-teste não tem exp-iat = 300"
    else
      echo "    OK (exp - iat = 300)"
    fi

    if [ "$sem_pii_cdd_teste_ok" != "sim" ]; then
      falhar "access token do cdd-teste carrega e-mail/nome/upn"
    else
      echo "    OK (access token sem e-mail, sem nome e sem upn)"
    fi
  fi
fi

echo "==> token do cdd-web (fluxo authorization code + PKCE)"
if ! resposta_cdd_web_codigo="$(printf '%s' "$CDD_KC_DEV_SENHA" | node "${raiz}/infra/keycloak/obter-token-codigo-pkce.mjs" \
  cdd-web "http://localhost:5173/callback" "dev@cdd.local")"; then
  falhar "não conseguiu obter token do cdd-web pelo fluxo código + PKCE"
else
  access_token_cdd_web="$(printf '%s' "$resposta_cdd_web_codigo" | campo_do_json access_token)"

  if [ -z "$access_token_cdd_web" ]; then
    falhar "não obteve access_token do cdd-web (error=$(printf '%s' "$resposta_cdd_web_codigo" | campo_do_json error))"
  else
    claims_cdd_web="$(printf '%s' "$access_token_cdd_web" | claims_do_token)"
    audiencia_cdd_web_ok="$(printf '%s' "$claims_cdd_web" | audiencia_inclui cdd-api)"
    duracao_cdd_web_ok="$(printf '%s' "$claims_cdd_web" | duracao_e 300)"
    sem_pii_ok="$(printf '%s' "$claims_cdd_web" | tem_pii_de_id_token)"

    if [ "$audiencia_cdd_web_ok" != "sim" ]; then
      falhar "access token do cdd-web não tem cdd-api no aud"
    else
      echo "    OK (aud inclui cdd-api)"
    fi

    if [ "$duracao_cdd_web_ok" != "sim" ]; then
      falhar "access token do cdd-web não tem exp-iat = 300"
    else
      echo "    OK (exp - iat = 300)"
    fi

    if [ "$sem_pii_ok" != "sim" ]; then
      falhar "access token do cdd-web carrega e-mail/nome (deveriam ir só no ID token/userinfo)"
    else
      echo "    OK (access token sem e-mail e sem nome)"
    fi
  fi
fi

# O tema é montado no container (compose.yaml); se a montagem sumir, o Keycloak
# cai calado no tema padrão e os verificadores do realm continuam verdes.
echo "==> página de login do cdd-web precisa ser servida pelo tema cdd"
if ! pagina_login="$(curl -s --max-time 20 -G "${emissor}/protocol/openid-connect/auth" \
  --data-urlencode "client_id=cdd-web" \
  --data-urlencode "response_type=code" \
  --data-urlencode "redirect_uri=http://localhost:5173/callback" \
  --data-urlencode "scope=openid" \
  --data-urlencode "code_challenge=ZS_Cv2oAD2R7s1ebkXIup64X6LXidDUT2yF4RFGVC3Y" \
  --data-urlencode "code_challenge_method=S256")"; then
  falhar "não conseguiu abrir a página de login do cdd-web"
elif printf '%s' "$pagina_login" | grep -q '/resources/[^"]*/login/cdd/css/cdd.css' \
  && printf '%s' "$pagina_login" | grep -q 'type="importmap"'; then
  echo "    OK (cdd.css e importmap presentes)"
else
  falhar "página de login sem o cdd.css ou sem o importmap: o tema cdd não está sendo servido"
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
  falhar "autorização sem code_challenge deveria ser recusada com error=invalid_request"
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
  falhar "cdd-web deveria recusar offline_access com error=invalid_scope"
fi

echo "==> cdd-web precisa recusar password grant"
if ! resposta_cdd_web="$(curl -s --max-time 20 -X POST "${emissor}/protocol/openid-connect/token" \
  -d grant_type=password \
  -d client_id=cdd-web \
  -d username=dev@cdd.local \
  --data-urlencode "password@${arq_senha_dev}")"; then
  falhar "não conseguiu contatar o endpoint de token para testar a recusa do cdd-web"
elif [ "$(printf '%s' "$resposta_cdd_web" | campo_do_json error)" = "unauthorized_client" ]; then
  echo "    OK (recusado, error=unauthorized_client)"
else
  falhar "cdd-web deveria recusar password grant com error=unauthorized_client"
fi

echo "==> cdd-teste precisa recusar oferta de sessão offline (offline_access)"
if ! resposta_offline_cdd_teste="$(curl -s --max-time 20 -X POST "${emissor}/protocol/openid-connect/token" \
  -d grant_type=password \
  -d client_id=cdd-teste \
  -d scope="openid offline_access" \
  -d username=dev@cdd.local \
  --data-urlencode "password@${arq_senha_dev}")"; then
  falhar "não conseguiu contatar o endpoint de token para testar offline_access no cdd-teste"
elif [ "$(printf '%s' "$resposta_offline_cdd_teste" | campo_do_json error)" = "invalid_scope" ]; then
  echo "    OK (recusado: invalid_scope)"
else
  falhar "cdd-teste deveria recusar offline_access com error=invalid_scope"
fi

echo "==> admin-cli precisa recusar oferta de sessão offline (offline_access)"
if ! resposta_offline_admin_cli="$(curl -s --max-time 20 -X POST "${emissor}/protocol/openid-connect/token" \
  -d grant_type=password \
  -d client_id=admin-cli \
  -d scope="openid offline_access" \
  -d username=dev@cdd.local \
  --data-urlencode "password@${arq_senha_dev}")"; then
  falhar "não conseguiu contatar o endpoint de token para testar offline_access no admin-cli"
elif [ "$(printf '%s' "$resposta_offline_admin_cli" | campo_do_json error)" = "invalid_scope" ]; then
  echo "    OK (recusado: invalid_scope)"
else
  falhar "admin-cli deveria recusar offline_access com error=invalid_scope"
fi

echo "==> admin-cli precisa continuar autenticando por password grant, sem aud=cdd-api"
if ! resposta_admin_cli="$(curl -s --max-time 20 -X POST "${emissor}/protocol/openid-connect/token" \
  -d grant_type=password \
  -d client_id=admin-cli \
  -d username=dev@cdd.local \
  --data-urlencode "password@${arq_senha_dev}")"; then
  falhar "não conseguiu contatar o endpoint de token para o admin-cli"
else
  access_token_admin_cli="$(printf '%s' "$resposta_admin_cli" | campo_do_json access_token)"

  if [ -z "$access_token_admin_cli" ]; then
    falhar "admin-cli deveria continuar autenticando por password grant (error=$(printf '%s' "$resposta_admin_cli" | campo_do_json error))"
  else
    audiencia_admin_cli_ok="$(printf '%s' "$access_token_admin_cli" | claims_do_token | audiencia_inclui cdd-api)"

    if [ "$audiencia_admin_cli_ok" = "sim" ]; then
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
elif [ "$(printf '%s' "$resposta_device_cdd_web" | campo_do_json error)" = "unauthorized_client" ]; then
  echo "    OK (recusado, error=unauthorized_client)"
else
  falhar "cdd-web deveria recusar o device flow com error=unauthorized_client"
fi

echo "==> cdd-api-admin precisa recusar client_credentials com o texto literal do placeholder"
if ! resposta_segredo_literal="$(curl -s --max-time 20 -X POST "${emissor}/protocol/openid-connect/token" \
  -d grant_type=client_credentials \
  -d client_id=cdd-api-admin \
  --data-urlencode "client_secret@${arq_segredo_placeholder}")"; then
  falhar "não conseguiu contatar o endpoint de token para testar o segredo literal do cdd-api-admin"
else
  tem_access_token_literal="$(printf '%s' "$resposta_segredo_literal" | campo_do_json access_token)"
  if [ -n "$tem_access_token_literal" ]; then
    falhar "cdd-api-admin aceitou o texto literal do placeholder como segredo (a variável de ambiente não foi resolvida) — access_token OMITIDO deste log de propósito"
  else
    echo "    OK (recusado; error=$(printf '%s' "$resposta_segredo_literal" | campo_do_json error))"
  fi
fi

echo "==> cdd-api-admin precisa aceitar client_credentials com o segredo real e só ter manage-users"
if ! resposta_segredo_real="$(curl -s --max-time 20 -X POST "${emissor}/protocol/openid-connect/token" \
  -d grant_type=client_credentials \
  -d client_id=cdd-api-admin \
  --data-urlencode "client_secret@${arq_segredo_admin}")"; then
  falhar "não conseguiu contatar o endpoint de token para o segredo real do cdd-api-admin"
else
  access_token_cdd_api_admin="$(printf '%s' "$resposta_segredo_real" | campo_do_json access_token)"

  if [ -z "$access_token_cdd_api_admin" ]; then
    falhar "não obteve access_token do cdd-api-admin com o segredo real (error=$(printf '%s' "$resposta_segredo_real" | campo_do_json error))"
  else
    claims_cdd_api_admin="$(printf '%s' "$access_token_cdd_api_admin" | claims_do_token)"

    papeis_esperados_ok="$(printf '%s' "$claims_cdd_api_admin" | node -e "
      let entrada = '';
      process.stdin.on('data', (pedaco) => { entrada += pedaco; });
      process.stdin.on('end', () => {
        const claims = JSON.parse(entrada);
        const resourceAccess = claims.resource_access ?? {};
        const chaves = Object.keys(resourceAccess);
        const papeisDeRealmManagement = resourceAccess['realm-management']?.roles ?? [];
        const soManageUsers = papeisDeRealmManagement.length === 1 && papeisDeRealmManagement[0] === 'manage-users';
        const soRealmManagement = chaves.length === 1 && chaves[0] === 'realm-management';
        const semRealmAccess = !claims.realm_access || (claims.realm_access.roles ?? []).length === 0;
        process.stdout.write(soManageUsers && soRealmManagement && semRealmAccess ? 'sim' : 'nao');
      });
    ")"

    if [ "$papeis_esperados_ok" != "sim" ]; then
      falhar "token do cdd-api-admin devia ter só resource_access.realm-management.roles=[manage-users] e nenhum realm_access"
    else
      echo "    OK (aceito; papéis obtidos: resource_access.realm-management.roles=[manage-users], sem realm_access)"
    fi
  fi
fi

echo "==> conta de serviço do cdd-api-admin cria um usuário de prova, que não pode herdar papel além do padrão do realm"
if [ -z "${access_token_cdd_api_admin:-}" ]; then
  falhar "sem token da conta de serviço cdd-api-admin para o teste do usuário de prova"
else
  usuario_prova="fumaca-prova-$$@cdd.local"
  arquivo_corpo_usuario="${tmpdir}/usuario-prova.json"
  node -e "
    const usuario = process.argv[1];
    console.log(JSON.stringify({
      username: usuario, email: usuario, firstName: 'Fumaca', lastName: 'Prova',
      enabled: true, emailVerified: true,
      credentials: [{ type: 'password', value: process.argv[2], temporary: false }],
    }));
  " "$usuario_prova" "Fumaca-Prova-$$-Ab1" > "$arquivo_corpo_usuario"
  chmod 600 "$arquivo_corpo_usuario"

  resposta_criacao_prova="$(curl -s --max-time 20 -D - -o /dev/null -X POST "${url_base}/admin/realms/cdd/users" \
    -H "Authorization: Bearer ${access_token_cdd_api_admin}" \
    -H 'content-type: application/json' \
    --data-binary "@${arquivo_corpo_usuario}")"
  codigo_criacao_prova="$(printf '%s' "$resposta_criacao_prova" | head -1 | grep -o '[0-9]\{3\}' | head -1)"

  if [ "$codigo_criacao_prova" != "201" ]; then
    falhar "não conseguiu criar o usuário de prova pela conta de serviço (HTTP ${codigo_criacao_prova:-?})"
  else
    localizacao_prova="$(printf '%s' "$resposta_criacao_prova" | tr -d '\r' | grep -i '^location:' | sed 's/^[Ll]ocation: *//')"
    id_prova="${localizacao_prova##*/}"

    papeis_realm_prova="$(curl -s --max-time 20 -H "Authorization: Bearer ${access_token_cdd_api_admin}" \
      "${url_base}/admin/realms/cdd/users/${id_prova}/role-mappings/realm/composite")"
    papeis_realm_esperados_ok="$(printf '%s' "$papeis_realm_prova" | node -e "
      let entrada = '';
      process.stdin.on('data', (p) => entrada += p);
      process.stdin.on('end', () => {
        let papeis;
        try { papeis = JSON.parse(entrada); } catch { papeis = null; }
        const esperados = ['default-roles-cdd', 'offline_access', 'uma_authorization'];
        const nomes = Array.isArray(papeis) ? papeis.map((p) => p.name).sort() : null;
        const igual = Array.isArray(nomes) && nomes.length === esperados.length && nomes.every((n, i) => n === esperados[i]);
        process.stdout.write(igual ? 'sim' : 'nao');
      });
    ")"

    if [ "$papeis_realm_esperados_ok" != "sim" ]; then
      falhar "usuário de prova criado pela conta de serviço herdou papéis de realm além do esperado (default-roles-cdd, offline_access, uma_authorization): ${papeis_realm_prova}"
    else
      echo "    OK (usuário de prova só com os papéis de realm padrão)"
    fi

    curl -s --max-time 20 -o /dev/null -X DELETE -H "Authorization: Bearer ${access_token_cdd_api_admin}" \
      "${url_base}/admin/realms/cdd/users/${id_prova}"
  fi
fi

if [ "$falhou" != "0" ]; then
  exit 1
fi

echo "==> fumaça do Keycloak: todas as checagens passaram"
