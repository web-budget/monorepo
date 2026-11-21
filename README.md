# webBudget

O webBudget é um sistema livre e de código aberto para controle de finanças pessoais: carteiras, cartões, centros de custo, classificações, períodos financeiros e os movimentos do dia a dia, com usuários e permissões por área. Mais informações em <https://webbudget.com.br/>.

> A versão 4 está em desenvolvimento e ainda em fase `alpha`. As versões `alpha` **não geram release nem imagem Docker**: quem quiser experimentá-las compila o código, como descrito em [Compilar a partir do código-fonte](https://github.com/web-budget/monorepo/wiki/Compilar-do-codigo-fonte). A última versão estável é a 3, em [arthurgregorio/web-budget](https://github.com/arthurgregorio/web-budget).

## Estrutura

Este repositório é um monorepo com dois projetos construídos de forma independente:

| Pasta | O que é | Stack |
|---|---|---|
| [`server/`](server) | API | Kotlin, Spring Boot 4, jOOQ, Liquibase, PostgreSQL 18 |
| [`client/`](client) | Interface web | Vue 3, TypeScript, Pinia, shadcn-vue |

## Como rodar em desenvolvimento

É preciso ter JDK 25, Docker, Node 24 e pnpm (a versão está fixada em `client/package.json`).

Server, a partir de `server/`, com o Docker ligado (o PostgreSQL e o MailDev de `compose.yaml` sobem junto, e a aplicação, na porta 8085):

```bash
./gradlew bootRun
```

Client, a partir de `client/` (o Vite sobe na porta 8086 e encaminha `/private` para o server):

```bash
pnpm install
pnpm dev
```

Depois, abra `http://localhost:8086`. Testes, cobertura e demais comandos estão na [wiki](https://github.com/web-budget/monorepo/wiki).

## Documentação

A documentação do projeto fica na [wiki](https://github.com/web-budget/monorepo/wiki):

- [Compilar a partir do código-fonte](https://github.com/web-budget/monorepo/wiki/Compilar-do-codigo-fonte)
- [Desenvolvimento do server](https://github.com/web-budget/monorepo/wiki/Desenvolvimento-do-server)
- [Desenvolvimento do client](https://github.com/web-budget/monorepo/wiki/Desenvolvimento-do-client)

Para quem desenvolve, as convenções de código e a arquitetura estão nos `CLAUDE.md` de cada camada: [raiz](CLAUDE.md), [server](server/CLAUDE.md) e [client](client/CLAUDE.md).

## Planejamento

O andamento do trabalho está no [Project do webBudget](https://github.com/orgs/web-budget/projects/7), e o que entra em cada versão, nos [milestones](https://github.com/web-budget/monorepo/milestones).

## Contato

Quer contribuir ou tirar uma dúvida? Escreva para contato@consusoft.com.br.

## Licença

Distribuído sob a [Licença Apache 2.0](LICENSE).
