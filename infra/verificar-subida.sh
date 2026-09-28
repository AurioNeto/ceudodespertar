#!/usr/bin/env bash
set -euo pipefail

# 'docker compose up -d' inicia os containers respeitando 'depends_on'
# (o one-shot só começa quando a dependência de saúde está satisfeita), mas
# nem o código de saída dele nem o de '--wait' são a fonte da verdade: medi
# (mutante com storage-bucket saindo com 'exit 7', e repetição do caminho
# feliz) que o código de saída de '--wait' é inconsistente para o serviço de
# execução única — no mesmo estado final (bucket criado, exit 0), às vezes
# ele retorna 0 e às vezes 1. Por isso 'infra:subir' não usa '--wait' nem
# confia em código de saída do 'up': este script confere de novo, direto no
# estado real dos containers, e é o único responsável por decidir se
# 'infra:subir' passou.

servicos_de_execucao_unica="storage-bucket"

eh_execucao_unica() {
  local servico="$1" alvo
  for alvo in $servicos_de_execucao_unica; do
    [ "$servico" = "$alvo" ] && return 0
  done
  return 1
}

falhou=0

# O laço abaixo só enxerga containers que existem; um 'up' que falhou antes de
# criá-los devolveria lista vazia e passaria. Cada serviço declarado precisa
# aparecer no estado real.
estado_dos_containers="$(docker compose ps -a --format '{{.Service}}|{{.State}}|{{.Health}}|{{.ExitCode}}')"

for esperado in $(docker compose config --services); do
  if ! printf '%s\n' "$estado_dos_containers" | grep -q "^${esperado}|"; then
    echo "FALHA: '${esperado}' não foi criado" >&2
    falhou=1
  fi
done

# Um 'up' que falha ao trocar de imagem (ex.: tag inexistente) não recria o
# container antigo — ele continua rodando e saudável, só que com a config
# anterior. Sem esta checagem, o laço de estado abaixo aprova esse container
# porque só olha 'running'/'healthy', nunca se ele é o que o compose.yaml
# atual pede. Confirmado ao vivo (mailpit com tag inexistente: 'up' saiu com
# erro, o container antigo seguiu saudável, e sem esta comparação o script
# aprovava mesmo assim).
confere_hash_atualizado() {
  local servico="$1" id_container hash_config hash_container

  id_container="$(docker compose ps -a -q "$servico" 2>/dev/null || true)"
  [ -z "$id_container" ] && return 0 # ausência já foi reportada acima

  hash_config="$(docker compose config --hash "$servico" | awk '{print $2}')"
  hash_container="$(docker inspect -f '{{ index .Config.Labels "com.docker.compose.config-hash" }}' "$id_container" 2>/dev/null || true)"

  if [ -z "$hash_config" ] || [ "$hash_config" != "$hash_container" ]; then
    echo "FALHA: '${servico}' está rodando com uma config antiga — o 'up' não conseguiu recriá-lo (imagem ou config divergente do compose.yaml atual)" >&2
    falhou=1
  fi
}

for servico in $(docker compose config --services); do
  confere_hash_atualizado "$servico"
done

# Sem '--wait', 'up -d' devolve o controle assim que os containers são
# criados/iniciados — não espera o healthcheck fechar nem o one-shot
# terminar. E depois de um restart manual (fora de 'infra:subir'), um
# serviço saudável pode estar em 'starting' no instante exato da checagem.
# Nenhum dos dois casos é falha — é a janela normal de subida. Espera
# limitada por serviço, com estouro tratado como falha de verdade.
tentativas_max=60
intervalo_segundos=2

espera_execucao_unica_terminar() {
  local servico="$1" tentativa=0 estado codigo

  while :; do
    IFS='|' read -r estado codigo <<< "$(docker compose ps -a --format '{{.State}}|{{.ExitCode}}' "$servico")"

    if [ "$estado" = "exited" ] && [ "$codigo" = "0" ]; then
      echo "==> ${servico}: execução única concluída (exit 0)"
      return 0
    fi

    if [ "$estado" != "running" ] || [ "$tentativa" -ge "$tentativas_max" ]; then
      echo "FALHA: '${servico}' deveria ter terminado com exit 0, está '${estado}' (código ${codigo:-?})" >&2
      falhou=1
      return 1
    fi

    tentativa=$((tentativa + 1))
    sleep "$intervalo_segundos"
  done
}

espera_ficar_saudavel() {
  local servico="$1" tentativa=0 estado saude

  while :; do
    IFS='|' read -r estado saude <<< "$(docker compose ps -a --format '{{.State}}|{{.Health}}' "$servico")"

    if [ "$estado" = "running" ] && { [ -z "$saude" ] || [ "$saude" = "healthy" ]; }; then
      echo "==> ${servico}: saudável"
      return 0
    fi

    if [ "$saude" != "starting" ] || [ "$tentativa" -ge "$tentativas_max" ]; then
      echo "FALHA: '${servico}' não está saudável (estado '${estado}', saúde '${saude:-sem healthcheck}')" >&2
      falhou=1
      return 1
    fi

    tentativa=$((tentativa + 1))
    sleep "$intervalo_segundos"
  done
}

for servico in $(docker compose config --services); do
  if ! printf '%s\n' "$estado_dos_containers" | grep -q "^${servico}|"; then
    continue # ausência já foi reportada acima
  fi

  if eh_execucao_unica "$servico"; then
    espera_execucao_unica_terminar "$servico" || true
  else
    espera_ficar_saudavel "$servico" || true
  fi
done

if [ "$falhou" != "0" ]; then
  exit 1
fi

echo "==> infra:subir: todos os serviços confirmados"
