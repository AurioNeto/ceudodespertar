#!/usr/bin/env bash
set -euo pipefail

raiz="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
destino="${1:?informe o caminho absoluto do arquivo .tar.gz de saída}"
[[ "$destino" = /* && ! -e "$destino" ]] || { echo 'Destino precisa ser absoluto e não pode existir.' >&2; exit 1; }
temporario="$(mktemp -d)"
trap 'rm -rf "$temporario"' EXIT
cd "$raiz"
pnpm_executavel="${PNPM_BIN:-pnpm}"
"$pnpm_executavel" --filter '@cdd/api...' --recursive build
"$pnpm_executavel" --filter @cdd/api deploy --prod --legacy "$temporario/api"
test -f "$temporario/api/dist/main.js"
test -f "$temporario/api/node_modules/@cdd/contracts/dist/index.js"
COPYFILE_DISABLE=1 tar --no-xattrs -czf "$destino" -C "$temporario/api" .
echo "Pacote da API preparado: $destino"
