# CLAUDE.md

Este arquivo orienta o Claude Code no `server/`, o backend do webBudget: Kotlin 2.4, Spring Boot 4.1, Java 25 e Gradle, com o código no pacote `br.com.webbudget.server`. As regras do repositório inteiro (issues, branches, PRs, idioma e comentários no código) estão no `CLAUDE.md` da raiz e valem aqui também.

## Comandos

Rode tudo a partir de `server/`:

```bash
./gradlew bootRun                                                         # sobe a aplicação na porta 8085
./gradlew build                                                           # gera as classes do jOOQ, compila, roda os testes e o koverVerify
./gradlew jooqCodegen                                                     # gera as classes do jOOQ a partir do changelog (precisa do Docker)
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

- Kotlin 2.4.21 (`jvm` e `plugin.spring`) com `jvmTarget` 25, `languageVersion` e `apiVersion` 2.4 e os argumentos `-Xjsr305=strict` e `-Xemit-jvm-type-annotations`. O toolchain Java é o 25 e o Gradle vem do wrapper.
- Spring Boot 4.1.2 com os starters `webmvc` (servlet, não WebFlux), `jooq`, `liquibase`, `security`, `validation`, `actuator`, `mail` e `thymeleaf` (só para os e-mails), mais `spring-data-commons` explícito para `Pageable` e `PagedModel`. As threads virtuais estão ligadas.
- PostgreSQL 18 (`postgres:18-alpine`), tanto no `compose.yaml` quanto no Testcontainers.
- jOOQ 3.21.7 com o plugin `org.jooq.jooq-codegen-gradle`, que gera as classes Kotlin das tabelas no build (veja [Codegen do jOOQ](#codegen-do-jooq)).
- Jackson 3 (`tools.jackson.module:jackson-module-kotlin`) e `kotlin-reflect` para Jackson e Spring.
- `io.github.oshai:kotlin-logging-jvm` para log com `KotlinLogging.logger {}`.
- Kover 0.9.9 para cobertura. Nos testes, GreenMail recebe os e-mails e o `RestTestClient` chama a API (veja [Testes e cobertura](#testes-e-cobertura)).

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

O código portado da v4 vive nas três camadas dela, sob `br.com.webbudget.server`. O módulo `administration` já está portado e é a referência dos padrões das seções abaixo:

| Pacote | O que fica nele |
|---|---|
| `application/` | Controllers, payloads (requisição e resposta) e mappers. Nenhuma regra de negócio. |
| `domain/` | Serviços, entidades, validadores, exceções e e-mails (`mail/`). Todas as regras de negócio. |
| `infrastructure/` | Configuração do Spring (`config/`), repositórios (`repository/`) e utilitários (`utilities/`). Usada pelas outras duas camadas. |

Dentro de cada camada, o código se divide pelas áreas da v4, que são também os schemas do banco: `administration`, `registration` e `financial` (por exemplo `application/controllers/registration`, `domain/services/financial`, `infrastructure/repository/administration`). Não existem pacotes planos por funcionalidade: todo código novo entra numa das três camadas.

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

### Persistência com jOOQ

Os repositórios são classes `@Repository` com o `DSLContext` injetado, em `infrastructure/repository/<módulo>/`, sobre as tabelas de `br.com.webbudget.server.jooq`. Não existe `JpaRepository`, `Specification` nem camada ORM. As regras:

- **Entidades são classes Kotlin simples** em `domain/entities/<módulo>/`, sem anotação de persistência e herdando de `PersistentEntity` (`id`, `externalId`, `version`, `createdOn`, `lastUpdate`). Não use `data class` em entidades que se referenciam (`toString` e `hashCode` recursivos). As relações são carregadas explicitamente pelo repositório: `User.grants` vem de `GrantRepository.findByUserIds`, uma consulta só para a página inteira, e nunca de um lazy-load.
- **Aliases com nome completo**, como no resto do código: `val users = USERS.as("users")` nas consultas. `INSERT`, `UPDATE` e `DELETE` usam a tabela sem alias.
- **Quem preenche os campos de controle é o repositório**: `externalId` (`UUID.randomUUID()`), `version = 0` e `createdOn` na inserção, `lastUpdate` e `version + 1` na atualização. O `INSERT ... RETURNING` e o `UPDATE ... RETURNING` devolvem a linha, e o repositório devolve a mesma entidade preenchida pelo `restore(...)`.
- **Controle otimista de `version` no `UPDATE`**: `UPDATE ... WHERE id = ? AND version = ?`. Nenhuma linha atualizada lança `concurrentUpdate()` (`OptimisticLocking.kt`), um `DomainException.conflict` com o erro `concurrent-update` e status 409. Todo `update` de repositório novo segue isso.
- **Os filtros que a v4 fazia com `Specification` viram `Condition` do jOOQ montado dentro do repositório**, a partir de parâmetros simples (`filter: String?`, `active: Boolean?`). O payload de filtro (`UserFilter`) não conhece jOOQ.
- **Exclusões que o JPA fazia em cascata são explícitas no serviço**: apagar um usuário apaga antes os grants e as tentativas de ativação e de recuperação.
- As consultas `existsBy...` do jOOQ (`dsl.fetchExists`) substituem os `findBy...` que os validadores usavam só para checar existência.

### Paginação

`infrastructure/repository/Paging.kt` concentra o padrão, e o `WebMvcConfiguration` liga o `@EnableSpringDataWebSupport` que resolve o `Pageable` dos controllers:

- `pagedModelOf(content, pageable, total)` devolve o `PagedModel<T>` que o repositório retorna. O JSON sai como `content` mais `page { size, number, totalElements, totalPages }`, o mesmo da v4.
- `PagedModel<T>.map { }` converte as entidades em views no controller, sem o repositório conhecer o payload.
- `Pageable.toOrderBy(sortable, tiebreaker)` traduz o `sort` da requisição para colunas conhecidas (um `Map<String, Field<*>>` por repositório) e sempre acrescenta um desempate por `id`, então a ordem é determinística. Propriedades de `sort` desconhecidas são ignoradas.
- A contagem é `dsl.fetchCount(tabela, condição)` com a mesma condição da página.

### Rotas, erros e segurança provisória

- **Todo `@RestController` sai sob `/private/{version}`**: o `WebMvcConfiguration` acrescenta o prefixo a todo controller (versionamento por segmento, `v1` como padrão). O `@RequestMapping` do controller leva só o caminho do módulo, por exemplo `@RequestMapping("/administration/users")`, que responde em `/private/v1/administration/users`. O `Location` de um `201` já sai com o prefixo.
- **Erros são `ProblemDetail` (RFC 7807)**, produzidos pelo `ExceptionHandlerAdvice` (uma subclasse de `ResponseEntityExceptionHandler`). O código de máquina fica na propriedade **`error`** (`field-validation-failed`, `resource-not-found`, `conflicting-properties`, `concurrent-update`, `invalid-token`, `bad-request`, `data-integrity-violation`, `internal-error`), e `parameters` leva os valores de contexto, por exemplo o mapa campo → código das violações de validação (`422`) ou a propriedade em conflito (`409`). A v4 chamava o campo de `code`; o client lê `error`.
- As exceções de domínio são `DomainException` (regra violada, `400` por padrão, `DomainException.conflict(...)` para `409`) e `ApplicationException` (`ResourceNotFoundException` é `404`). Os códigos de domínio ficam em `domain/exceptions/ErrorCodes.kt`, e os códigos das mensagens de validação de campo (`is-null-or-blank` e afins) em `application/payloads/ErrorCodes.kt`. `IllegalArgumentException`, violações de integridade e erros de acesso a dados respondem `400` genérico, e qualquer outra exceção `500` genérico: a mensagem real só vai para o log. Um `AccessDeniedException` é relançado para o Spring Security tratar.
- **Status herdados da v4, de propósito**: `DELETE` e `PATCH` sem corpo respondem `200` (`ResponseEntity<Void>`), não `204`; `POST` responde `201` com `Location`; validação de corpo responde `422`.
- **O `JacksonConfiguration` define a leitura dos payloads**: strings viram `null` quando vazias ou só com espaços (então `""` cai em `is-null-or-blank` e não em erro de formato), enum desconhecido vira `null`, propriedades desconhecidas são ignoradas e `null` não é serializado.
- **A segurança é provisória até a #26.** O `SecurityConfiguration` só traz as regras de caminho por role de área sob `/private/v1` (`/administration` para `ADMINISTRATION`, `/registration`, `/financial` e `/dashboards` para as outras), `/private/v1/accounts/**` e os endpoints `health` e `info` do Actuator públicos, o resto autenticado, o CSRF desligado e `401` para quem não está autenticado (`403` para quem está sem a role). Não há mecanismo de login, e o `UserDetailsService` é um `InMemoryUserDetailsManager` vazio só para o Spring Boot não gerar um usuário com senha aleatória. Não existe JWT, `httpBasic` nem CORS, e a #26 não os traz de volta. As roles são autoridades `ROLE_<NOME>`.
- **O admin inicial** (`admin@webbudget.com.br`, com todas as roles) é criado na subida pelo `AdminUserBootstrap` quando não existe, com uma senha aleatória que sai só no log.

### E-mails

Os e-mails do módulo (ativação de conta e recuperação de senha) saem pelo `MailSenderService`, que renderiza um template Thymeleaf de `src/main/resources/mail-templates/` (um por idioma, `<nome>-<en_US|pt_BR>.html`, escolhido pelo `defaultLanguage` do usuário) e envia pelo SMTP de `spring.mail.*` (o Maildev do `compose.yaml` no `bootRun`, interface em `http://localhost:1080`). Uma classe `MailTemplate` por e-mail, em `domain/mail/`, define o assunto e as variáveis. O envio é `@Async` (fora do perfil `test`, onde roda síncrono). As propriedades `web-budget.mail.*` e a `web-budget.frontend-url`, usada só para montar os links dos e-mails, vêm do `application.yaml`.

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

O Liquibase cria e evolui o schema na subida da aplicação (no `bootRun` e nos testes). O master é `src/main/resources/db/changelog/db.changelog-master.xml`, e as tabelas de controle se chamam `database_changelog` e `database_changelog_lock`. Os changelogs vivem em `src/main/resources/db/changelog/changes/<ano>/<mês>/`, e o master os inclui em ordem cronológica. O changelog inicial é o schema final da v4, consolidado sem Investimentos:

| Arquivo | O que cria |
|---|---|
| `changes/2026/11/16-1000-create-schemas.xml` | Os schemas `administration`, `registration` e `financial`. |
| `changes/2026/11/16-1010-create-administration-tables.xml` | A extensão `uuid-ossp` e as tabelas `users`, `roles`, `grants`, `password_recover_attempts` e `account_activation_attempt`. |
| `changes/2026/11/16-1020-create-registration-tables.xml` | As tabelas `cost_centers`, `wallets`, `cards`, `financial_periods` e `classifications`. |
| `changes/2026/11/16-1030-create-financial-tables.xml` | As tabelas `recurring_movements`, `credit_card_invoices`, `payments`, `transferences`, `period_movements` e `wallet_balances`. |
| `changes/2026/11/16-1040-insert-roles.xml` | As roles `DASHBOARDS`, `REGISTRATION`, `FINANCIAL` e `ADMINISTRATION`, com os mesmos `external_id` da v4. |

O DDL é SQL puro em `<sql>`, uma tabela por changeset, com cada constraint nomeada explicitamente. O `pg_dump --schema-only` desse schema é igual ao da v4, tirando o schema `investments`, inclusive nas esquisitices herdadas: a extensão `uuid-ossp` sem uso, o `UNIQUE (id)` redundante nas tabelas de `financial`, o `UNIQUE (id, external_id)` duplicado nas duas tabelas de tentativas, nomes de FK como `fk_wallets_on_payments` em `wallet_balances` e as colunas acrescentadas por último (`id_parent`, `full_name`, `id_cost_center`). Corrigir qualquer uma delas é mudança de modelo e entra num changelog novo. As constraints redundantes vão num `ALTER TABLE` depois do `CREATE TABLE`, porque o Postgres descarta em silêncio uma constraint declarada dentro do `CREATE TABLE` que repete outra. Os dados de teste não estão no changelog: cada subtarefa de portabilidade traz os do seu módulo.

**Nunca edite um changelog já integrado** em `src/main/resources/db/changelog/changes/**`, nem para acrescentar "só mais um changeset" a um arquivo recente. O Liquibase registra cada changeset aplicado por id, autor e checksum em `database_changelog`; editar um que já rodou quebra a subida (checksum diferente) ou pula o SQL novo em silêncio. Sempre crie um arquivo novo e inclua-o no master:

- O arquivo fica em `db/changelog/changes/<ano>/<mês>/<DD-HHMM>-<descrição>.xml`.
- O `<include>` vai no fim do master, com `relativeToChangelogFile="false"`, como o que já está lá.
- Os ids dos changesets são `<DD-HHMM>-<n>`, numerados a partir de 1 dentro do arquivo.
- Changesets escritos pelo Claude usam `author="${claude}"`, a propriedade definida no master.
- Cada changeset traz o seu `<rollback>`.

## Codegen do jOOQ

As classes do jOOQ são geradas no build, a partir do changelog, e nunca vão para o git. O `compileKotlin` depende do `jooqCodegen`, então **o `build` e qualquer compilação precisam do Docker ligado**, não só os testes e o `bootRun`:

- A tarefa `startJooqDb` sobe um `postgres:18-alpine` descartável pelo Testcontainers e aplica o `db/changelog/db.changelog-master.xml` com o Liquibase. O `jooqCodegen` gera o código com o `KotlinGenerator` a partir dos schemas `administration`, `registration` e `financial`, e a `stopJooqDb` derruba o contêiner.
- O código gerado fica em `build/generated-sources/jooq/main`, no pacote `br.com.webbudget.server.jooq` (por exemplo `br.com.webbudget.server.jooq.registration.tables.Wallets`), e está fora do git (pelo `build/` do `.gitignore`) e da cobertura do Kover.
- Um SHA-256 de todos os arquivos de `db/changelog` fica em `build/jooq-codegen-changelog.sha256`. Enquanto o digest não muda, `startJooqDb`, `jooqCodegen` e `stopJooqDb` são puladas e o Docker nem é tocado nessa etapa. Mudou um changelog, a geração roda de novo; um `./gradlew clean` apaga o marcador e também força a regeneração.
- O gerador avisa `Ambiguous key name` para `registration.fk_parent_on_cost_centers` (a FK de `cost_centers` para ela mesma, herdada da v4). É só um aviso das *implicit join paths*, e a geração termina normalmente.
- O jOOQ gerado é a base dos repositórios (veja [Persistência com jOOQ](#persistência-com-jooq)).

## Testes e cobertura

- JUnit 5 com `kotlin-test-junit5`, `useJUnitPlatform()` e `maxParallelForks = 4`. O número de forks é limitado para evitar disputa no Docker quando vários forks sobem um contêiner do Testcontainers ao mesmo tempo.
- `TestcontainersConfiguration` registra um Postgres `postgres:18-alpine` como `@ServiceConnection`, e os testes de integração o recebem do `BaseIntegrationTest`, que já o importa. O Docker precisa estar ligado para rodar os testes.
- Os testes de integração rodam contra esse Postgres real, sem MockK nem outro framework de mock de objetos. O que na v4 era teste de controller com mock é teste de integração: a chamada passa pelo controller, pelo serviço e pelo repositório de verdade.
- **Todo teste de integração estende `BaseIntegrationTest`**: `@SpringBootTest` no ambiente `MOCK`, com `@AutoConfigureMockMvc` e `@AutoConfigureRestTestClient`, perfil `test` e o `@Import` do `TestcontainersConfiguration` e do `MailTestConfiguration`. Todas as classes compartilham o mesmo contexto (um contêiner Postgres por fork), então **não use `@DirtiesContext`** nem configuração própria por classe. O `RestTestClient` (`restTestClient`) fala com o MockMvc, com o filtro do Spring Security aplicado, e as URLs são as reais, com `/private/v1`.
- **A autenticação dos testes fica num helper só**, no `BaseIntegrationTest`: `authenticateWithRoles(...)` põe no contexto de segurança um usuário com as roles pedidas, `authenticateAnonymously()` limpa o contexto, e cada teste começa autenticado com todas as roles. A #26 troca o corpo desses dois métodos pelo login e pelo cookie de sessão, sem mexer nos testes.
- **O e-mail dos testes** é um `GreenMail` com porta dinâmica (nunca fixa, por causa dos forks em paralelo), exposto como o bean `greenMail`. O `BaseIntegrationTest` limpa as caixas antes de cada teste, e o teste lê `greenMail.receivedMessages`.
- **Dados de teste são SQL em `src/test/resources/sql/<módulo>/`**, carregados com `@Sql`. O `clear-tables.sql` apaga só o que o teste cria e **preserva as quatro roles do changelog e o admin criado na subida**; as roles de teste (`ANY_ROLE` e afins) e os usuários de teste entram por `create-authorities.sql` e `create-user.sql`, referenciando as roles do changelog pelo nome, sem ids fixos de coluna de identidade. Um módulo novo traz os seus próprios arquivos e o seu `clear-tables.sql`.
- Um controller que só existe para os testes (como o `ErrorProbeController`, que exercita o `ExceptionHandlerAdvice`) fica em `src/test/kotlin`, no pacote que ele testa.
- `TestServerApplication` é um `main` alternativo que sobe a aplicação com o `TestcontainersConfiguration`, contra um Postgres descartável.

O Kover mede a suíte, e o `koverVerify` impõe pisos sobre ela em `kover.reports.verify`, no `build.gradle.kts`. Os filtros excluem `ServerApplication`, `ServerApplicationKt` e o pacote gerado `br.com.webbudget.server.jooq`, e valem igual para os relatórios XML e HTML e para o `koverVerify`.

**Os pisos de LINE, INSTRUCTION e BRANCH só sobem.** Eles começaram em 0, subiram para 99, 99 e 84 com o módulo `administration` (#13) e sobem ao fim de cada subtarefa de portabilidade, até o que a suíte atinge naquele momento, arredondado para baixo. Um PR pode subir um número, nunca baixá-lo: baixar um piso é a cara de uma regressão de cobertura num diff. Com os pisos no que a suíte atinge, um PR que traz código de produção sem teste fica vermelho, então os testes entram junto com a funcionalidade.

## Manutenção deste arquivo

Todo PR que muda algo descrito aqui atualiza este arquivo no mesmo PR. A #26 e a #25 atualizam a parte de segurança e de autenticação (o `SecurityConfiguration` provisório e o helper de autenticação dos testes) quando o código delas existir.
