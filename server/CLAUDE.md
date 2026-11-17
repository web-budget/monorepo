# CLAUDE.md

Este arquivo orienta o Claude Code no `server/`, o backend do webBudget: Kotlin 2.4, Spring Boot 4.1, Java 25 e Gradle, com o código no pacote `br.com.webbudget.server`. As regras do repositório inteiro (issues, branches, PRs, idioma e comentários no código) estão no `CLAUDE.md` da raiz e valem aqui também.

## Comandos

Rode tudo a partir de `server/`:

```bash
./gradlew bootRun                                                         # sobe a aplicação na porta 8085
./gradlew build                                                           # compila, roda os testes e o koverVerify
./gradlew test                                                            # roda todos os testes
./gradlew test --tests "br.com.webbudget.server.ServerApplicationTests"   # roda uma classe de teste só
./gradlew koverXmlReport                                                  # roda os testes e grava build/reports/kover/report.xml
./gradlew koverHtmlReport                                                 # roda os testes e grava build/reports/kover/html
./gradlew koverVerify                                                     # roda os testes e falha se a cobertura ficar abaixo de um piso
```

O `spring-boot-docker-compose` é uma dependência `developmentOnly` ligada ao `compose.yaml`, então o `bootRun` sobe sozinho o Postgres (`webbudget-postgres`, `postgres:18-alpine` na porta 5433, banco `webbudget`, usuário e senha `sa_webbudget`) e o Maildev (`webbudget-maildev`, SMTP na 1025 e interface em `http://localhost:1080`, usuário e senha `maildev`). Não é preciso rodar `docker compose up` à mão, mas o Docker precisa estar ligado. O Compose só entra no `bootRun`: os testes não usam o `compose.yaml` e sobem o próprio Postgres pelo Testcontainers (veja [Testes e cobertura](#testes-e-cobertura)).

O `application.yaml` lê a porta de `APPLICATION_PORT` (padrão `8085`) e o banco de `DATABASE_URL` (padrão `localhost:5433/webbudget`, sem o prefixo `jdbc:postgresql://`, que o próprio arquivo acrescenta), `DATABASE_USER` e `DATABASE_PASSWORD` (padrão `sa_webbudget`). O Actuator expõe só `health` e `info`, em modo `read_only`.

O Kover pendura o `koverVerify` no `check`, então o `build` já falha quando a cobertura fica abaixo de um piso. O CI roda `./gradlew koverXmlReport koverVerify` no job `test-server`; antes de abrir um PR que mexe no `server/`, rode o mesmo comando localmente.

**Nunca use a porta 8085 para verificar algo**: ela é do servidor de desenvolvimento do usuário (regra do `CLAUDE.md` da raiz). Suba uma instância descartável em outra porta com `./gradlew bootRun --args='--server.port=18085'`. Ao terminar, mate a JVM da aplicação pelo PID (parar a tarefa do Gradle deixa o processo escutando na porta) e, se os contêineres `webbudget-postgres` e `webbudget-maildev` não estavam rodando antes, derrube-os com `docker compose down`. Contêineres que já estavam de pé são do usuário e continuam de pé.

## Stack

- Kotlin 2.4.10 (`jvm` e `plugin.spring`) com `jvmTarget` 25, `languageVersion` e `apiVersion` 2.4 e os argumentos `-Xjsr305=strict` e `-Xemit-jvm-type-annotations`. O toolchain Java é o 25 e o Gradle vem do wrapper.
- Spring Boot 4.1.2 com os starters `webmvc` (servlet, não WebFlux), `jooq`, `liquibase`, `security`, `validation` e `actuator`. As threads virtuais estão ligadas.
- PostgreSQL 18 (`postgres:18-alpine`), tanto no `compose.yaml` quanto no Testcontainers.
- Jackson 3 (`tools.jackson.module:jackson-module-kotlin`) e `kotlin-reflect` para Jackson e Spring.
- `io.github.oshai:kotlin-logging-jvm` para log com `KotlinLogging.logger {}`.
- Kover 0.9.9 para cobertura.

## Convenções de código

**Nada de nomes abreviados.** Use nomes completos e descritivos em todo lugar: variáveis, parâmetros, iteradores de laço e aliases de tabela no SQL.

| Evite | Use |
|---|---|
| `val w = WALLETS.as("w")` | `val wallets = WALLETS.as("wallets")` |
| `val cc = COST_CENTERS.as("cc")` | `val costCenters = COST_CENTERS.as("cost_centers")` |
| `qty`, `pct`, `amt`, `cnt` | `quantity`, `percentage`, `amount`, `count` |
| `for (m in movements)` | `for (movement in movements)` |

A regra vale tanto para o nome da variável em Kotlin quanto para a string do alias passada ao `.as()`.

**Parâmetros de construtor nunca levam anotação na mesma linha.** `@Value(...)`, `@OnCreateValidation` ou qualquer outra anotação fica na linha de cima do `private val`/`val`. Parâmetros de função (não de construtor) podem manter a anotação na mesma linha, por exemplo `fun findById(@PathVariable id: UUID)`.

**`@Value` usa o prefixo de interpolação `$$` do Kotlin**, não o antigo escape `"\${...}"`: `@Value($$"${spring.application.name}")`.

**Controllers REST sempre retornam `ResponseEntity<T>`, nunca usam `@ResponseStatus`.** Use `ResponseEntity.ok(...)`, `.status(HttpStatus.CREATED).body(...)` ou `.noContent().build()` (tipado como `ResponseEntity<Void>` nas respostas sem corpo).

**`@RequestParam` e `@PathVariable` com um conjunto fixo de valores são tipados como o próprio enum, nunca como `String`.** O Spring converte a string crua para o enum (pelo nome da constante), então um valor inválido responde 400 antes de o método do controller rodar, sem validação manual.

**Toda classe `@Service` leva `@Transactional(readOnly = true)`**, e cada método de escrita acrescenta o seu próprio `@Transactional`.

**Instâncias de `KotlinLogging` se chamam `logger`, não `log`**: `private val logger = KotlinLogging.logger {}`. Cuidado: uma classe que estende um tipo base do Spring com um campo protegido `logger` ou `log` próprio (por exemplo `ResponseEntityExceptionHandler`) faz esse membro esconder a propriedade de arquivo de mesmo nome. As chamadas caem na sobrecarga errada e falham com um erro de compilação confuso, `Argument type mismatch: () -> String vs Throwable!`. Quando isso acontecer, qualifique a propriedade de arquivo por completo na chamada (`<pacote>.logger.error(exception) { }`).

**A ordem dos membros segue as convenções oficiais do Kotlin, com o `companion object` por último**: propriedades e blocos `init`, depois construtores secundários, depois métodos e por fim o `companion object`. Um tipo aninhado fica perto do código que o usa. Nenhum linter confere isso; a conferência é na revisão.

**Nem toda funcionalidade precisa de um `@Service`.** Se um método de controller só chamaria um método de repositório e devolveria o resultado sem mudança, dispense o serviço e faça o controller chamar o repositório direto. Só crie um `@Service` quando houver trabalho de verdade entre o repositório e a resposta: transformar o resultado, regras de negócio (validadores, orquestração de vários passos, efeitos colaterais) ou chamadas a outros serviços. Um serviço que só repassa a chamada para o repositório é uma camada que não acrescenta nada.

## Arquitetura

Hoje o `server/` tem só o `ServerApplication.kt`, o bootstrap `@SpringBootApplication`. O código portado da v4 entra na estrutura em três camadas dela, agora sob `br.com.webbudget.server`:

| Pacote | O que fica nele |
|---|---|
| `application/` | Controllers, payloads (requisição e resposta) e mappers. Nenhuma regra de negócio. |
| `domain/` | Serviços, entidades, validadores, exceções e e-mails (`mail/`). Todas as regras de negócio. |
| `infrastructure/` | Configuração do Spring (`config/`), repositórios (`repositories/`) e utilitários (`utilities/`). Usada pelas outras duas camadas. |

Dentro de cada camada, o código se divide pelas áreas da v4, que são também os schemas do banco: `administration`, `registration` e `financial` (por exemplo `application/controllers/registration`, `domain/services/financial`, `infrastructure/repositories/administration`). Não existem pacotes planos por funcionalidade: todo código novo entra numa das três camadas.

### Validadores

As regras de negócio que precisam ser conferidas antes de gravar seguem o padrão de validadores da v4, em `domain/validators/`:

- `BusinessValidator<T>` é uma `fun interface` com um único `fun validate(value: T)`, que lança uma exceção de domínio quando a regra é violada.
- Cada entidade tem a sua interface, por exemplo `interface WalletValidator : BusinessValidator<Wallet>`, e cada regra é um `@Component` que a implementa.
- As anotações `@OnCreateValidation`, `@OnUpdateValidation` e `@OnDeleteValidation` são `@Qualifier`s. Cada validador declara em quais operações roda, com uma ou mais delas na classe.
- O serviço recebe as listas pelo construtor e roda a lista certa antes de cada gravação:

```kotlin
@Service
@Transactional(readOnly = true)
class WalletService(
    private val walletRepository: WalletRepository,
    @OnCreateValidation
    private val creationValidators: List<WalletValidator>,
    @OnUpdateValidation
    private val updateValidators: List<WalletValidator>
) {

    @Transactional
    fun create(wallet: Wallet): UUID {
        creationValidators.forEach { it.validate(wallet) }
        ...
    }
}
```

Uma regra nova é um validador novo com a anotação certa, não um `if` a mais no serviço.

## Portabilidade da v4

O código de origem fica em `D:/desenvolvimento/web-budget/back-end`, o clone do repositório arquivado `web-budget/back-end`. Ele é só referência: leia-o para portar as regras de negócio e os payloads, mas nunca o altere.

O port mantém as regras de negócio e os payloads da v4. O que muda:

- Nada é portado com JPA: entidades JPA, `Specification`s e repositórios do Spring Data dão lugar ao jOOQ.
- Nada é portado com MockK: os testes são de integração contra um Postgres real (veja [Testes e cobertura](#testes-e-cobertura)).
- Nada é portado com JWT nem com CORS: a autenticação é por sessão no servidor, e o client fala com o server pelo proxy do Vite, na mesma origem.
- As rotas saem de `/api/...`, `/auth` e `/accounts` para `/private/v1/...`, e os erros respondem como `ProblemDetail`.
- O módulo de investimentos não é portado, e a role `INVESTMENTS` não existe.
- O build não tem Detekt.

## Acesso a dados

Os dados são compartilhados entre todos os usuários: quem pode ver ou mudar o quê é decidido só pelas roles, uma por área (`ADMINISTRATION`, `REGISTRATION`, `FINANCIAL` e `DASHBOARDS`). As consultas não filtram por usuário, e as tabelas de negócio não têm dono.

## Migrations

O Liquibase cria e evolui o schema na subida da aplicação (no `bootRun` e nos testes). O master é `src/main/resources/db/changelog/db.changelog-master.xml`, e as tabelas de controle se chamam `database_changelog` e `database_changelog_lock`. Os schemas `administration`, `registration` e `financial` já existem, criados por `changes/2026/11/16-1000-create-schemas.xml`.

**Nunca edite um changelog já integrado** em `src/main/resources/db/changelog/changes/**`, nem para acrescentar "só mais um changeset" a um arquivo recente. O Liquibase registra cada changeset aplicado por id, autor e checksum em `database_changelog`; editar um que já rodou quebra a subida (checksum diferente) ou pula o SQL novo em silêncio. Sempre crie um arquivo novo e inclua-o no master:

- O arquivo fica em `db/changelog/changes/<ano>/<mês>/<DD-HHMM>-<descrição>.xml`.
- O `<include>` vai no fim do master, com `relativeToChangelogFile="false"`, como o que já está lá.
- Os ids dos changesets são `<DD-HHMM>-<n>`, numerados a partir de 1 dentro do arquivo.
- Changesets escritos pelo Claude usam `author="${claude}"`, a propriedade definida no master.
- Cada changeset traz o seu `<rollback>`.

## Testes e cobertura

- JUnit 5 com `kotlin-test-junit5`, `useJUnitPlatform()` e `maxParallelForks = 4`. O número de forks é limitado para evitar disputa no Docker quando vários forks sobem um contêiner do Testcontainers ao mesmo tempo.
- `TestcontainersConfiguration` registra um Postgres `postgres:18-alpine` como `@ServiceConnection`, e os testes `@SpringBootTest` o importam com `@Import(TestcontainersConfiguration::class)`, como faz `ServerApplicationTests`. O Docker precisa estar ligado para rodar os testes.
- Os testes de integração rodam contra esse Postgres real, sem MockK nem outro framework de mock de objetos.
- `TestServerApplication` é um `main` alternativo que sobe a aplicação com o `TestcontainersConfiguration`, contra um Postgres descartável.

O Kover mede a suíte, e o `koverVerify` impõe pisos sobre ela em `kover.reports.verify`, no `build.gradle.kts`. Os filtros excluem só `ServerApplication` e `ServerApplicationKt`, e valem igual para os relatórios XML e HTML e para o `koverVerify`.

**Os pisos de LINE, INSTRUCTION e BRANCH começam em 0 e só sobem.** Eles sobem ao fim de cada subtarefa de portabilidade, até o que a suíte atinge naquele momento. Um PR pode subir um número, nunca baixá-lo: baixar um piso é a cara de uma regressão de cobertura num diff. Com os pisos no que a suíte atinge, um PR que traz código de produção sem teste fica vermelho, então os testes entram junto com a funcionalidade.

## Manutenção deste arquivo

Todo PR que muda algo descrito aqui atualiza este arquivo no mesmo PR. As tarefas #9, #12 e #25 acrescentam as seções de persistência (jOOQ), de testes e de autenticação, quando o código delas existir.
