# webBudget: server

API do webBudget, em Kotlin, Spring Boot 4, jOOQ, Liquibase e PostgreSQL 18. As convenções de código e a arquitetura estão em [`CLAUDE.md`](CLAUDE.md).

## Pré-requisitos

- JDK 25
- Docker ligado: o `bootRun` sobe o PostgreSQL e o MailDev de `compose.yaml`, e a compilação e os testes usam o Testcontainers

## Desenvolvimento

```bash
./gradlew bootRun
```

A aplicação sobe na porta 8085 com o perfil `dev`. O PostgreSQL fica em `localhost:5433` (banco, usuário e senha `webbudget`, `sa_webbudget` e `sa_webbudget`), e o MailDev em `localhost:1025` (SMTP) e <http://localhost:1080> (caixa de entrada). No primeiro acesso, o usuário `admin@webbudget.com.br` é criado com uma senha aleatória, que aparece no log.

No Windows, use `gradlew.bat` no lugar de `./gradlew`.

As classes do jOOQ são geradas a cada mudança nos changelogs do Liquibase (`src/main/resources/db/changelog`), dentro da própria compilação, a partir de um PostgreSQL descartável.

## Testes

```bash
./gradlew test
```

## Cobertura

```bash
./gradlew koverHtmlReport koverVerify
```

O relatório fica em `build/reports/kover/html/index.html`. O `koverVerify` falha se a cobertura ficar abaixo do mínimo configurado em `build.gradle.kts` (hoje, 99% de linhas e de instruções e 91% de ramos), e é o que o CI executa.

## Gerar o JAR

```bash
./gradlew bootJar
```

O JAR fica em `build/libs/`. Para rodá-lo, com as variáveis de ambiente, veja [Compilar a partir do código-fonte](../docs/compilar-do-codigo-fonte.md).
