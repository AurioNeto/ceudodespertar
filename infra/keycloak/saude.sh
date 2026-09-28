#!/usr/bin/env bash
set -euo pipefail

# A imagem do Keycloak não tem curl/wget; /dev/tcp (builtin do bash) monta a
# requisição HTTP à mão contra a porta de gestão (9000), que não é publicada
# no host — só o healthcheck do próprio container fala com ela.

exec 3<>/dev/tcp/127.0.0.1/9000
printf 'GET /health/ready HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n' >&3
resposta="$(timeout 5 cat <&3)"
echo "$resposta" | grep -q '^HTTP/1.1 200'
