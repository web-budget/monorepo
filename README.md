# webBudget

O webBudget é um sistema livre e de código aberto para controle de finanças pessoais: carteiras, cartões, centros de custo, classificações, períodos financeiros e os movimentos do dia a dia, com usuários e permissões por área. Mais informações em <https://webbudget.com.br/>.

> A versão 4 está em desenvolvimento e ainda em fase `alpha`. As versões `alpha` **não geram release nem imagem Docker**: quem quiser experimentá-las compila o código, como descrito em [Compilar a partir do código-fonte](docs/compilar-do-codigo-fonte.md). A última versão estável é a 3, em [arthurgregorio/web-budget](https://github.com/arthurgregorio/web-budget).

## Estrutura

Este repositório é um monorepo com dois projetos construídos de forma independente:

| Pasta | O que é | Stack |
|---|---|---|
| [`server/`](server) | API | Kotlin, Spring Boot 4, jOOQ, Liquibase, PostgreSQL 18 |
| [`client/`](client) | Interface web | Vue 3, TypeScript, Pinia, shadcn-vue |

## Pré-requisitos

- JDK 25
- Docker, para o PostgreSQL de desenvolvimento e para os testes do server
- Node 24 e pnpm (a versão está fixada no campo `packageManager` de `client/package.json`)

## Como rodar

Server, a partir de `server/`, com o Docker ligado. A aplicação sobe na porta 8085, e o PostgreSQL e o MailDev de `compose.yaml` sobem junto:

```bash
./gradlew bootRun
```

Client, a partir de `client/`. O Vite sobe na porta 8086 e encaminha as chamadas a `/private` para o server na 8085:

```bash
pnpm install
pnpm dev
```

Depois, abra `http://localhost:8086`.

## Como rodar os testes

Server, a partir de `server/`, com o Docker ligado (os testes de integração sobem um PostgreSQL com Testcontainers):

```bash
./gradlew test
```

Client, a partir de `client/`:

```bash
pnpm test:run
```

A cobertura é cobrada nos dois lados. Os comandos dela e os detalhes estão em [`server/README.md`](server/README.md) e [`client/README.md`](client/README.md).

## Compilar a partir do código-fonte

O passo a passo para gerar o JAR do server e os arquivos estáticos do client, com o banco e as variáveis de ambiente, está em [`docs/compilar-do-codigo-fonte.md`](docs/compilar-do-codigo-fonte.md).

## Para quem desenvolve

Cada camada tem um `CLAUDE.md` com as convenções de código, a arquitetura e os comandos dela, e o da raiz traz as regras do repositório inteiro (issues, branches e PRs):

- [`CLAUDE.md`](CLAUDE.md)
- [`server/CLAUDE.md`](server/CLAUDE.md)
- [`client/CLAUDE.md`](client/CLAUDE.md)

## Planejamento

O andamento do trabalho está no [Project do webBudget](https://github.com/orgs/web-budget/projects/7), e o que entra em cada versão, nos [milestones](https://github.com/web-budget/monorepo/milestones).

## Contato

Quer contribuir ou tirar uma dúvida? Escreva para contato@consusoft.com.br.

## Licença

Distribuído sob a [Licença Apache 2.0](LICENSE).
