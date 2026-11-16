# webBudget

O webBudget é uma aplicação para controle de finanças pessoais: carteiras, cartões, centros de custo, classificações, períodos financeiros e os movimentos do dia a dia, com usuários e permissões por área.

## Estrutura

Este repositório é um monorepo com dois projetos construídos de forma independente:

| Pasta | O que é | Stack |
|---|---|---|
| [`server/`](server) | API | Kotlin, Spring Boot 4, jOOQ, Liquibase, PostgreSQL |
| [`client/`](client) | Interface web | Vue 3, TypeScript, Pinia, shadcn-vue |

## Pré-requisitos

- JDK 25
- Docker, para o PostgreSQL de desenvolvimento
- Node 24 e pnpm (a versão está fixada no campo `packageManager` de `client/package.json`)

## Como rodar

Server, a partir de `server/`, com o Docker ligado. A aplicação sobe na porta 8085, e o PostgreSQL de `compose.yaml` sobe junto:

```bash
./gradlew bootRun
```

Client, a partir de `client/`. O Vite sobe na porta 8086 e encaminha as chamadas a `/private` para o server na 8085:

```bash
pnpm install
pnpm dev
```

Depois, abra `http://localhost:8086`.

## Planejamento

O andamento do trabalho está no [Project do webBudget](https://github.com/orgs/web-budget/projects/7).
