#!/usr/bin/env bash
# Carrega o cadastro inicial (centros de custo e classificações) no banco do webBudget.
#
# Pré-requisitos: o Postgres do server/compose.yaml precisa estar no ar e o server precisa ter
# terminado as migrações do Liquibase e criado o admin (admin@webbudget.com.br). Este script NÃO é
# idempotente: rodar de novo falha no nome das classificações e, como a carga é uma transação só, não grava nada.
#
# Uso: ./load-sample-data.sh [--container NOME] [--db NOME] [--user NOME]
#   --container (padrão webbudget-postgres): nome do container do Postgres, o mesmo do server/compose.yaml.
#   --db (padrão webbudget): banco que recebe os dados.
#   --user (padrão sa_webbudget): usuário do Postgres.
#   Todos os parâmetros são opcionais e em qualquer ordem; sobrescreva só o que precisar.
set -euo pipefail

cd "$(dirname "$0")"

CONTAINER="webbudget-postgres"
DB_NAME="webbudget"
DB_USER="sa_webbudget"

while [ $# -gt 0 ]; do
    case "$1" in
        --container) CONTAINER="${2:?--container exige um valor}"; shift 2 ;;
        --db) DB_NAME="${2:?--db exige um valor}"; shift 2 ;;
        --user) DB_USER="${2:?--user exige um valor}"; shift 2 ;;
        *) echo "ERRO: argumento desconhecido: $1" >&2; exit 1 ;;
    esac
done

SQL_FILE="sample-data.sql"

if [ ! -f "${SQL_FILE}" ]; then
    echo "ERRO: ${SQL_FILE} não encontrado." >&2
    exit 1
fi

# Guarda: o admin precisa existir (o server o cria na primeira subida, depois das migrações).
echo "==> Verificando se o server já migrou (admin presente)..."
has_user="$(docker exec "${CONTAINER}" \
    psql -U "${DB_USER}" -d "${DB_NAME}" -tAc \
    "SELECT 1 FROM administration.users WHERE email = 'admin@webbudget.com.br'" 2>/dev/null || true)"

if [ "${has_user}" != "1" ]; then
    echo "ERRO: admin@webbudget.com.br não encontrado. Suba o server e espere as migrações" >&2
    echo "      terminarem antes de carregar os dados." >&2
    exit 1
fi

echo "==> Carregando o cadastro inicial (NÃO é idempotente)..."
docker exec -i "${CONTAINER}" psql -U "${DB_USER}" -d "${DB_NAME}" -v ON_ERROR_STOP=1 < "${SQL_FILE}"

echo
echo "Cadastro inicial carregado."
