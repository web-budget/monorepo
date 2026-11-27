#!/usr/bin/env bash
# Constrói as duas imagens Docker do webBudget a partir do código-fonte:
#   - server: imagem Spring Boot por Cloud Native Buildpacks (via Gradle)
#   - client: SPA Vue servida pelo nginx (via docker build)
#
# Uso: ./build-from-source/build.sh (ou: cd build-from-source && ./build.sh)
set -euo pipefail

cd "$(dirname "$0")"

if [ -f .env ]; then
    set -a
    # shellcheck disable=SC1091
    . ./.env
    set +a
fi

SERVER_IMAGE_TAG="${SERVER_IMAGE_TAG:-latest}"
CLIENT_IMAGE_TAG="${CLIENT_IMAGE_TAG:-latest}"

echo "==> Construindo a imagem do server (Gradle bootBuildImage) -> webbudget/server:${SERVER_IMAGE_TAG}"
( cd ../server && ./gradlew bootBuildImage --imageName="webbudget/server:${SERVER_IMAGE_TAG}" )

echo "==> Construindo a imagem do client (docker build) -> webbudget/client:${CLIENT_IMAGE_TAG}"
docker build -t "webbudget/client:${CLIENT_IMAGE_TAG}" ../client

echo
echo "Pronto. Imagens:"
echo "  webbudget/server:${SERVER_IMAGE_TAG}"
echo "  webbudget/client:${CLIENT_IMAGE_TAG}"
echo
echo "Próximo passo: docker compose up -d   (a partir desta pasta, build-from-source/)"
