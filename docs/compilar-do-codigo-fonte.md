# Compilar a partir do código-fonte

As versões `alpha` do webBudget v4 **não geram release nem imagem Docker**. Quem quiser usá-las ou experimentá-las compila o código deste repositório, como descrito aqui. Este guia vale também para quem quer rodar uma versão própria, com as suas alterações.

## Pré-requisitos

| Ferramenta | Versão | Observação |
|---|---|---|
| Git | qualquer | para clonar o repositório |
| JDK | 25 | definido no `toolchain` de `server/build.gradle.kts` |
| Docker | recente | **também para compilar**: a geração das classes do jOOQ sobe um PostgreSQL descartável (Testcontainers) |
| Node | 24.15 ou mais novo | campo `engines` de `client/package.json` |
| pnpm | 12.21.0 | campo `packageManager` de `client/package.json` |

O Gradle não precisa ser instalado: o projeto traz o wrapper (`gradlew`, `gradlew.bat`), que baixa a versão certa (9.9.1) na primeira execução.

## 1. Baixar o código

```bash
git clone https://github.com/web-budget/monorepo.git
cd monorepo
```

Para uma versão específica, troque para a tag ou o branch desejado antes de compilar (`git checkout <tag>`).

## 2. Compilar o server

A partir de `server/`, com o Docker ligado:

```bash
cd server
./gradlew bootJar
```

No Windows, use `gradlew.bat bootJar`.

O resultado é um único JAR executável em `server/build/libs/server-0.0.1-SNAPSHOT.jar`. O número da versão vem do `build.gradle.kts` e não acompanha as tags do repositório.

## 3. Compilar o client

A partir de `client/`:

```bash
cd client
pnpm install --frozen-lockfile
pnpm build
```

O `pnpm build` confere os tipos (`vue-tsc`) e gera os arquivos estáticos em `client/dist/`. Para que a versão apareça na interface, informe-a na compilação, como faz o workflow de release:

```bash
VITE_APP_VERSION=v4.0.0-alpha2 pnpm build
```

Sem a variável, a interface mostra `dev`.

## 4. Preparar o banco e o e-mail

O server precisa de um **PostgreSQL 18** e de um servidor **SMTP** (para os e-mails de conta e de aviso de segurança). O esquema do banco é criado e atualizado sozinho pelo Liquibase na subida.

Para experimentar, o `server/compose.yaml` sobe os dois, com a configuração que o server já usa por padrão:

```bash
cd server
docker compose up -d
```

| Serviço | Endereço | Para quê |
|---|---|---|
| PostgreSQL 18 | `localhost:5433`, banco `webbudget`, usuário e senha `sa_webbudget` | dados |
| MailDev | SMTP em `localhost:1025`, caixa de entrada em <http://localhost:1080> | captura os e-mails enviados, sem entregá-los |

Em uso real, aponte o server para o seu próprio PostgreSQL e SMTP pelas variáveis da próxima seção.

## 5. Rodar o server

Com o banco no ar, a partir de `server/`:

```bash
ADMIN_DEFAULT_PASSWORD=troque-esta-senha \
TOTP_REQUIRED=false \
APPLICATION_FRONTEND_URL=http://localhost:4173 \
java -jar build/libs/server-0.0.1-SNAPSHOT.jar
```

O server escuta na porta 8085. Na primeira subida, ele cria o usuário `admin@webbudget.com.br`:

- com a senha de `ADMIN_DEFAULT_PASSWORD`, se a variável for informada;
- ou com uma senha aleatória, que aparece no log (`Initial password is ...`), se não for.

Troque a senha depois do primeiro acesso.

`TOTP_REQUIRED=false` dispensa a verificação em dois fatores, útil só para experimentar. Sem ela (o padrão é `true`), o primeiro acesso pede o cadastro de um aplicativo autenticador. `APPLICATION_FRONTEND_URL` é o endereço público do client, usado nos links dos e-mails.

### Variáveis de ambiente

As principais, com os padrões de `server/src/main/resources/application.yaml` (que lista todas):

| Variável | Padrão | O que faz |
|---|---|---|
| `DATABASE_URL` | `localhost:5433/webbudget` | `host:porta/banco` do PostgreSQL (sem o prefixo `jdbc:postgresql://`) |
| `DATABASE_USER` | `sa_webbudget` | usuário do banco |
| `DATABASE_PASSWORD` | `sa_webbudget` | senha do banco |
| `APPLICATION_PORT` | `8085` | porta do server |
| `APPLICATION_FRONTEND_URL` | `http://localhost:8086` | endereço do client, usado nos links dos e-mails |
| `MAIL_HOST` | `localhost` | servidor SMTP |
| `MAIL_PORT` | `1025` | porta do SMTP |
| `MAIL_USER` | `maildev` | usuário do SMTP |
| `MAIL_PASSWORD` | `maildev` | senha do SMTP |
| `MAIL_DEFAULT_FROM_ADDRESS` | `noreply@webbudget.com.br` | remetente dos e-mails |
| `MAIL_REPLY_TO_ADDRESS` | `noreply@webbudget.com.br` | endereço de resposta |
| `MAIL_TIME_ZONE` | `America/Sao_Paulo` | fuso horário usado nos e-mails |
| `ADMIN_DEFAULT_PASSWORD` | vazio (senha aleatória) | senha inicial do administrador |
| `TOTP_REQUIRED` | `true` | exige verificação em dois fatores |
| `GOOGLE_AUTH_ENABLED` | `false` | habilita o acesso com Google |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | vazios | credenciais do acesso com Google |

O perfil ativo vem de `SPRING_PROFILES_ACTIVE`. O `bootRun` usa o perfil `dev` (log detalhado e TOTP dispensado); com `java -jar`, nenhum perfil é ativado por padrão.

## 6. Servir o client

O client é um conjunto de arquivos estáticos que chama a API em `/private/v1`, **no mesmo endereço de onde foi carregado**. Por isso, quem serve o `dist/` precisa encaminhar `/private` para o server e devolver o `index.html` para as rotas da aplicação.

Para experimentar, o próprio Vite faz as duas coisas (o encaminhamento de `/private` para `localhost:8085` já está no `vite.config.ts`). A partir de `client/`:

```bash
pnpm preview
```

Abra <http://localhost:4173> e entre com `admin@webbudget.com.br` e a senha definida na etapa anterior.

Em um servidor de verdade, use o servidor web de sua preferência (nginx, Caddy, Apache) com o `dist/` como raiz, `/private` encaminhado para a porta do server e `index.html` como resposta das demais rotas. Ajuste `APPLICATION_FRONTEND_URL` para o endereço público.

## Conferir a compilação

Se quiser conferir que o código compilado está saudável, rode os testes antes de subir:

```bash
cd server && ./gradlew test      # precisa do Docker
cd client && pnpm test:run
```

Os detalhes de testes e cobertura estão em [`server/README.md`](../server/README.md) e [`client/README.md`](../client/README.md).
