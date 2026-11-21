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

O `application.yaml` lê a porta de `APPLICATION_PORT` (padrão `8085`) e o banco de `DATABASE_URL` (padrão `localhost:5433/webbudget`, sem o prefixo `jdbc:postgresql://`, que o próprio arquivo acrescenta), `DATABASE_USER` e `DATABASE_PASSWORD` (padrão `sa_webbudget`). O Actuator expõe só `health` e `info`, em modo `read_only`. O banner do jOOQ fica desligado com `logging.level.org.jooq.Constants: off`.

**Profiles.** Além do `application.yaml` (que vale para todos), há um arquivo por profile:

| Profile | Arquivo | O que muda |
|---|---|---|
| `dev` | `src/main/resources/application-dev.yaml` | Log `debug` para `br.com.webbudget` e `web-budget.security.totp.required: false` (o login não pede TOTP). |
| `prod` | `src/main/resources/application-prod.yaml` | `server.forward-headers-strategy: native` e `server.tomcat.remoteip.remote-ip-header` (`REMOTE_IP_HEADER`, padrão `X-Real-IP`), para o Tomcat enxergar o https e o IP real atrás do proxy. O TOTP continua obrigatório (`TOTP_REQUIRED`, padrão `true`). |
| `test` | `src/test/resources/application-test.yaml` | Limites de tentativa em 1000, `totp.required: false` e log `debug`. Só os testes ativam. |

O `bootRun` ativa o `dev` por padrão (`SPRING_PROFILES_ACTIVE`, definido na tarefa `bootRun` do `build.gradle.kts` só quando a variável não existe no ambiente), e o `test` e o `build` não são afetados. Para subir com outro profile, defina a variável ou passe o argumento, que vence a variável:

```bash
SPRING_PROFILES_ACTIVE=prod ./gradlew bootRun                    # profile prod, com o TOTP obrigatório
./gradlew bootRun --args='--spring.profiles.active=prod'         # o mesmo, pelo argumento
```

Fora do `dev` o padrão é `TOTP_REQUIRED=true`. Não existe profile `railway` (o investlog tem um porque roda na Railway): o webBudget ainda não tem ambiente de deploy, e o profile entra com ele.

O Kover pendura o `koverVerify` no `check`, então o `build` já falha quando a cobertura fica abaixo de um piso. O CI roda `./gradlew koverXmlReport koverVerify` no job `test-server`; antes de abrir um PR que mexe no `server/`, rode o mesmo comando localmente.

**Nunca use a porta 8085 para verificar algo**: ela é do servidor de desenvolvimento do usuário (regra do `CLAUDE.md` da raiz). Suba uma instância descartável em outra porta com `./gradlew bootRun --args='--server.port=18085'`. Ao terminar, mate a JVM da aplicação pelo PID (parar a tarefa do Gradle deixa o processo escutando na porta) e, se os contêineres `webbudget-postgres` e `webbudget-maildev` não estavam rodando antes, derrube-os com `docker compose down`. Contêineres que já estavam de pé são do usuário e continuam de pé.

## Stack

As versões estão no `build.gradle.kts`; aqui só o que ele não diz sozinho:

- Kotlin com `-Xjsr305=strict` e `-Xemit-jvm-type-annotations`, Java 25 e Gradle do wrapper. Spring Boot 4 com `webmvc` (servlet, não WebFlux) e threads virtuais ligadas.
- `oauth2-client` só serve ao login com Google. `org.thymeleaf:thymeleaf-spring6` é só dos e-mails, sem o starter. O `spring-data-commons` é explícito para `Pageable` e `PagedModel`.
- PostgreSQL 18 (`postgres:18-alpine`), tanto no `compose.yaml` quanto no Testcontainers.
- O plugin `org.jooq.jooq-codegen-gradle` gera as classes Kotlin das tabelas no build (veja [Codegen do jOOQ](#codegen-do-jooq)).
- Jackson 3 (`tools.jackson.module:jackson-module-kotlin`), `kotlin-logging-jvm` (`KotlinLogging.logger {}`), TOTP (`dev.samstevens.totp`) e QR code (`zxing`) nas versões do investlog.
- Kover para cobertura. Nos testes, GreenMail recebe os e-mails e o `RestTestClient` chama a API (veja [Testes e cobertura](#testes-e-cobertura)).

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

Dentro de cada camada, o código se divide pelas áreas da v4, que são também os schemas do banco: `administration`, `registration` e `financial` (por exemplo `application/controllers/registration`, `domain/services/financial`, `infrastructure/repository/administration`). Não existem pacotes planos por funcionalidade: todo código novo entra numa das três camadas. Elas seguem o Domain Driven Design e não mudam: o investlog serve de referência para enxugar código, nunca para reorganizar pacotes por feature.

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
- As consultas `existsBy...` do jOOQ (`dsl.fetchExists`) substituem os `findBy...` que os validadores usavam só para checar existência. Quando a checagem também roda na atualização, o método recebe `excludingExternalId: UUID? = null` e usa `Field<UUID?>.excluding(...)` (`infrastructure/repository/Conditions.kt`): sem id (registro novo) a condição não filtra nada, então o validador não precisa de um ramo `isSaved()`. Não crie um par `existsByX`/`existsByXAndExternalIdNot`.
- **Um módulo que referencia dados de outro lê uma projeção pequena, não a entidade do outro módulo.** Os movimentos do `financial` carregam `ClassificationReference`, `CostCenterReference` e `FinancialPeriodReference` (em `domain/entities/financial/MovementReferences.kt`), que o `MovementReferenceRepository` resolve pelo `externalId` com jOOQ direto nas tabelas de `registration`, e as consultas de movimento fazem `JOIN` nelas. Um id desconhecido vira `ResourceNotFoundException` (`404`) no mapper.
- **O módulo `registration` segue o mesmo padrão** (`infrastructure/repository/registration/`). A busca textual dos filtros é `containsIgnoreCase` do jOOQ, que escapa `%` e `_`. O `CostCenter` carrega o pai um nível só, com o `full_name` gravado dele, e o nome completo do filho vem desse valor (`updateFullName`); o `CostCenterService` refaz o nome dos filhos e netos ao renomear ou mover um centro, e o `CostCenterParentValidator` recusa um pai que seja o próprio centro ou um descendente. O `CardRepository.findByExternalId` traz a carteira (o `CardView` a expõe); a listagem não. O `WalletRepository.update` não grava o `current_balance`, que é do financial. `GET /registration/financial-periods` sem `status` devolve só os períodos `ACCOUNTED`, como na v4 (`OPEN` são `ACTIVE` e `ENDED`, `ALL` são todos).

### Paginação

`infrastructure/repository/Paging.kt` concentra o padrão, e o `WebMvcConfiguration` liga o `@EnableSpringDataWebSupport` que resolve o `Pageable` dos controllers:

- `pagedModelOf(content, pageable, total)` devolve o `PagedModel<T>` que o repositório retorna. O JSON sai como `content` mais `page { size, number, totalElements, totalPages }`, o mesmo da v4.
- `PagedModel<T>.map { }` converte as entidades em views no controller, sem o repositório conhecer o payload.
- `Pageable.toOrderBy(sortable, createdOn, id)` traduz o `sort` da requisição para colunas conhecidas (um `Map<String, Field<*>>` por repositório) e sempre acrescenta o desempate `id desc`, então a ordem é determinística. Propriedades de `sort` desconhecidas são ignoradas.
- **Regra de produto para toda listagem: sem `sort`, a ordem é pela data de criação, do mais recente para o mais antigo** (`created_on desc`, desempate `id desc`), e a listagem **sempre aceita `name` em `sort`**. Todo repositório paginado novo declara `name` e `createdOn` no mapa `sortable` e chama `toOrderBy(sortable, tabela.CREATED_ON, tabela.ID)`. Uma listagem não paginada que serve de lista ao usuário segue a mesma ordem; listas auxiliares (roles, dispositivos confiáveis, tentativas) ficam como estão. **Se um recurso listado não tiver o campo `name`, a ordenação alternativa se decide com o usuário: pare e pergunte, não escolha uma coluna por conta própria.** O `ListingSortOrderTest` confere a ordem padrão e o `sort=name` de cada listagem.
- A contagem é `dsl.fetchCount(tabela, condição)` com a mesma condição da página.

### Rotas e erros

- **Todo `@RestController` sai sob `/private/{version}`**: o `WebMvcConfiguration` acrescenta o prefixo a todo controller (versionamento por segmento, `v1` como padrão). O `@RequestMapping` do controller leva só o caminho do módulo, por exemplo `@RequestMapping("/administration/users")`, que responde em `/private/v1/administration/users`. O `Location` de um `201` já sai com o prefixo.
- **Erros são `ProblemDetail` (RFC 7807)**, produzidos pelo `ExceptionHandlerAdvice` (uma subclasse de `ResponseEntityExceptionHandler`). O código de máquina fica na propriedade **`error`** (`field-validation-failed`, `resource-not-found`, `conflicting-properties`, `concurrent-update`, `invalid-token`, `bad-request`, `data-integrity-violation`, `internal-error`), e `parameters` leva os valores de contexto, por exemplo o mapa campo → código das violações de validação (`422`) ou a propriedade em conflito (`409`). A v4 chamava o campo de `code`; o client lê `error`.
- As exceções de domínio são `DomainException` (regra violada, `400` por padrão, `DomainException.conflict(...)` para `409`) e `ApplicationException` (`ResourceNotFoundException` é `404`). Os códigos de domínio ficam em `domain/exceptions/ErrorCodes.kt`, e os códigos das mensagens de validação de campo (`is-null-or-blank` e afins) em `application/payloads/ErrorCodes.kt`. **Toda anotação de validação em `application/payloads` usa uma constante desse `ErrorCodes` no `message` (`@field:Email(message = EMAIL_IS_INVALID)`), nunca texto solto nem a mensagem padrão do Jakarta**, para o mesmo erro sair com o mesmo código em toda a API; o `PayloadValidationMessagesTest` varre os payloads e falha se alguma anotação fugir da regra, e um código novo entra no `ErrorCodes` antes de ser usado. `IllegalArgumentException`, violações de integridade e erros de acesso a dados respondem `400` genérico, e qualquer outra exceção `500` genérico: a mensagem real só vai para o log. Um `AccessDeniedException` ou `AuthenticationException` é relançado para o Spring Security tratar (veja [Autenticação e autorização](#autenticação-e-autorização)).
- **Status herdados da v4, de propósito**: `DELETE` e `PATCH` sem corpo respondem `200` (`ResponseEntity<Void>`), não `204`; `POST` responde `201` com `Location`; validação de corpo responde `422`.
- **O `JacksonConfiguration` define a leitura dos payloads**: strings viram `null` quando vazias ou só com espaços (então `""` cai em `is-null-or-blank` e não em erro de formato), enum desconhecido vira `null`, propriedades desconhecidas são ignoradas e `null` não é serializado.
- **A segurança está descrita em [Autenticação e autorização](#autenticação-e-autorização).** O `SecurityConfiguration` traz as regras de caminho por role de área sob `/private/v1` (`/administration` para `ADMINISTRATION`, `/registration`, `/financial` e `/dashboards` para as outras), `/private/v1/accounts/**`, `/private/v1/auth/login`, `/private/v1/auth/register`, `/private/v1/auth/totp/enroll`, `/private/v1/auth/totp/verify`, `/private/v1/auth/config`, `/private/v1/auth/google/link`, `/private/oauth2/**`, `/private/login/oauth2/**` e os endpoints `health` e `info` do Actuator públicos e o resto autenticado. O `UserDetailsService` é um `InMemoryUserDetailsManager` vazio só para o Spring Boot não gerar um usuário com senha aleatória. As roles são autoridades `ROLE_<NOME>`.
- **O admin inicial** (`admin@webbudget.com.br`, `APPROVED`, com todas as roles) é criado na subida pelo `AdminUserBootstrap` quando não existe. A senha vem de `ADMIN_DEFAULT_PASSWORD` (`web-budget.security.admin-default-password`); se a variável não existir, o bootstrap gera uma senha aleatória que sai só no log, e não há senha padrão fixa.

### E-mails

Todos os e-mails passam pelo `MailSender` (`domain/mail/`), que renderiza `templates/mail/<nome>.html` com o motor `mailTemplateEngine` e envia pelo SMTP de `spring.mail.*` (o Maildev do `compose.yaml` no `bootRun`, interface em `http://localhost:1080`). Hoje são nove templates: `account-approved`, `account-blocked`, `account-unblocked`, `account-activation` (um template com dois textos, o do auto-cadastro e o da conta criada pelo administrador, escolhidos pelo status da conta), `recover-password`, `user-pending-approval` e os três avisos de segurança (veja [Avisos de segurança](#avisos-de-segurança)). Quem monta e publica os de conta é o `AccountMailNotifier`, e os de segurança, o `SecurityNoticeNotifier`.

**O `mailTemplateEngine` é um `TemplateEngine` puro, não um `SpringTemplateEngine`.** O projeto só depende de `org.thymeleaf:thymeleaf-spring6` (o `SpringStandardDialect` e o `SpringMessageResolver`), sem o starter do Thymeleaf, então nenhum motor global é criado e nada além do `mailTemplateEngine` renderiza HTML. O motor (`MailTemplateConfiguration`, em `infrastructure/config/`) usa um `ClassLoaderTemplateResolver` (prefixo `templates/mail/`, sufixo `.html`, modo HTML, UTF-8) e um `SpringMessageResolver` ligado ao `mailMessageSource`, um `ResourceBundleMessageSource` só dos e-mails (basename `mail/messages`, UTF-8, `fallbackToSystemLocale = false`). Os dois beans são injetados com `@Qualifier("mailTemplateEngine")` e `@Qualifier("mailMessageSource")`.

**Estrutura de `templates/mail/`:**

| Arquivo | O que tem |
|---|---|
| `layout.html` | `th:fragment="layout(content, footer)"`: `lang` do locale, `<title>` com o assunto, `color-scheme: light` (só o tema claro, sem media query de tema escuro), o pré-cabeçalho escondido (`aria-hidden="true"`), a marca "wB" desenhada em HTML (sem imagem), o cartão de 560px, o rodapé do e-mail e a linha comum "Enviado automaticamente pelo webBudget…" com o endereço do app, e a media query de celular (`max-width: 480px`). |
| `parts.html` | Os fragmentos repetidos, todos com estilo inline: `badge(kind, label)` (`approved`, `pending`, `blocked`, `neutral`), `title`, `paragraph`, `closingParagraph` (sem margem embaixo, para o que vem antes do botão), `aside(lead, text)` (aviso com a frase de abertura em negrito), `note` (nota pequena sob o botão), `ledgerRow(label, value, mono)` (a ficha de linhas pautadas), `button(label, href)`, `fallback(href)` (o link de reserva em mono), `rule` e `notice(lead, text)` (a frase com o começo em negrito dos avisos). |
| `<nome>.html` | Um por e-mail, para os dois idiomas: define `content` e `footer` e chama o layout com `th:replace="~{layout :: layout(~{::content}, ~{::footer})}"`. |

**Textos e idiomas.** Um template por e-mail, e os textos em `src/main/resources/mail/messages.properties` (pt-BR, o padrão, igual ao `messages_pt_BR.properties`) e `messages_en_US.properties`. As chaves são `<template>.subject`, `.preheader`, `.badge`, `.title`, `.lead`, `.cta`, `.footer` e as que forem próprias do e-mail; `layout.*` são as comuns e `role.<ROLE>` os nomes das áreas. O `Language` do usuário vira o `Locale` do contexto (`Language.locale`: `PT_BR` → `pt-BR`, `EN_US` → `en-US`). **Mensagens usam ’ (apóstrofo tipográfico), nunca o apóstrofo reto**, que o `MessageFormat` engole quando a mensagem leva argumentos; o `MailMessagesTest` confere isso e que os dois idiomas têm as mesmas chaves.

**Regras dos templates.** `th:text` com dado de usuário, nunca `th:utext`. Toda cor é **hex** inline, convertido dos tokens do `client/src/assets/theme.css` (nunca `oklch()` nem `var()`, que cliente de e-mail não entende); os valores em uso estão no `layout.html` e no `parts.html`, e um e-mail novo os reaproveita pelos fragmentos. Fontes: IBM Plex Sans e IBM Plex Mono só no topo da pilha, com as de sistema depois, sem webfont. O motor usa o `SpringStandardDialect` (expressões SpEL, sem precisar do OGNL, que o starter não traz).

**`MailMessage` e envio.** `MailMessage(to, templateName, locale, variables, subjectArgs, preheaderArgs, messageKey)`: `subjectArgs` preenche o assunto (e, por padrão, o pré-cabeçalho, que também pode levar `{0}`) e `messageKey` (padrão: o nome do template) é o prefixo das chaves `.subject` e `.preheader`, para um template com dois textos, como o `account-activation`, ter um assunto para cada um (`account-activation.self-registration` e `account-activation.administrator-created`). O `MailSender` resolve `<template>.subject` (sem CR/LF, porque o assunto pode levar dado de usuário) e `<template>.preheader` no idioma do destinatário, expõe `subject`, `preheader` e `applicationUrl` ao template, renderiza, gera o texto puro com o `MailPlainText` e envia `multipart/alternative` (`setText(texto, html)`) com remetente "webBudget" e o reply-to de `web-budget.mail.reply-to-address`. **`send` nunca lança**: uma falha (SMTP fora do ar, template sem assunto) vira um aviso no log, para o e-mail não derrubar quem o pediu. O `MailPlainText` tira o `<head>`, os estilos e todo elemento com `aria-hidden="true"` (marca, pré-cabeçalho, ponto do selo), termina o rótulo de uma linha da ficha (`wb-ledger-label`) com ": " e separa as células de uma linha com espaço.

**Apoio para os e-mails novos:**

- `MailDateFormatter.format(dateTime, language)` converte o `LocalDateTime` do server (fuso do servidor) para `web-budget.mail.time-zone` (`MAIL_TIME_ZONE`, padrão `America/Sao_Paulo`) e escreve `20/11/2026 às 14:32` (pt-BR) ou `Nov 20, 2026, 2:32 PM` (en-US).
- `MailLinkBuilder.build(path, queryParameters)` monta o link do front com `UriComponentsBuilder` e **variáveis de template** (`queryParam(nome, "{nome}")` + `encode()` + `buildAndExpand`). Só assim o `+` do e-mail vira `%2B`: com o valor direto no `queryParam`, o `encode()` o deixa como está.
- A validade dos links sai como duração no arquivo de mensagens ("vale por 5 dias"), não como "válido até" com data e hora sem fuso. A duração vem das constantes `AccountActivationAttempt.VALIDITY_DAYS` e `PasswordRecoverAttempt.VALIDITY_HOURS`, passadas como `{0}` da mensagem, e os links de ativação e de recuperação saem do `MailLinkBuilder`, com o token e o e-mail codificados.

**Avisos de segurança.** Três e-mails avisam o dono da conta de uma mudança de segurança. Os três usam o selo neutro "Segurança" e o rodapé "Você recebe este aviso sempre que algo muda na segurança da sua conta.", saem no idioma do usuário e são publicados pelo `SecurityNoticeNotifier` (`domain/services/administration/`) como `MailMessageRequested`, então só saem depois do commit, e uma operação que falha (token inválido, ação sobre a própria conta) não manda nada. A falha de envio nunca desfaz a operação, porque o `MailSender` não lança. O parâmetro `{0}` do texto de abertura de cada um é o `userName`.

| E-mail | Quando sai | Variáveis |
|---|---|---|
| `password-changed` | `RecoverPasswordService.recover` (`changedBy` = `RECOVERY`, "Pela recuperação de senha" e "Foi você? Então está tudo certo.") e `UserService.resetPassword` (`ADMINISTRATOR`, "Por um administrador" e o texto manda entrar com a senha que o administrador definiu). O botão "Recuperar acesso" leva a `/auth/forgot-password`. O `UserService.updatePassword` não avisa: quem o chama é que decide. | `userName`, `changedAt`, `changedBy`, `recoverUrl` |
| `totp-reset` | `UserService.resetTotp`: diz que os dispositivos confiáveis foram esquecidos e que o próximo acesso mostra o QR code. O botão "Entrar no webBudget" leva a `/login`. | `userName`, `loginUrl` |
| `google-linked` | `AuthService.linkGoogleAccount`, depois de gravar o vínculo. Sem botão: a ficha traz "Quando" e "Conta Google" (o e-mail da conta). | `userName`, `linkedAt`, `userEmail` |

`changedAt` e `linkedAt` já chegam formatados pelo `MailDateFormatter`, no fuso de `web-budget.mail.time-zone`. O texto de "Como" e o de "Foi você?" do `password-changed` vêm das chaves `password-changed.how.<changedBy>` e `password-changed.note.<changedBy>`. O fragmento `notice(lead, text)` de `parts.html` escreve a frase com o começo em negrito ("**Não reconhece a alteração?** Crie uma senha nova…").

**Como acrescentar um e-mail:**

1. Crie `templates/mail/<nome>.html` a partir do `account-approved.html`, usando só os fragmentos de `parts.html`.
2. Acrescente as chaves `<nome>.subject`, `.preheader`, `.footer` e as do corpo ao `messages.properties`, ao `messages_pt_BR.properties` e ao `messages_en_US.properties`, e a `<nome>` à lista do `MailMessagesTest`.
3. Monte o `MailMessage` no serviço que dispara o e-mail (como o `AccountMailNotifier.notifyAccountApproved`) e publique um `MailMessageRequested` com o `ApplicationEventPublisher`.
4. Teste o render nos dois idiomas (como o `MailTemplatesTest`: `lang`, `<title>`, nenhum `th:`, `#{` ou `??` sobrando) e o envio pelo GreenMail (`multipart/alternative` com `text/plain` e `text/html`, assunto em cada idioma). O helper `MimeMessage.contents()` (`src/test/kotlin/.../utilities/MailContents.kt`) devolve o texto puro, o HTML e os tipos multipart.

**Ninguém chama o `MailSender` direto: o serviço publica um evento com o `ApplicationEventPublisher`**: `MailMessageRequested(message)`. O `AccountMailNotifier` monta e publica os e-mails de conta (`notifyAccountActivation`, `notifyPasswordRecovery`, `notifyPendingApproval`, `notifyAccountApproved`, `notifyAccountBlocked` e `notifyAccountUnblocked`), chamado pelo `AccountActivationService`, pelo `RecoverPasswordService` e pelo `UserService` (aprovação, bloqueio, desbloqueio e criação de conta Google). O `MailRequestedListener` tem um método `@Async @TransactionalEventListener(AFTER_COMMIT, fallbackExecution = true)`, então o e-mail só sai depois que a transação que gravou o token (ou o usuário) foi confirmada, e uma transação desfeita não deixa e-mail com link morto. Fora de uma transação, o `fallbackExecution` envia na hora. A mensagem já chega pronta no evento, e o listener não escreve no banco. O `@Async` não vale no perfil `test` (o `AsyncConfiguration` não entra), onde o envio roda síncrono depois do commit e o GreenMail pode ser lido logo em seguida. As propriedades `web-budget.mail.*` (`default-from-address`, `reply-to-address` e `time-zone`) e a `web-budget.frontend-url`, usada para montar os links e o endereço do rodapé, vêm do `application.yaml`.

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

- `POST /private/v1/auth/login` (`email` até 254 caracteres e `password` até 128, em JSON, mais `totpCode` e `trustDevice` opcionais) cria a sessão e responde `SessionView` (`name`, `email`, `status`, `language` e `roles`), ou `202` quando falta o segundo fator (veja [TOTP e dispositivos confiáveis](#totp-e-dispositivos-confiáveis)). `GET /private/v1/auth/session` devolve a mesma `SessionView`, lida do banco a cada chamada, e `POST /private/v1/auth/logout` invalida a sessão. O `language` (`PT_BR` ou `EN_US`) é o `default_language` do perfil: o `CurrentUser` o carrega do usuário lido no banco, então a sessão sempre mostra o idioma atual, inclusive depois de um administrador mudá-lo.
- **Idioma do próprio usuário.** `PATCH /private/v1/auth/language` (`{ "language": "EN_US" }`, `200` com a `SessionView` nova) troca o `default_language` de quem está logado, sem exigir role: vale para qualquer sessão, a de uma conta `PENDING` também, porque é um dado do perfil e não de uma área (a rota fica sob `auth/**`, fora do `RequiresRoleCoverageTest`). Sem sessão responde `401`; valor ausente ou desconhecido (o `JacksonConfiguration` o lê como `null`) responde `422` `field-validation-failed`. O `UserRepository.updateDefaultLanguage` grava só a coluna, com `version + 1`, sem o controle otimista do `update`: trocar o idioma não colide com uma edição do administrador, e não sobe o `credentials_version`, então a sessão continua válida. É também o idioma dos e-mails da conta (veja [E-mails](#e-mails)). A senha é BCrypt com força 11, como na v4.
- **`AuthService.establishSession` é o único caminho que emite sessão.** O login, a confirmação do TOTP e todo login futuro (Google) passam por ele, para que uma regra posta num fluxo não deixe de valer em outro. Ele troca o id da sessão (`changeSessionId`, contra fixação de sessão) e grava o `CurrentUser` como principal, com as autoridades `ROLE_<ROLE>` e `STATUS_<STATUS>`.
- Senha errada e e-mail desconhecido respondem o mesmo `401` `invalid-credentials`, e o e-mail desconhecido gasta o mesmo tempo de um BCrypt. Conta inativa (`active = false`) ou `BLOCKED`, que enviou a senha certa, responde `401` `account-disabled`. Uma conta `PENDING` entra e vê o próprio status, mas as rotas de negócio respondem `403`.

### Contas: auto-cadastro, aprovação e bloqueio

Há dois caminhos de entrada, e os dois terminam no `UserService.createAccount`:

- **Criada pelo admin** (`POST /private/v1/administration/users`): nasce `APPROVED`, com as roles definidas na criação, e é ativada por e-mail (`sendActivationEmail`).
- **Auto-cadastro** (`POST /private/v1/auth/register`, público, `AccountRegistrationService`): `name` (até 100 caracteres, sem caracteres de controle), `email` (até 254), `password` (até **72 bytes** em UTF-8, `@MaxUtf8Bytes`, sem regra de composição: a v4 só exigia não vazia; o limite é o do BCrypt, que no Spring Security 7 lança `IllegalArgumentException` acima disso, então os 128 caracteres da especificação não cabem. O login aceita até 128 caracteres e responde `401` para uma senha maior que o hash, sem erro) e `defaultLanguage` opcional (padrão `PT_BR`). Cria o usuário `PENDING`, inativo e sem roles, e manda o e-mail de ativação. Responde `201` sem corpo **também quando o e-mail já existe** (nada é criado nem enviado, e o BCrypt é gasto do mesmo jeito), para a rota não revelar quem tem conta. A checagem de existência vem antes do insert: capturar o `DataIntegrityViolationException` dentro da transação não serve, porque o Postgres a aborta.
- **Ativar não aprova.** Depois de ativada por e-mail, a conta continua `PENDING` até um admin aprová-la; quem entra nesse meio-tempo só enxerga `/auth/session` e `/auth/logout`. Os admins são avisados (e-mail `user-pending-approval`) **quando a conta é ativada**, e não no cadastro: assim só e-mail confirmado chega ao admin, e a rota pública não vira um jeito de encher a caixa de entrada dele. Os destinatários são os usuários `APPROVED`, ativos e com a role `ADMINISTRATION` (`UserRepository.findApprovedAdministrators`).
- **Aprovar já com as áreas, numa operação só** (`PATCH /{id}/approve`, `200`): o corpo é `{ "roles": ["REGISTRATION", "FINANCIAL"] }`, com pelo menos uma área. O `UserService.approve` grava os grants (troca os que a conta já tinha) e passa `PENDING` → `APPROVED` na mesma transação, então uma falha em qualquer passo deixa a conta `PENDING` e sem os grants novos, e o e-mail `account-approved` só sai depois do commit. Corpo ausente, `roles` nulo ou vazio e área desconhecida (ou um elemento nulo) respondem `400` `field-validation-failed`, com `parameters.roles` igual a `is-empty` ou `unknown-role` (e `parameters.unknown` com os nomes). É `400` e não `422` de propósito, por decisão da #98; as outras validações de corpo continuam `422`. A ordem é: conta existe (`404`), não é a própria (`400` `self-action-not-allowed`), está `PENDING` (`409`), áreas válidas (`400`).
- **Transições de status** (`UserController`, `PATCH /{id}/block|unblock`, `200` sem corpo; a aprovação está no item acima): aprovar é só `PENDING` → `APPROVED`; bloquear é só `APPROVED` → `BLOCKED`; desbloquear é só `BLOCKED` → `APPROVED`. Qualquer outra origem responde `409` `invalid-user-status-transition`. Como bloquear só parte de `APPROVED`, um `BLOCKED` sempre já foi aprovado, e desbloquear nunca pula a aprovação. A transição é um `UPDATE ... WHERE status = ? AND version = ?` (`UserRepository.updateStatus`). **Bloquear também sobe o `credentials_version`**, então as sessões abertas morrem na próxima requisição com `401` `session-revoked` e o login passa a responder `account-disabled`.
- **O admin não age sobre a própria conta**: aprovar, bloquear, resetar a senha (`update-password`), resetar o TOTP (`totp-reset`), remover, trocar as roles ou desativar respondem `400` `self-action-not-allowed`. O `SelfActionGuard` compara o `externalId` da sessão com o do alvo e não faz nada quando não há sessão (bootstrap, testes), e as regras moram no `UserService`. Trocar nome e idioma da própria conta continua valendo. A recuperação de senha por e-mail usa o `UserService.updatePassword`, que não passa pelo guard.
- `GET /administration/users` aceita `userStatus` (`PENDING`, `APPROVED`, `BLOCKED`) além do `status` (ativo/inativo) de antes, e o `UserView` traz o `status` da conta, para o admin achar quem espera aprovação.

### TOTP e dispositivos confiáveis

O segundo fator vem do investlog (app autenticador, SHA-1, 6 dígitos, 30 s, janela de ±1 passo; issuer `webBudget`) e fica atrás de `web-budget.security.totp.required` (`TOTP_REQUIRED`, padrão `true`; os profiles `dev` e `test` usam `false`). Com `false` o login ignora o TOTP e nenhum endpoint muda.

- **Login em etapas, sem sessão até o fim.** `POST /auth/login` confere a senha (limitadores e conta desativada como sempre) e só então olha o segundo fator, na ordem: TOTP desligado no sistema → sessão; usuário sem TOTP → `202` `{"status": "needs_enrollment"}`; cookie de dispositivo confiável válido do próprio usuário → sessão; sem `totpCode` → `202` `{"status": "needs_totp"}`; código errado → `401` `invalid_totp_code`; código certo → sessão (e, com `trustDevice: true`, o cookie do dispositivo). `LoginResult` (`Authenticated`, `EnrollmentRequired`, `TotpRequired`) é o que o `AuthService.login` devolve, e o `establishSession` continua o único que emite sessão.
- **Cadastro do TOTP.** `POST /auth/totp/enroll` (`email` e `password`) confere a senha, grava um segredo novo (`users.totp_secret`, com `totp_enabled = false`) e responde `secretKey` e `qrCodeDataUri` (PNG em data URI). Chamar de novo troca o segredo ainda não confirmado. `POST /auth/totp/verify` (`email`, `password` e `code`) confirma o primeiro código, marca `totp_enabled = true` e **já abre a sessão** (`SessionView`). Os dois respondem `409` `totp_already_enabled` quando o TOTP já está ligado e valem mesmo com `required = false`. Como os dois são públicos (a sessão ainda não existe), a identificação é por e-mail e senha, e o CSRF continua valendo.
- **O segredo fica em texto puro** em `administration.users.totp_secret`, como no investlog; cifrá-lo em repouso fica para depois. Ele só sai do banco por `UserRepository.findTotpSecret` e `updateTotpSecret`/`enableTotp`/`resetTotp`: não está em `User`, `CurrentUser` (que é serializado na sessão), nem em nenhum payload ou log. O `UserView` traz só `totpEnabled`. Quem tem a senha de uma conta ainda sem TOTP pode cadastrá-lo antes do dono (e deixá-lo de fora até o admin resetar); é o custo de exigir o cadastro no primeiro login.
- **Dispositivos confiáveis** (`TrustedDeviceService`, tabela `administration.trusted_devices`). Com `trustDevice: true` e o código certo, o servidor sorteia 32 bytes (`SecureRandom`), guarda **só o SHA-256 em hex** (`token_hash`, único) e manda o token no cookie `trusted_device`: `HttpOnly`, `SameSite=Lax`, `Path=/private/v1/auth`, `Max-Age` igual à validade e `Secure` quando a requisição é https. A validade é `web-budget.security.trusted-device.expiry` (`TRUSTED_DEVICE_EXPIRY`, padrão 30 dias), fixa na criação (o uso só atualiza `last_used_on`, não renova). O cookie só é lido depois da senha conferida e só vale para o dono: a busca é por hash **e** `id_user` **e** `expires_on` futuro, então o cookie de outro usuário, o desconhecido e o vencido caem em `needs_totp`. Criar um dispositivo apaga os vencidos do usuário. O rótulo (`DeviceLabel`, navegador · sistema) sai do `User-Agent`.
- `GET /auth/trusted-devices` lista os da sessão (`id`, `label`, `createdOn`, `lastUsedOn`, `expiresOn`), `DELETE /auth/trusted-devices/{id}` revoga um (`404` se não for do usuário) e `DELETE /auth/trusted-devices` revoga todos. Valem para qualquer sessão, inclusive a de conta pendente.
- **Reset pelo admin**: `PATCH /administration/users/{id}/totp-reset` (`200`, só `ADMINISTRATION`, nunca na própria conta) limpa o segredo, desliga o TOTP e apaga os dispositivos do usuário **na mesma transação**; no próximo login ele cai em `needs_enrollment`. Trocar a senha e bloquear não apagam os dispositivos (um dispositivo só dispensa o código depois da senha certa, e o bloqueio já barra o login); a sessão aberta também não cai no reset. Apagar a conta apaga os dispositivos antes do usuário.
- **Limite do TOTP**: `TotpAttemptLimiter` (e-mail+IP, `web-budget.security.totp.lockout.*`, `TOTP_LOCKOUT_MAX_ATTEMPTS` e `TOTP_LOCKOUT_BASE_DURATION`, padrão 5 falhas e 60 s) é separado do de senha, então uma senha certa não zera o contador do código; um código certo zera. Todo código errado soma também no `IpAttemptLimiter`. Responde `429` `too_many_totp_attempts` (par) ou `too_many_login_attempts` (IP), inclusive com o código certo. A checagem do par acontece quando o código é conferido, depois da senha.
- Códigos de erro (snake_case, como os limites, para o client comparar o literal): `invalid_totp_code` (`401`), `totp_already_enabled` (`409`) e `too_many_totp_attempts` (`429`). Um código usado pode ser reaproveitado na mesma janela de 30 s (sem proteção de replay).

### Login com Google

O Google fica **desligado por padrão**: com `web-budget.google-auth.enabled` falso (`GOOGLE_AUTH_ENABLED`) o bean `ClientRegistrationRepository` não existe, o `oauth2Login` não entra na cadeia de filtros, `/private/oauth2/authorization/google` responde `404`, `POST /auth/google/link` responde `404` e nenhum endpoint muda. As propriedades são do `GoogleAuthProperties` (`web-budget.google-auth.*`): `GOOGLE_AUTH_ENABLED`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` e `CLIENT_BASE_URL` (padrão `web-budget.frontend-url`), para onde o server redireciona o navegador ao fim do fluxo. O starter é o `spring-boot-starter-oauth2-client`, e o cliente é o `CommonOAuth2Provider.GOOGLE` (sem descoberta OIDC pela rede na subida, então o server sobe offline e não depende do Google). O fluxo mora sob `/private` para passar pelo proxy do Vite: o navegador começa em `/private/oauth2/authorization/google`, o Google volta em `{baseUrl}/private/login/oauth2/code/google` (é essa a URI de redirecionamento a cadastrar no console do Google) e as duas rotas são públicas.

- **`GET /private/v1/auth/config`** (público) responde `{"googleAuthEnabled": true|false}`; é com ele que a tela de login decide mostrar o botão.
- **O `GoogleLoginSuccessHandler` exige `email_verified` igual ao booleano `true`**, mais `sub` e `email` não vazios; qualquer outra coisa (ausente, `false`, a string `"true"`) é falha de login e não cria, entra nem vincula nada, para que um e-mail não verificado nunca reivindique a conta local de outra pessoa. Os redirecionamentos de erro são `CLIENT_BASE_URL/login?error=oauth_failed` e `CLIENT_BASE_URL/login?error=email_in_use&linkToken=…`; o e-mail nunca vai na URL. **Em todo ramo que não abre sessão o handler limpa o `SecurityContext` e invalida a sessão**: o Spring já gravou nela um `OAuth2AuthenticationToken`, e o `CurrentUserProvider` espera um `CurrentUser`.
- **`AuthService.handleGoogleLogin`** procura primeiro por `google_sub`: conta já vinculada entra pelo `establishSession` **sem pedir o TOTP** (o segundo fator é o próprio Google), desde que esteja ativa e não `BLOCKED` (senão `oauth_failed`). Sem `sub`, procura o e-mail **sem diferenciar maiúsculas** (`findByEmailIgnoreCase`, porque o `findByEmail` é exato). Nenhuma conta: `UserService.createGoogleAccount` cria o usuário `PENDING`, **ativo** (o Google já verificou o e-mail, então não há e-mail de ativação), com `auth_provider = GOOGLE`, `google_sub`, **sem senha e sem roles**, e avisa os admins pelo `AccountMailNotifier.notifyPendingApproval`, o mesmo caminho do auto-cadastro. Ele abre uma sessão `PENDING`, que só enxerga `/auth/session` e `/auth/logout`. O nome vem do atributo `name` (sem caracteres de controle, até 100 caracteres, ou a parte local do e-mail). Conta de um `auth_provider` que não é `LOCAL` com outro `sub`: `oauth_failed`, sem oferecer vínculo.
- **E-mail de conta local: não loga, emite um `linkToken`.** O `GoogleLinkTokenStore` (em memória, 10 minutos, 32 bytes aleatórios; some ao reiniciar e não vale entre instâncias) guarda o **`externalId` da conta local e o `sub` do Google**, não o e-mail: se a conta for apagada e o e-mail cadastrado de novo dentro da validade, o token não serve à conta nova.
- **`POST /private/v1/auth/google/link`** (público, CSRF valendo; `linkToken`, `password` e `totpCode` opcional): 1) `peek` do token (desconhecido ou vencido: `400` `invalid_google_link_token`); 2) confere a senha da conta do token pelo mesmo `verifyCredentials` do login (limitadores de IP e de e-mail+IP, `401` `invalid-credentials`, `401` `account-disabled`); 3) com `totp.required`, TOTP ativo e dispositivo não confiável, pede o código: sem `totpCode` responde `202` `{"status": "needs_totp"}` **e mantém o token**, com código errado `401` `invalid_totp_code`; 4) só então consome o token (o `remove` é atômico, então duas requisições certas ao mesmo tempo não vinculam duas vezes) e confere que a conta ainda é `LOCAL` e o `sub` ainda não é de outra conta; 5) `UserRepository.linkGoogleAccount` grava o `google_sub`, passa a conta a `GOOGLE`, **apaga a senha e sobe o `credentials_version`** (as outras sessões da conta caem com `401` `session-revoked`), e a sessão nova sai do `establishSession` com o `CurrentUser` montado da linha devolvida, já com a versão nova. **Senha errada, código errado e conta desativada queimam o token** (o usuário refaz o login com o Google); o bloqueio por excesso de tentativas (`429`) e o `needs_totp` não queimam.
- **Vincular troca a conta para o Google**: sem senha, o login local responde `401` `invalid-credentials` (o `verifyCredentials` trata hash nulo como senha errada e ainda gasta o BCrypt, e **não aceita nem a senha de usuário desconhecido**), e os logins seguintes pelo Google não pedem TOTP. O `administration.users.password` aceita `NULL` só para `auth_provider = GOOGLE` (a constraint `ck_users_on_password_or_google` impede uma conta local sem senha); a recuperação de senha por e-mail ainda pode dar uma senha a uma conta Google, e ela volta a entrar por senha (e TOTP, se ligado). `google_sub` é `UNIQUE`.
- Não há avatar: o investlog guarda o `picture`, aqui não há coluna para ele.

### Limites de tentativa

Login e cadastro são protegidos por três contadores em memória, todos `AttemptLockoutTracker` (bloqueio progressivo: ao chegar em `max-attempts` falhas, bloqueia por `base-duration` e dobra a cada novo bloqueio, até 32 vezes a duração base; `failure-window` faz falhas antigas deixarem de contar; um sucesso apaga o contador da chave). O estado vive na memória do processo, como a sessão, e some ao reiniciar. Um expurgo oportunista (no máximo uma vez por minuto, dentro de `recordFailure`) apaga as chaves sem bloqueio e sem falha há mais de uma hora, porque as chaves vêm de e-mail e IP que o atacante escolhe e o mapa não pode crescer sem limite.

| Limitador | Chave | Padrão (`web-budget.security.*`) |
|---|---|---|
| `LoginAttemptLimiter` | e-mail (minúsculo, sem espaços) + IP | `login`: 5 falhas, 60s |
| `IpAttemptLimiter` | IP, inclusive para e-mails que não existem | `ip-lockout`: 20 falhas, 60s, janela de 15 min |
| `RegistrationAttemptLimiter` | IP, conta toda tentativa de cadastro | `registration-limit`: 10 tentativas, 15 min, janela de 1h |
| `TotpAttemptLimiter` | e-mail (minúsculo, sem espaços) + IP, só códigos TOTP | `totp.lockout`: 5 falhas, 60s (veja [TOTP](#totp-e-dispositivos-confiáveis)) |

- O `AuthService.login` checa o IP e o par e-mail+IP **antes** de buscar o usuário e de gastar o BCrypt, então um par bloqueado leva `429` mesmo com a senha certa. Uma falha de credencial (inclusive e-mail desconhecido) soma nos dois contadores; um login bem-sucedido apaga só o do par e **não zera o do IP**. A conta `account-disabled` não conta como falha, porque a senha estava certa.
- As respostas são `429` com `error` `too_many_login_attempts` ou `too_many_registration_attempts` (snake_case, como o `pending_approval`, porque o client compara o literal).
- As propriedades são do `SecurityProperties` (`@ConfigurationProperties("web-budget.security")`, em `infrastructure/config/security/`) e vêm das variáveis `LOGIN_LOCKOUT_MAX_ATTEMPTS`, `LOGIN_LOCKOUT_BASE_DURATION`, `IP_LOCKOUT_*`, `REGISTRATION_LIMIT_*` e `CLIENT_IP_TRUSTED_PROXY_COUNT`. O perfil de teste usa 1000 em todos os limites (e `totp.required: false`).
- **O IP vem do `ClientIpResolver`**, e a configuração é um par que precisa ficar coerente. Com `trusted-proxy-count: 0` (padrão) o IP é o `remoteAddr` e o `X-Forwarded-For` é ignorado, porque o cliente o forja. Com `N > 0` o resolver lê todas as linhas do `X-Forwarded-For`, acrescenta o `remoteAddr` e toma a entrada `N` contando de trás para a frente (a que o proxy mais externo de confiança anexou), então endereços postos pelo cliente no começo da cadeia não valem; cadeia mais curta que `N`, ou entrada que não parece um IP, cai no `remoteAddr`. **Não deixe o Tomcat e o resolver tirarem proxies da mesma cadeia**: o perfil `prod` liga `forward-headers-strategy: native` (o `RemoteIpValve`) com `server.tomcat.remoteip.remote-ip-header: X-Real-IP` (`REMOTE_IP_HEADER`), e então o valve já troca o `remoteAddr` pelo IP real e o resolver fica em `0`. Se o proxy só anexa ao `X-Forwarded-For`, aponte o `remote-ip-header` para um header que ele não manda e use `CLIENT_IP_TRUSTED_PROXY_COUNT` com o número de proxies. O valve só confia em proxies de rede privada por padrão; um proxy fora dela exige `server.tomcat.remoteip.internal-proxies`, ou todo mundo vira o mesmo IP e se bloqueia junto.
- O cookie é o `JSESSIONID`, com `HttpOnly`, `SameSite=Lax` e timeout de 30 minutos (`server.servlet.session`, o mesmo valor que o client usa). O `Secure` quem põe é o Tomcat quando a requisição chega por https, e o perfil `prod` liga `server.forward-headers-strategy: native` para que ele enxergue o https que o proxy terminou.

### O que a sessão guarda e o que o banco decide

O principal da sessão (`CurrentUser`, com `externalId`, `status`, `credentialsVersion` e as roles) é só uma foto do login. As autoridades dela alimentam apenas as regras de caminho do `SecurityConfiguration`, que são a primeira barreira: uma role **acrescentada** vale no próximo login, e uma role **removida** continua passando por essa barreira até a sessão acabar. Por isso o que decide de verdade é a leitura viva:

- **`CurrentUserProvider.getCurrentUser()`** (implementação `SecurityContextCurrentUserProvider`) relê o usuário no banco **por `externalId`**, a cada chamada, e recarrega as roles dos grants. Por `externalId`, e não por e-mail, porque o admin edita o e-mail e porque um e-mail apagado e cadastrado de novo é outra conta: a sessão da conta antiga não pode servir a nova. Falhas: sem sessão `401` `unauthenticated`; conta apagada, inativa ou com `credentials_version` diferente `401` `session-revoked` (e o entry point invalida a sessão); `status` diferente de `APPROVED` `403` `pending_approval`.
- **`getSessionUser()`** faz as mesmas checagens menos a de aprovação. É o que o `GET /auth/session` usa, para que um usuário pendente ou bloqueado ainda consiga ler o próprio status.
- **Toda rota de negócio leva `@RequiresRole(Role.X)`**, no controller ou no método. A anotação é um `@PreAuthorize("@roleGuard.hasRole('{role}')")` (meta-anotação com `AnnotationTemplateExpressionDefaults`), e o `RoleGuard` consulta o `CurrentUserProvider`: sem a role responde `403` `forbidden`, e os erros acima viram os mesmos `401` e `403`. Um controller novo sem `@RequiresRole` só tem a barreira cacheada do caminho, que **não enxerga bloqueio, remoção de role nem troca de senha**.- **`credentials_version` sobe em toda troca de senha**, e isso mora no repositório: `UserRepository.updatePassword` é o único jeito de gravar a senha, e o `update` genérico nem escreve `password`. Assim o admin, a recuperação por e-mail e qualquer fluxo futuro invalidam as outras sessões sem depender de lembrar de incrementar. O admin não troca a própria senha por `update-password` (veja [Contas](#contas-auto-cadastro-aprovação-e-bloqueio)), então não há sessão própria para reemitir.
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

O Liquibase cria e evolui o schema na subida da aplicação (no `bootRun` e nos testes). O master é `src/main/resources/db/changelog/db.changelog-master.xml`, e as tabelas de controle se chamam `database_changelog` e `database_changelog_lock`. Os changelogs vivem em `src/main/resources/db/changelog/changes/<ano>/<mês>/`, e o master os inclui em ordem cronológica. O changelog inicial é o schema final da v4, consolidado sem Investimentos; os arquivos seguintes (`ls src/main/resources/db/changelog/changes/*/*`) acrescentam a sessão, o TOTP e o login com Google. As roles `DASHBOARDS`, `REGISTRATION`, `FINANCIAL` e `ADMINISTRATION` entram por changelog, com os mesmos `external_id` da v4.

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

- JUnit 5 (vem dos starters de teste do Spring Boot), `useJUnitPlatform()` e `maxParallelForks = 4`. O número de forks é limitado para evitar disputa no Docker quando vários forks sobem um contêiner do Testcontainers ao mesmo tempo.
- `TestcontainersConfiguration` registra um Postgres `postgres:18-alpine` como `@ServiceConnection`, e os testes de integração o recebem do `BaseIntegrationTest`, que já o importa. O Docker precisa estar ligado para rodar os testes.
- Os testes de integração rodam contra esse Postgres real, sem MockK nem outro framework de mock de objetos. O que na v4 era teste de controller com mock é teste de integração: a chamada passa pelo controller, pelo serviço e pelo repositório de verdade.
- **Todo teste de integração estende `BaseIntegrationTest`**: `@SpringBootTest` com servidor de verdade (`RANDOM_PORT`, porque o MockMvc não devolve nem reenvia o cookie de sessão), `@AutoConfigureRestTestClient`, perfil `test` e o `@Import` do `TestcontainersConfiguration`, do `MailTestConfiguration` e do `RestClientTestConfiguration`. As classes compartilham o mesmo contexto (um contêiner Postgres por fork), então **não use `@DirtiesContext`** nem configuração própria por classe. A única exceção é o contexto da anotação de teste `@TotpAndGoogleEnabled`, que carrega o `@TestPropertySource` com `totp.required=true`, limites baixos de TOTP e de IP e o Google ligado (`web-budget.google-auth.*`, com `client-base-url=http://client.test`); as duas classes que o usam, `TotpAuthenticationTest` e `GoogleAuthenticationTest`, compartilham esse contexto. Como o `BaseIntegrationTest` loga o admin antes de cada teste e o admin passa a exigir o código, o `TotpAuthenticationTest` sobrescreve `loginBeforeEach()` para ligar o TOTP do admin com um segredo conhecido e entrar com o código (`login(email, senha, totpCode)`), e desfaz isso no fim; o `GoogleAuthenticationTest` sobrescreve o mesmo método para ficar anônimo (`authenticateAnonymously()`). Os códigos dos testes saem do `DefaultCodeGenerator` da própria biblioteca sobre o segredo lido do banco. **O provedor do Google é simulado chamando o `GoogleLoginSuccessHandler` direto**, com um `OAuth2AuthenticationToken` montado sobre um `DefaultOAuth2User` (os atributos do teste são os do Google: `sub`, `email`, `email_verified`, `name`), um `MockHttpServletRequest` com `MockHttpSession` e um `MockHttpServletResponse`; o `linkToken` sai do `Location` do redirecionamento e vai para `POST /auth/google/link` pelo `restTestClient`. Nenhum teste fala com o Google nem usa credencial real. O caso desligado roda no contexto padrão (`GoogleAuthDisabledTest`), e o `GoogleLinkTokenStore` tem teste unitário com o `MutableClock` para a validade. O `RestTestClient` (`restTestClient`) fala com o Tomcat local, com a cadeia do Spring Security inteira, e as URLs são as reais, com `/private/v1` (o `Location` de um `201` leva a porta aleatória).
- **A autenticação dos testes é login real**, num helper só, no `BaseIntegrationTest`: cada teste começa logado como o admin da subida (todas as roles, senha `test-admin-password`, de `web-budget.security.admin-default-password` no `application-test.yaml`). `authenticateWithRoles(...)` cria (e apaga no fim do teste) um usuário só com as roles pedidas e faz login com ele, `authenticateAnonymously()` fica só com o cookie `XSRF-TOKEN`, `authenticateAs(email, senha)` troca a sessão e `login(email, senha)` devolve o cabeçalho `Cookie` de uma sessão nova sem trocar a do teste (para enviar com `.header("Cookie", ...)`, como nos testes de revogação). `createLoginUser(...)` cria um usuário que entra no login e que o `BaseIntegrationTest` apaga ao fim. O `RestClientTestConfiguration` põe no `RestTestClient` um interceptor que reenvia o cookie da sessão atual e copia o `XSRF-TOKEN` para o header `X-XSRF-TOKEN` das escritas; o header `X-Test-Skip-Csrf-Token` desliga só essa cópia, para testar o `403` de CSRF. Os testes de login, revogação e acesso por área estão em `AuthControllerTest` e `SessionRevocationTest`.
- **Testes de limite de tentativa**: o contexto é compartilhado e todo teste chega de `127.0.0.1`, então um limite estourado nesse IP derrubaria os testes seguintes do fork. O perfil `test` põe os limites em 1000 e `client-ip.trusted-proxy-count: 1`, e cada teste de limite manda o próprio `X-Forwarded-For` (`203.0.113.x`, um IP por teste) e planta as falhas direto nos limitadores (`LoginAttemptLimiter`, `IpAttemptLimiter`, `RegistrationAttemptLimiter`), lendo o máximo do `SecurityProperties` em vez de fixar o número. O que depende do tempo (janela, bloqueio progressivo, expurgo) é teste unitário do `AttemptLockoutTracker` com o `MutableClock` de `src/test/kotlin/.../utilities`, porque o contexto compartilhado não troca o `Clock`. O `ClientIpResolver` tem teste unitário com `MockHttpServletRequest`.
- **O e-mail dos testes** é um `GreenMail` com porta dinâmica (nunca fixa, por causa dos forks em paralelo), exposto como o bean `greenMail`. O `BaseIntegrationTest` limpa as caixas antes de cada teste, e o teste lê `greenMail.receivedMessages`.
- **Dados de teste são SQL em `src/test/resources/sql/<módulo>/`**, carregados com `@Sql`. O `clear-tables.sql` apaga só o que o teste cria e **preserva as quatro roles do changelog e o admin criado na subida**; as roles de teste (`ANY_ROLE` e afins) e os usuários de teste entram por `create-authorities.sql` e `create-user.sql`, referenciando as roles do changelog pelo nome, sem ids fixos de coluna de identidade. Um módulo novo traz os seus próprios arquivos e o seu `clear-tables.sql`. Os testes do `financial` precisam de linhas de `registration` (período, classificação e centro de custo) e as criam em `sql/financial/create-registration-data.sql`, com ids na faixa 9101 em diante; o `clear-tables.sql` do módulo roda antes **e depois** de cada teste (`@Sql(..., executionPhase = AFTER_TEST_METHOD)`) e apaga essas linhas, para que as chaves estrangeiras dos movimentos não travem a limpeza de outro módulo.
- Um controller que só existe para os testes (como o `ErrorProbeController`, que exercita o `ExceptionHandlerAdvice`) fica em `src/test/kotlin`, no pacote que ele testa.
- `TestServerApplication` é um `main` alternativo que sobe a aplicação com o `TestcontainersConfiguration`, contra um Postgres descartável.

O Kover mede a suíte, e o `koverVerify` impõe pisos sobre ela em `kover.reports.verify`, no `build.gradle.kts`. Os filtros excluem `ServerApplication`, `ServerApplicationKt` e o pacote gerado `br.com.webbudget.server.jooq`, e valem igual para os relatórios XML e HTML e para o `koverVerify`.

**Os pisos de LINE, INSTRUCTION e BRANCH só sobem** (hoje 99, 99 e 91, no `build.gradle.kts`). Um PR pode subir um número até o que a suíte atinge, arredondado para baixo, e nunca baixá-lo: baixar um piso é a cara de uma regressão de cobertura num diff. Com os pisos no que a suíte atinge, um PR que traz código de produção sem teste fica vermelho, então os testes entram junto com a funcionalidade. O ramo de `totp.required = false` do vínculo com o Google não tem como ser exercido, porque o perfil de teste só liga o Google junto com o TOTP obrigatório.

## Manutenção deste arquivo

Todo PR que muda algo descrito aqui atualiza este arquivo no mesmo PR.
