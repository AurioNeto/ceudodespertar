#!/usr/bin/env bash
set -euo pipefail

[[ "$EUID" -eq 0 ]] || { echo 'Execute como root via sudo.' >&2; exit 1; }
pacote="${1:?informe o pacote da API}"
ambiente="${2:?informe o arquivo de ambiente da API}"
versao="${3:?informe o identificador da versão}"
[[ "$versao" =~ ^[a-zA-Z0-9._-]+$ ]] || { echo 'Identificador de versão inválido.' >&2; exit 1; }
[[ "$(uname -m)" = x86_64 ]] || { echo 'Este instalador atende a Micro AMD64.' >&2; exit 1; }
test -f "$pacote"
test -f "$ambiente"
diretorio="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
node_versao=24.22.3
node_arquivo="node-v${node_versao}-linux-x64.tar.xz"
temporario="$(mktemp -d)"
trap 'rm -rf "$temporario"' EXIT

install -d -m 755 /opt/cdd/node /opt/cdd/api/releases
if [[ ! -x "/opt/cdd/node/$node_versao/bin/node" ]]; then
  curl --fail --silent --show-error --location "https://nodejs.org/dist/v${node_versao}/$node_arquivo" -o "$temporario/$node_arquivo"
  curl --fail --silent --show-error --location "https://nodejs.org/dist/v${node_versao}/SHASUMS256.txt" -o "$temporario/SHASUMS256.txt"
  (cd "$temporario" && awk -v arquivo="$node_arquivo" '$2 == arquivo' SHASUMS256.txt | sha256sum --check --status --strict)
  install -d -m 755 "/opt/cdd/node/$node_versao"
  tar -xJf "$temporario/$node_arquivo" -C "/opt/cdd/node/$node_versao" --strip-components=1
fi
ln -sfn "$node_versao" /opt/cdd/node/current
if ! id cdd-api >/dev/null 2>&1; then
  useradd --system --home /opt/cdd/api --shell /usr/sbin/nologin cdd-api
fi

destino="/opt/cdd/api/releases/$versao"
[[ ! -e "$destino" ]] || { echo 'A versão já existe; escolha outro identificador.' >&2; exit 1; }
install -d -m 755 "$destino"
tar -xzf "$pacote" -C "$destino" --no-same-owner
test -f "$destino/dist/main.js"
chown -R root:root "$destino"
chmod -R go-w "$destino"
install -d -m 700 /etc/cdd
install -m 600 "$ambiente" /etc/cdd/api.env
ln -sfn "$destino" /opt/cdd/api/current
install -m 644 "$diretorio/cdd-api.service" /etc/systemd/system/cdd-api.service
systemctl daemon-reload
systemctl enable cdd-api
systemctl restart cdd-api

for tentativa in {1..30}; do
  if curl --fail --silent --max-time 12 http://127.0.0.1:3000/saude/pronta >/dev/null; then
    echo 'API instalada e pronta em 127.0.0.1:3000.'
    exit 0
  fi
  sleep 2
done
echo 'A API não ficou pronta. Consulte journalctl -u cdd-api.' >&2
exit 1
