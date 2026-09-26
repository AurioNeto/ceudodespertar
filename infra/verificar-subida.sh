#!/usr/bin/env bash
set -euo pipefail

# 'docker compose up -d --wait' já bloqueia até os serviços ficarem prontos,
# mas medi (mutante com storage-bucket saindo com 'exit 7', e repetição do
# caminho feliz) que o próprio código de saída dele é inconsistente para o
# serviço de execução única: no mesmo estado final (bucket criado, exit 0),
# às vezes ele retorna 0 e às vezes 1. Por isso este script não confia nesse
# código de saída — ele confere de novo, direto no estado real dos
# containers, e é o único responsável por decidir se 'infra:subir' passou.

servicos_de_execucao_unica="storage-bucket"

eh_execucao_unica() {
  local servico="$1" alvo
  for alvo in $servicos_de_execucao_unica; do
    [ "$servico" = "$alvo" ] && return 0
  done
  return 1
}

falhou=0

estado_dos_containers="$(docker compose ps -a --format '{{.Service}}|{{.State}}|{{.Health}}|{{.ExitCode}}')"

# O laço abaixo só enxerga containers que existem; um 'up' que falhou antes de
# criá-los devolveria lista vazia e passaria. Cada serviço declarado precisa
# aparecer no estado real.
for esperado in $(docker compose config --services); do
  if ! printf '%s\n' "$estado_dos_containers" | grep -q "^${esperado}|"; then
    echo "FALHA: '${esperado}' não foi criado" >&2
    falhou=1
  fi
done

while IFS='|' read -r servico estado saude codigo; do
  [ -z "$servico" ] && continue

  if eh_execucao_unica "$servico"; then
    if [ "$estado" = "exited" ] && [ "$codigo" = "0" ]; then
      echo "==> ${servico}: execução única concluída (exit 0)"
    else
      echo "FALHA: '${servico}' deveria ter terminado com exit 0, está '${estado}' (código ${codigo:-?})" >&2
      falhou=1
    fi
    continue
  fi

  if [ "$estado" = "running" ] && { [ -z "$saude" ] || [ "$saude" = "healthy" ]; }; then
    echo "==> ${servico}: saudável"
  else
    echo "FALHA: '${servico}' não está saudável (estado '${estado}', saúde '${saude:-sem healthcheck}')" >&2
    falhou=1
  fi
done <<< "$estado_dos_containers"

if [ "$falhou" != "0" ]; then
  exit 1
fi

echo "==> infra:subir: todos os serviços confirmados"
