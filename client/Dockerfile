FROM node:24-alpine AS builder
WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

ARG VITE_APP_VERSION=dev
ENV VITE_APP_VERSION=$VITE_APP_VERSION
RUN pnpm build

FROM nginx:alpine AS runtime

ENV BACKEND_HOST=server
ENV BACKEND_PORT=8085

COPY nginx.conf.template /etc/nginx/templates/default.conf.template

COPY --from=builder /app/dist /usr/share/nginx/html

LABEL org.opencontainers.image.source="https://github.com/web-budget/monorepo"

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
