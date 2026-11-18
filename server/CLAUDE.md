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

O código portado da v4 vive nas três camadas dela, sob `br.com.webbudget.server`. Os módulos `administration`, `registration` e `financial` já estão portados, e o `administration` é a referência dos padrões das seções abaixo:

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
- **Um módulo que referencia dados de outro lê uma projeção pequena, não a entidade do outro módulo.** Os movimentos do `financial` carregam `ClassificationReference`, `CostCenterReference` e `FinancialPeriodReference` (em `domain/entities/financial/MovementReferences.kt`), que o `MovementReferenceRepository` resolve pelo `externalId` com jOOQ direto nas tabelas de `registration`, e as consultas de movimento fazem `JOIN` nelas. Um id desconhecido vira `ResourceNotFoundException` (`404`) no mapper.
- **O módulo `registration` segue o mesmo padrão** (`infrastructure/repository/registration/`). A busca textual dos filtros é `containsIgnoreCase` do jOOQ, que escapa `%` e `_`. O `CostCenter` carrega o pai um nível só, com o `full_name` gravado dele, e o nome completo do filho vem desse valor (`updateFullName`); o `CostCenterService` refaz o nome dos filhos e netos ao renomear ou mover um centro, e o `CostCenterParentValidator` recusa um pai que seja o próprio centro ou um descendente. O `CardRepository.findByExternalId` traz a carteira (o `CardView` a expõe); a listagem não. O `WalletRepository.update` não grava o `current_balance`, que é do financial. `GET /registration/financial-periods` sem `status` devolve só os períodos `ACCOUNTED`, como na v4 (`OPEN` são `ACTIVE` e `ENDED`, `ALL` são todos).

### Paginação

`infrastructure/repository/Paging.kt` concentra o padrão, e o `WebMvcConfiguration` liga o `@EnableSpringDataWebSupport` que resolve o `Pageable` dos controllers:

- `pagedModelOf(content, pageable, total)` devolve o `PagedModel<T>` que o repositório retorna. O JSON sai como `content` mais `page { size, number, totalElements, totalPages }`, o mesmo da v4.
- `PagedModel<T>.map { }` converte as entidades em views no controller, sem o repositório conhecer o payload.
- `Pageable.toOrderBy(sortable, tiebreaker)` traduz o `sort` da requisição para colunas conhecidas (um `Map<String, Field<*>>` por repositório) e sempre acrescenta um desempate por `id`, então a ordem é determinística. Propriedades de `sort` desconhecidas são ignoradas.
- A contagem é `dsl.fetchCount(tabela, condição)` com a mesma condição da página.

### Rotas e erros

- **Todo `@RestController` sai sob `/private/{version}`**: o `WebMvcConfiguration` acrescenta o prefixo a todo controller (versionamento por segmento, `v1` como padrão). O `@RequestMapping` do controller leva só o caminho do módulo, por exemplo `@RequestMapping("/administration/users")`, que responde em `/private/v1/administration/users`. O `Location` de um `201` já sai com o prefixo.
- **Erros são `ProblemDetail` (RFC 7807)**, produzidos pelo `ExceptionHandlerAdvice` (uma subclasse de `ResponseEntityExceptionHandler`). O código de máquina fica na propriedade **`error`** (`field-validation-failed`, `resource-not-found`, `conflicting-properties`, `concurrent-update`, `invalid-token`, `bad-request`, `data-integrity-violation`, `internal-error`), e `parameters` leva os valores de contexto, por exemplo o mapa campo → código das violações de validação (`422`) ou a propriedade em conflito (`409`). A v4 chamava o campo de `code`; o client lê `error`.
- As exceções de domínio são `DomainException` (regra violada, `400` por padrão, `DomainException.conflict(...)` para `409`) e `ApplicationException` (`ResourceNotFoundException` é `404`). Os códigos de domínio ficam em `domain/exceptions/ErrorCodes.kt`, e os códigos das mensagens de validação de campo (`is-null-or-blank` e afins) em `application/payloads/ErrorCodes.kt`. `IllegalArgumentException`, violações de integridade e erros de acesso a dados respondem `400` genérico, e qualquer outra exceção `500` genérico: a mensagem real só vai para o log. Um `AccessDeniedException` ou `AuthenticationException` é relançado para o Spring Security tratar (veja [Autenticação e autorização](#autenticação-e-autorização)).
- **Status herdados da v4, de propósito**: `DELETE` e `PATCH` sem corpo respondem `200` (`ResponseEntity<Void>`), não `204`; `POST` responde `201` com `Location`; validação de corpo responde `422`.
- **O `JacksonConfiguration` define a leitura dos payloads**: strings viram `null` quando vazias ou só com espaços (então `""` cai em `is-null-or-blank` e não em erro de formato), enum desconhecido vira `null`, propriedades desconhecidas são ignoradas e `null` não é serializado.
- **A segurança está descrita em [Autenticação e autorização](#autenticação-e-autorização).** O `SecurityConfiguration` traz as regras de caminho por role de área sob `/private/v1` (`/administration` para `ADMINISTRATION`, `/registration`, `/financial` e `/dashboards` para as outras), `/private/v1/accounts/**`, `/private/v1/auth/login`, `/private/v1/auth/register` e os endpoints `health` e `info` do Actuator públicos e o resto autenticado. O `UserDetailsService` é um `InMemoryUserDetailsManager` vazio só para o Spring Boot não gerar um usuário com senha aleatória. As roles são autoridades `ROLE_<NOME>`.
- **O admin inicial** (`admin@webbudget.com.br`, `APPROVED`, com todas as roles) é criado na subida pelo `AdminUserBootstrap` quando não existe. A senha vem de `ADMIN_DEFAULT_PASSWORD` (`web-budget.security.admin-default-password`); se a variável não existir, o bootstrap gera uma senha aleatória que sai só no log, e não há senha padrão fixa.

### E-mails

Os e-mails do módulo (ativação de conta, recuperação de senha, novo cadastro para os admins e conta aprovada) saem pelo `MailSenderService`, que renderiza um template Thymeleaf de `src/main/resources/mail-templates/` (um por idioma, `<nome>-<en_US|pt_BR>.html`, escolhido pelo `defaultLanguage` do usuário) e envia pelo SMTP de `spring.mail.*` (o Maildev do `compose.yaml` no `bootRun`, interface em `http://localhost:1080`). Uma classe `MailTemplate` por e-mail, em `domain/mail/`, define o assunto e as variáveis.

**Ninguém chama o `MailSenderService` direto: o serviço publica um `MailRequested(template)` com o `ApplicationEventPublisher`** (o `AccountMailNotifier` faz isso para os avisos de cadastro e aprovação; o `AccountActivationService` e o `RecoverPasswordService`, para os seus). O `MailRequestedListener` é um `@Async @TransactionalEventListener(AFTER_COMMIT, fallbackExecution = true)`, então o e-mail só sai depois que a transação que gravou o token (ou o usuário) foi confirmada, e uma transação desfeita não deixa e-mail com link morto. Fora de uma transação, o `fallbackExecution` envia na hora. O template já chega pronto no evento, e o listener não escreve no banco. O `@Async` não vale no perfil `test` (o `AsyncConfiguration` não entra), onde o envio roda síncrono depois do commit e o GreenMail pode ser lido logo em seguida. As propriedades `web-budget.mail.*` e a `web-budget.frontend-url`, usada só para montar os links dos e-mails, vêm do `application.yaml`.

## Portabilidade da v4

O código de origem fica em `D:/desenvolvimento/web-budget/back-end`, o clone do repositório arquivado `web-budget/back-end`. Ele é só referência: leia-o para portar as regras de negócio e os payloads, mas nunca o altere.

O port mantém as regras de negócio e os payloads da v4. O que muda:

- Nada é portado com JPA: entidades JPA, `Specification`s e repositórios do Spring Data dão lugar ao jOOQ.
- Nada é portado com MockK: os testes são de integração contra um Postgres real (veja [Testes e cobertura](#testes-e-cobertura)).
- Nada é portado com JWT nem com CORS: a autenticação é por sessão no servidor, e o client fala com o server pelo proxy do Vite, na mesma origem.
- As rotas saem de `/api/...`, `/auth` e `/accounts` para `/private/v1/...`, e os erros respondem como `ProblemDetail`.
- O módulo de investimentos não é portado, e a role `INVESTMENTS` não existe.
- O build não tem Detekt.

## Autenticação e autorização

A autenticação é por **sessão no servidor**, na memória do Tomcat (nenhuma tabela de sessão: reiniciar o server derruba as sessões). O padrão vem do investlog, com uma diferença: lá a role é única, aqui as roles são por área. Não existe JWT, `httpBasic` nem CORS, e nenhuma issue os traz de volta: o client fala com o server pelo proxy do Vite, na mesma origem.

### Login e sessão

- `POST /private/v1/auth/login` (`email` até 254 caracteres e `password` até 128, em JSON) cria a sessão e responde `SessionView` (`name`, `email`, `status` e `roles`). `GET /private/v1/auth/session` devolve a mesma `SessionView`, lida do banco a cada chamada, e `POST /private/v1/auth/logout` invalida a sessão. A senha é BCrypt com força 11, como na v4.
- **`AuthService.establishSession` é o único caminho que emite sessão.** Todo login futuro (TOTP, Google) passa por ele, para que uma regra posta num fluxo não deixe de valer em outro. Ele troca o id da sessão (`changeSessionId`, contra fixação de sessão) e grava o `CurrentUser` como principal, com as autoridades `ROLE_<ROLE>` e `STATUS_<STATUS>`.
- Senha errada e e-mail desconhecido respondem o mesmo `401` `invalid-credentials`, e o e-mail desconhecido gasta o mesmo tempo de um BCrypt. Conta inativa (`active = false`) ou `BLOCKED`, que enviou a senha certa, responde `401` `account-disabled`. Uma conta `PENDING` entra e vê o próprio status, mas as rotas de negócio respondem `403`.

### Contas: auto-cadastro, aprovação e bloqueio

Há dois caminhos de entrada, e os dois terminam no `UserService.createAccount`:

- **Criada pelo admin** (`POST /private/v1/administration/users`): nasce `APPROVED`, com as roles definidas na criação, e é ativada por e-mail (`sendActivationEmail`).
- **Auto-cadastro** (`POST /private/v1/auth/register`, público, `AccountRegistrationService`): `name` (até 100 caracteres, sem caracteres de controle), `email` (até 254), `password` (até **72 bytes** em UTF-8, `@MaxUtf8Bytes`, sem regra de composição: a v4 só exigia não vazia; o limite é o do BCrypt, que no Spring Security 7 lança `IllegalArgumentException` acima disso, então os 128 caracteres da especificação não cabem. O login aceita até 128 caracteres e responde `401` para uma senha maior que o hash, sem erro) e `defaultLanguage` opcional (padrão `PT_BR`). Cria o usuário `PENDING`, inativo e sem roles, e manda o e-mail de ativação. Responde `201` sem corpo **também quando o e-mail já existe** (nada é criado nem enviado, e o BCrypt é gasto do mesmo jeito), para a rota não revelar quem tem conta. A checagem de existência vem antes do insert: capturar o `DataIntegrityViolationException` dentro da transação não serve, porque o Postgres a aborta.
- **Ativar não aprova.** Depois de ativada por e-mail, a conta continua `PENDING` até um admin aprová-la; quem entra nesse meio-tempo só enxerga `/auth/session` e `/auth/logout`. Os admins são avisados (`UserPendingApprovalEmail`) **quando a conta é ativada**, e não no cadastro: assim só e-mail confirmado chega ao admin, e a rota pública não vira um jeito de encher a caixa de entrada dele. Os destinatários são os usuários `APPROVED`, ativos e com a role `ADMINISTRATION` (`UserRepository.findApprovedAdministrators`).
- **Transições de status** (`UserController`, `PATCH /{id}/approve|block|unblock`, `200` sem corpo): aprovar é só `PENDING` → `APPROVED` (e manda `AccountApprovedEmail`); bloquear é só `APPROVED` → `BLOCKED`; desbloquear é só `BLOCKED` → `APPROVED`. Qualquer outra origem responde `409` `invalid-user-status-transition`. Como bloquear só parte de `APPROVED`, um `BLOCKED` sempre já foi aprovado, e desbloquear nunca pula a aprovação. A transição é um `UPDATE ... WHERE status = ? AND version = ?` (`UserRepository.updateStatus`). **Bloquear também sobe o `credentials_version`**, então as sessões abertas morrem na próxima requisição com `401` `session-revoked` e o login passa a responder `account-disabled`.
- **O admin não age sobre a própria conta**: bloquear, resetar a senha (`update-password`), remover, trocar as roles ou desativar respondem `400` `self-action-not-allowed`. O `SelfActionGuard` compara o `externalId` da sessão com o do alvo e não faz nada quando não há sessão (bootstrap, testes), e as regras moram no `UserService`. Trocar nome e idioma da própria conta continua valendo. A recuperação de senha por e-mail usa o `UserService.updatePassword`, que não passa pelo guard.
- `GET /administration/users` aceita `userStatus` (`PENDING`, `APPROVED`, `BLOCKED`) além do `status` (ativo/inativo) de antes, e o `UserView` traz o `status` da conta, para o admin achar quem espera aprovação.

### Limites de tentativa

Login e cadastro são protegidos por três contadores em memória, todos `AttemptLockoutTracker` (bloqueio progressivo: ao chegar em `max-attempts` falhas, bloqueia por `base-duration` e dobra a cada novo bloqueio, até 32 vezes a duração base; `failure-window` faz falhas antigas deixarem de contar; um sucesso apaga o contador da chave). O estado vive na memória do processo, como a sessão, e some ao reiniciar. Um expurgo oportunista (no máximo uma vez por minuto, dentro de `recordFailure`) apaga as chaves sem bloqueio e sem falha há mais de uma hora, porque as chaves vêm de e-mail e IP que o atacante escolhe e o mapa não pode crescer sem limite.

| Limitador | Chave | Padrão (`web-budget.security.*`) |
|---|---|---|
| `LoginAttemptLimiter` | e-mail (minúsculo, sem espaços) + IP | `login`: 5 falhas, 60s |
| `IpAttemptLimiter` | IP, inclusive para e-mails que não existem | `ip-lockout`: 20 falhas, 60s, janela de 15 min |
| `RegistrationAttemptLimiter` | IP, conta toda tentativa de cadastro | `registration-limit`: 10 tentativas, 15 min, janela de 1h |

- O `AuthService.login` checa o IP e o par e-mail+IP **antes** de buscar o usuário e de gastar o BCrypt, então um par bloqueado leva `429` mesmo com a senha certa. Uma falha de credencial (inclusive e-mail desconhecido) soma nos dois contadores; um login bem-sucedido apaga só o do par e **não zera o do IP**. A conta `account-disabled` não conta como falha, porque a senha estava certa.
- As respostas são `429` com `error` `too_many_login_attempts` ou `too_many_registration_attempts` (snake_case, como o `pending_approval`, porque o client compara o literal).
- As propriedades são do `SecurityProperties` (`@ConfigurationProperties("web-budget.security")`, em `infrastructure/config/security/`) e vêm das variáveis `LOGIN_LOCKOUT_MAX_ATTEMPTS`, `LOGIN_LOCKOUT_BASE_DURATION`, `IP_LOCKOUT_*`, `REGISTRATION_LIMIT_*` e `CLIENT_IP_TRUSTED_PROXY_COUNT`. O perfil de teste usa 1000 em todos os limites.
- **O IP vem do `ClientIpResolver`**, e a configuração é um par que precisa ficar coerente. Com `trusted-proxy-count: 0` (padrão) o IP é o `remoteAddr` e o `X-Forwarded-For` é ignorado, porque o cliente o forja. Com `N > 0` o resolver lê todas as linhas do `X-Forwarded-For`, acrescenta o `remoteAddr` e toma a entrada `N` contando de trás para a frente (a que o proxy mais externo de confiança anexou), então endereços postos pelo cliente no começo da cadeia não valem; cadeia mais curta que `N`, ou entrada que não parece um IP, cai no `remoteAddr`. **Não deixe o Tomcat e o resolver tirarem proxies da mesma cadeia**: o perfil `prod` liga `forward-headers-strategy: native` (o `RemoteIpValve`) com `server.tomcat.remoteip.remote-ip-header: X-Real-IP` (`REMOTE_IP_HEADER`), e então o valve já troca o `remoteAddr` pelo IP real e o resolver fica em `0`. Se o proxy só anexa ao `X-Forwarded-For`, aponte o `remote-ip-header` para um header que ele não manda e use `CLIENT_IP_TRUSTED_PROXY_COUNT` com o número de proxies. O valve só confia em proxies de rede privada por padrão; um proxy fora dela exige `server.tomcat.remoteip.internal-proxies`, ou todo mundo vira o mesmo IP e se bloqueia junto.
- O cookie é o `JSESSIONID`, com `HttpOnly`, `SameSite=Lax` e timeout de 30 minutos (`server.servlet.session`, o mesmo valor que o client usa). O `Secure` quem põe é o Tomcat quando a requisição chega por https, e o perfil `prod` liga `server.forward-headers-strategy: native` para que ele enxergue o https que o proxy terminou.

### O que a sessão guarda e o que o banco decide

O principal da sessão (`CurrentUser`, com `externalId`, `status`, `credentialsVersion` e as roles) é só uma foto do login. As autoridades dela alimentam apenas as regras de caminho do `SecurityConfiguration`, que são a primeira barreira: uma role **acrescentada** vale no próximo login, e uma role **removida** continua passando por essa barreira até a sessão acabar. Por isso o que decide de verdade é a leitura viva:

- **`CurrentUserProvider.getCurrentUser()`** (implementação `SecurityContextCurrentUserProvider`) relê o usuário no banco **por `externalId`**, a cada chamada, e recarrega as roles dos grants. Por `externalId`, e não por e-mail, porque o admin edita o e-mail e porque um e-mail apagado e cadastrado de novo é outra conta: a sessão da conta antiga não pode servir a nova. Falhas: sem sessão `401` `unauthenticated`; conta apagada, inativa ou com `credentials_version` diferente `401` `session-revoked` (e o entry point invalida a sessão); `status` diferente de `APPROVED` `403` `pending_approval`.
- **`getSessionUser()`** faz as mesmas checagens menos a de aprovação. É o que o `GET /auth/session` usa, para que um usuário pendente ou bloqueado ainda consiga ler o próprio status.
- **Toda rota de negócio leva `@RequiresRole(Role.X)`**, no controller ou no método. A anotação é um `@PreAuthorize("@roleGuard.hasRole('{role}')")` (meta-anotação com `AnnotationTemplateExpressionDefaults`), e o `RoleGuard` consulta o `CurrentUserProvider`: sem a role responde `403` `forbidden`, e os erros acima viram os mesmos `401` e `403`. Um controller novo sem `@RequiresRole` só tem a barreira cacheada do caminho, que **não enxerga bloqueio, remoção de role nem troca de senha**. A #14 e a #15 aplicam nos controllers delas.
- **`credentials_version` sobe em toda troca de senha**, e isso mora no repositório: `UserRepository.updatePassword` é o único jeito de gravar a senha, e o `update` genérico nem escreve `password`. Assim o admin, a recuperação por e-mail e qualquer fluxo futuro invalidam as outras sessões sem depender de lembrar de incrementar. O admin não troca a própria senha por `update-password` (veja [Contas](#contas-auto-cadastro-aprovação-e-bloqueio)), então não há sessão própria para reemitir.
- **O `RequiresRoleCoverageTest` garante a regra**: ele varre os handlers do `RequestMappingHandlerMapping` e falha se uma rota sob `/private/{version}` não tiver `@RequiresRole` no método nem na classe. Ficam de fora só `auth/**`, `accounts/**` e o `error-probe` de teste; uma rota pública nova entra na lista do teste, de propósito.
- "Bloquear" é o `status` `BLOCKED` (`PATCH /{id}/block`); `active = false` é a conta ainda não ativada ou desativada pelo admin. Os dois derrubam a sessão, de jeitos diferentes: `active = false` responde `401` `session-revoked` na hora, e o `BLOCKED` também, porque o bloqueio sobe o `credentials_version`.

### Erros de segurança

O `ProblemDetailAuthenticationEntryPoint` (`401`) e o `ProblemDetailAccessDeniedHandler` (`403`) respondem `ProblemDetail` com a propriedade `error`: `unauthenticated`, `invalid-credentials`, `account-disabled`, `session-revoked`, `forbidden`, `invalid-csrf-token` e `pending_approval`. Este último é snake_case de propósito, porque é o literal que o client compara; os outros seguem o kebab-case do `ErrorCodes`. As exceções de `401` são `AuthenticationException` (`AuthenticationFailedException`) e a de aprovação é um `AccessDeniedException`: o `ExceptionHandlerAdvice` as relança, e é a cadeia do Spring Security que responde.

### CSRF: ligado

**Decisão: o CSRF fica ligado**, com `CookieCsrfTokenRepository.withHttpOnlyFalse()` e o tratador de SPA do Spring Security, ligados pelo `spa()` do configurador Java (`http.csrf { csrf -> csrf.spa()... }`, fora do bloco do DSL do Kotlin, que não tem `spa()`). O investlog desliga e confia em `SameSite` e na mesma origem, mas aqui nada impede ligar: o client e o server falam na mesma origem pelo proxy, e o axios já lê o cookie `XSRF-TOKEN` e manda o header `X-XSRF-TOKEN` nas requisições de escrita, sem código novo. O que o `SameSite=Lax` não cobre (irmãos do mesmo site, subdomínios) o token cobre. O custo é só este contrato:

- Toda requisição que não é `GET`, `HEAD`, `OPTIONS` ou `TRACE` precisa do header `X-XSRF-TOKEN` igual ao cookie `XSRF-TOKEN`, **inclusive as anônimas** (`POST /auth/login` e `PATCH /accounts/**`). Sem ele a resposta é `403` `invalid-csrf-token`, e isso acontece antes da autorização: um `POST` anônimo sem token dá `403`, não `401`.
- O cookie `XSRF-TOKEN` (`SameSite=Lax`, legível pelo JavaScript) sai em toda resposta enquanto o navegador não o tem, mesmo num `401`. O client o obtém com o primeiro `GET /private/v1/auth/session`, que ele já faz ao abrir a aplicação.
- O `RequestCache` é o `NullRequestCache`, para que um `401` anônimo não crie uma `HttpSession` à toa.

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
| `changes/2026/11/16-1100-add-user-session-columns.xml` | As colunas `status` (`PENDING`, `APPROVED`, `BLOCKED`), `credentials_version` e `auth_provider` (`LOCAL`, `GOOGLE`) de `administration.users`, com padrão `APPROVED`, `0` e `LOCAL` para os registros existentes. |
| `changes/2026/11/17-1000-widen-user-email.xml` | `administration.users.email` de `varchar(150)` para `varchar(254)`, o limite do auto-cadastro. |

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
- **Todo teste de integração estende `BaseIntegrationTest`**: `@SpringBootTest` com servidor de verdade (`RANDOM_PORT`, porque o MockMvc não devolve nem reenvia o cookie de sessão), `@AutoConfigureRestTestClient`, perfil `test` e o `@Import` do `TestcontainersConfiguration`, do `MailTestConfiguration` e do `RestClientTestConfiguration`. Todas as classes compartilham o mesmo contexto (um contêiner Postgres por fork), então **não use `@DirtiesContext`** nem configuração própria por classe. O `RestTestClient` (`restTestClient`) fala com o Tomcat local, com a cadeia do Spring Security inteira, e as URLs são as reais, com `/private/v1` (o `Location` de um `201` leva a porta aleatória).
- **A autenticação dos testes é login real**, num helper só, no `BaseIntegrationTest`: cada teste começa logado como o admin da subida (todas as roles, senha `test-admin-password`, de `web-budget.security.admin-default-password` no `application-test.yaml`). `authenticateWithRoles(...)` cria (e apaga no fim do teste) um usuário só com as roles pedidas e faz login com ele, `authenticateAnonymously()` fica só com o cookie `XSRF-TOKEN`, `authenticateAs(email, senha)` troca a sessão e `login(email, senha)` devolve o cabeçalho `Cookie` de uma sessão nova sem trocar a do teste (para enviar com `.header("Cookie", ...)`, como nos testes de revogação). `createLoginUser(...)` cria um usuário que entra no login e que o `BaseIntegrationTest` apaga ao fim. O `RestClientTestConfiguration` põe no `RestTestClient` um interceptor que reenvia o cookie da sessão atual e copia o `XSRF-TOKEN` para o header `X-XSRF-TOKEN` das escritas; o header `X-Test-Skip-Csrf-Token` desliga só essa cópia, para testar o `403` de CSRF. Os testes de login, revogação e acesso por área estão em `AuthControllerTest` e `SessionRevocationTest`.
- **Testes de limite de tentativa**: o contexto é compartilhado e todo teste chega de `127.0.0.1`, então um limite estourado nesse IP derrubaria os testes seguintes do fork. O perfil `test` põe os limites em 1000 e `client-ip.trusted-proxy-count: 1`, e cada teste de limite manda o próprio `X-Forwarded-For` (`203.0.113.x`, um IP por teste) e planta as falhas direto nos limitadores (`LoginAttemptLimiter`, `IpAttemptLimiter`, `RegistrationAttemptLimiter`), lendo o máximo do `SecurityProperties` em vez de fixar o número. O que depende do tempo (janela, bloqueio progressivo, expurgo) é teste unitário do `AttemptLockoutTracker` com o `MutableClock` de `src/test/kotlin/.../utilities`, porque o contexto compartilhado não troca o `Clock`. O `ClientIpResolver` tem teste unitário com `MockHttpServletRequest`.
- **O e-mail dos testes** é um `GreenMail` com porta dinâmica (nunca fixa, por causa dos forks em paralelo), exposto como o bean `greenMail`. O `BaseIntegrationTest` limpa as caixas antes de cada teste, e o teste lê `greenMail.receivedMessages`.
- **Dados de teste são SQL em `src/test/resources/sql/<módulo>/`**, carregados com `@Sql`. O `clear-tables.sql` apaga só o que o teste cria e **preserva as quatro roles do changelog e o admin criado na subida**; as roles de teste (`ANY_ROLE` e afins) e os usuários de teste entram por `create-authorities.sql` e `create-user.sql`, referenciando as roles do changelog pelo nome, sem ids fixos de coluna de identidade. Um módulo novo traz os seus próprios arquivos e o seu `clear-tables.sql`. Os testes do `financial` precisam de linhas de `registration` (período, classificação e centro de custo) e as criam em `sql/financial/create-registration-data.sql`, com ids na faixa 9101 em diante; o `clear-tables.sql` do módulo roda antes **e depois** de cada teste (`@Sql(..., executionPhase = AFTER_TEST_METHOD)`) e apaga essas linhas, para que as chaves estrangeiras dos movimentos não travem a limpeza de outro módulo.
- Um controller que só existe para os testes (como o `ErrorProbeController`, que exercita o `ExceptionHandlerAdvice`) fica em `src/test/kotlin`, no pacote que ele testa.
- `TestServerApplication` é um `main` alternativo que sobe a aplicação com o `TestcontainersConfiguration`, contra um Postgres descartável.

O Kover mede a suíte, e o `koverVerify` impõe pisos sobre ela em `kover.reports.verify`, no `build.gradle.kts`. Os filtros excluem `ServerApplication`, `ServerApplicationKt` e o pacote gerado `br.com.webbudget.server.jooq`, e valem igual para os relatórios XML e HTML e para o `koverVerify`.

**Os pisos de LINE, INSTRUCTION e BRANCH só sobem.** Eles começaram em 0, subiram para 99, 99 e 84 com o módulo `administration` (#13), para 99, 99 e 85 com a sessão no servidor (#26), para 99, 99 e 89 com o módulo `registration` (#14), para 99, 99 e 90 com o módulo `financial` (#15), para 99, 99 e 91 com o auto-cadastro e os limites de tentativa (#27) e sobem ao fim de cada subtarefa de portabilidade, até o que a suíte atinge naquele momento, arredondado para baixo. Um PR pode subir um número, nunca baixá-lo: baixar um piso é a cara de uma regressão de cobertura num diff. Com os pisos no que a suíte atinge, um PR que traz código de produção sem teste fica vermelho, então os testes entram junto com a funcionalidade.

## Manutenção deste arquivo

Todo PR que muda algo descrito aqui atualiza este arquivo no mesmo PR. A #28 e a #29 (TOTP e Google) estendem a seção de autenticação e autorização quando o código delas existir.
