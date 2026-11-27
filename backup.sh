#!/usr/bin/env bash
# Faz o backup do banco do webBudget.
# Roda o pg_dump DENTRO do container do Postgres em execução e depois copia o arquivo .sql para o host.
#
# Uso: ./backup.sh [--full|--data-only] [nome-do-container]
#   --data-only (padrão): grava só os dados das tabelas. É o caso comum dos backups de rotina, já que o
#     Liquibase cria e migra o schema na próxima subida. Um dump só de dados é restaurado num banco já migrado.
#   --full: grava schema e dados, para um backup completo de recuperação de desastre.
#   O container tem como padrão webbudget-postgres, o nome que o compose.yaml e o build-from-source/compose.yaml
#   dão ao Postgres. Informe outro nome se o Postgres roda sob outro container (ou sem Compose: o script só
#   precisa do container em execução).
#   DB_NAME e DB_USER (padrão webbudget e sa_webbudget) vêm do ambiente.
# Saída: backups/webbudget-backup-AAAAMMDD-HHMMSS.sql
set -euo pipefail

cd "$(dirname "$0")"

MODE="--data-only"
CONTAINER="webbudget-postgres"

for arg in "$@"; do
    case "${arg}" in
        --full) MODE="--full" ;;
        --data-only) MODE="--data-only" ;;
        *) CONTAINER="${arg}" ;;
    esac
done

export MSYS_NO_PATHCONV=1

DB_NAME="${DB_NAME:-webbudget}"
DB_USER="${DB_USER:-sa_webbudget}"

timestamp="$(date +%Y%m%d-%H%M%S)"
filename="webbudget-backup-${timestamp}.sql"
container_path="/tmp/${filename}"

mkdir -p backups

PG_DUMP_ARGS=()
if [ "${MODE}" = "--data-only" ]; then
    PG_DUMP_ARGS+=(--data-only)
fi

echo "==> Gravando o banco '${DB_NAME}' dentro do container '${CONTAINER}' (${MODE})..."
docker exec "${CONTAINER}" pg_dump -U "${DB_USER}" -d "${DB_NAME}" "${PG_DUMP_ARGS[@]}" -f "${container_path}"

echo "==> Copiando o backup para o host..."
docker cp "${CONTAINER}:${container_path}" "backups/${filename}"

echo "==> Apagando o arquivo temporário dentro do container..."
docker exec "${CONTAINER}" rm -f "${container_path}"

echo
echo "Backup salvo em: backups/${filename}"
