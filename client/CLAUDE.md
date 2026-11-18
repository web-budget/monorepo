# CLAUDE.md

Este arquivo orienta o Claude Code no `client/`, o frontend do webBudget: Vue 3 com `<script setup>` e TypeScript 6.0, Vite 8, Vue Router 5, Pinia 4, vue-i18n 11, axios, shadcn-vue (Reka UI e Tailwind 4), vee-validate com Zod, Vitest 5, ESLint 10, oxlint e Prettier, sobre Node 24 e pnpm 12. O alias `@` aponta para `src/`. As regras do repositório inteiro (issues, branches, PRs, idioma, comentários no código, como ativar o Node e o pnpm nesta máquina e a proibição de subir os servidores de desenvolvimento do usuário) estão no `CLAUDE.md` da raiz e valem aqui também.

## Comandos

O `engines.node` do `package.json` exige o Node 24.15 ou mais novo, e o `packageManager` fixa o pnpm 12.21.0. Rode tudo a partir de `client/`:

```bash
pnpm install         # instala as dependências (o CI usa --frozen-lockfile)
pnpm dev             # Vite em http://localhost:8086, com proxy de /private para http://localhost:8085
pnpm build           # roda type-check e build-only em paralelo; falha se qualquer um falhar
pnpm type-check      # vue-tsc --build sobre as referências do tsconfig.json (app, node e vitest)
pnpm test            # Vitest em modo watch num terminal interativo: não termina sozinho
pnpm test:run        # Vitest numa passada só
pnpm test:coverage   # Vitest numa passada só com cobertura v8, grava client/coverage/ e confere o piso
pnpm lint            # oxlint . --fix, depois eslint . --fix --cache
pnpm format          # prettier --write em src/ inteiro (veja a regra do Prettier abaixo)
```

O `vite.config.ts` fixa a porta 8086 com `strictPort: true`: se ela estiver ocupada, o `pnpm dev` falha em vez de escolher outra porta. A 8086 é do servidor de desenvolvimento do usuário; para verificar algo, suba um Vite descartável com `pnpm dev --port <outra>` e pare-o depois (regra da raiz). O proxy de `/private` continua apontando para a 8085, e com o server parado as chamadas a `/private` respondem 502.

O `pnpm test` só fica em modo watch quando o terminal é interativo (TTY). Sem TTY, ou com `CI=true`, o Vitest cai para uma passada só e termina. Não conte com isso: em scripts, no CI e nas verificações do Claude use `pnpm test:run` ou `pnpm test:coverage`, que nunca ficam esperando.

O CI (job `test-client` de `.github/workflows/ci.yml`) roda `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm build` e `pnpm test:coverage`, nessa ordem. Rode os três últimos antes de abrir um PR que mexe no `client/`. O CI não confere o Prettier, e o ESLint usa o `eslint-config-prettier`, então o `pnpm lint` também não reclama de formatação.

**O Prettier roda só nos arquivos que você tocou.** Formate o que mudou com `pnpm exec prettier --write <arquivos>`, nunca com `pnpm format` nem com `prettier --write src/` num PR. O `src/` está formatado hoje, mas um formatador rodado na árvore inteira espalha pelo diff mudanças em arquivos que o PR não tem motivo para tocar, e elas precisam ser desfeitas à mão. Se um arquivo tocado já estava fora do padrão no `HEAD`, mantenha formatados só os seus próprios trechos em vez de reformatar o arquivo inteiro. O estilo vem do `.prettierrc.json`: sem ponto e vírgula, aspas simples e 100 colunas.

O `tsconfig.app.json` estende o `@vue/tsconfig` (que já liga o `strict`) e acrescenta `noUncheckedIndexedAccess`, `noUnusedLocals` e `noUnusedParameters`, então um import ou uma variável sem uso quebra o `pnpm build` e o `pnpm type-check`. Os testes são checados pelo `tsconfig.vitest.json`, e o `tsconfig.app.json` os exclui.

**O TypeScript fica na linha 6.0.** O TS 7 não serve aqui: ele deixou de exportar `typescript/lib/tsc`, o que derruba o `vue-tsc` 3, e o typescript-eslint se recusa a carregar com ele (o peer dele é `>=4.8.4 <6.1.0`). O TS 6.0 é a linha que as duas ferramentas suportam, por isso o `package.json` pede `~6.0.0`. Pelo mesmo motivo nenhum `tsconfig` tem `baseUrl`: o TS 6 rejeita a opção com o erro TS5101, e o alias `@/*` não precisa dela, então não a acrescente.

## Testes

**Arquivos de teste terminam em `.test.ts`, nunca em `.spec.ts`.** O `vite.config.ts` fixa `test.include` em `src/**/*.test.ts`, então um arquivo com outro sufixo nunca roda, e ninguém percebe. Os testes ficam **ao lado** do código que cobrem; não existem diretórios `__tests__/`, e nenhum deve ser criado.

O ambiente é o `jsdom`, e o `src/test/setup.ts` roda antes de cada arquivo (`test.setupFiles`) com o `enableAutoUnmount(afterEach)`, então nenhum teste precisa desmontar o que montou. Os `globals` do Vitest estão desligados: importe `describe`, `it`, `expect` e `vi` de `'vitest'` em cada arquivo. O `setup.ts` também põe no jsdom o que o shadcn-vue e o Reka UI esperam e ele não tem (`ResizeObserver`, `matchMedia` e `scrollIntoView`), e o `src/test/mounting.ts` tem os helpers de montagem: `createTestPlugins()` devolve o router (em memória), o `createTestingPinia` e o i18n prontos para o `global.plugins`, e o `mountInSidebar()` monta um componente dentro do `SidebarProvider`, que o menu lateral e a barra superior exigem. Menus e diálogos do Reka UI vão para o `document.body`: monte com `attachTo: document.body` e procure o conteúdo lá, e abra o menu do usuário com `keydown` Enter, porque o `pointerdown` não abre no jsdom.

O Pinia tem uma regra que decide sozinha:

| O teste | Usa |
|---|---|
| monta um componente | `createTestingPinia()` do `@pinia/testing`, passado em `global.plugins` |
| exercita um store ou um composable direto | `setActivePinia(createPinia())` no `beforeEach` |

O `createTestingPinia()` troca todas as ações por spies, que é o que um teste de componente quer: as ações viram algo para conferir e nenhuma chamada à API escapa. Passe `{ stubActions: false }` só quando o comportamento testado *é* a ação de verdade rodando. Os testes de store mockam o módulo da API com `vi.mock('@/api/<recurso>')`, como em `src/stores/auth.test.ts`.

Duas armadilhas disso: sob o `createTestingPinia`, `hasRole` do `auth` também vira spy, então um teste de componente ou de guard que depende de role precisa de `vi.mocked(auth.hasRole).mockImplementation(...)`, senão toda seção some. E o store `auth` importa o router, então o `auth.test.ts` mocka `@/router` com `vi.mock`.

Confira o que aparece na tela, os eventos emitidos e as interações do usuário, nunca o `wrapper.vm` ou métodos privados, que prendem o teste à implementação e quebram na primeira refatoração. Nada de teste só de snapshot: um snapshot que ninguém lê continua passando com a funcionalidade quebrada.

A cobertura é medida pelo `pnpm test:coverage` (provider v8, relatório em `client/coverage/`) e **imposta**: `coverage.thresholds` no `vite.config.ts` define um piso para statements, lines, functions e branches, e o CI roda esse comando, então um PR que derruba qualquer um dos quatro abaixo do piso quebra o build. O piso hoje é **100% nos quatro**. Ficam fora do conjunto medido os arquivos de teste, `src/test/**`, `src/main.ts`, `src/types.ts`, `src/api/**` e `src/components/ui/**` (o código que a CLI do shadcn-vue gera).

**A catraca:** um PR pode subir esses números, nunca baixar. Um PR que acrescenta testes pode subir cada piso até o valor inteiro (arredondado para baixo) que o seu próprio `pnpm test:coverage` reporta; um PR que não muda a cobertura deixa os números como estão. A única forma de fazer uma queda de cobertura passar no CI é baixar um piso, e um PR nunca faz isso. Com o piso em 100, a regra que vale na prática é essa: código novo chega com os testes que o cobrem por inteiro, inclusive os dois lados de cada `?.` e `??` que o v8 conta como branch.

## Convenções de código

**Nada de nomes abreviados.** Use nomes completos e descritivos para variáveis, props, iteradores de laço e variáveis locais de composables.

| Evite | Use |
|---|---|
| `w in wallets` | `wallet in wallets` |
| `cc`, `fp` | `costCenter`, `financialPeriod` |
| `qty`, `pct`, `amt` | `quantity`, `percentage`, `amount` |
| `res`, `err`, `e` | `response`, `error` |

**Código não leva comentários.** É a regra da raiz e vale aqui: se algo precisa de comentário, renomeie ou reestruture. A única exceção é um porquê não óbvio que o código não consegue expressar, como o contorno de um bug de dependência.

Componentes usam a Composition API com `<script setup lang="ts">`, na ordem `<script>`, `<template>`, `<style>`. Stores são escritos no estilo de composição do Pinia (`defineStore('nome', () => { ... })`).

## Arquitetura

O client fala só com o server do monorepo, pela mesma origem: em desenvolvimento, o Vite encaminha `/private` para a 8085. Não há CORS, não há URL de API configurável por variável de ambiente e não há token no client.

O client tem as camadas não visuais (#19) e a base visual (#22): shadcn-vue, o shell com as rotas por seção e os componentes compartilhados. As telas de autenticação e de erro (#23) existem (veja [Telas de autenticação e de erro](#telas-de-autenticação-e-de-erro)) e os cinco cadastros (#24) também (veja [Cadastros](#cadastros)), assim como a administração de usuários (#32, veja [Administração de usuários](#administração-de-usuários)); as páginas iniciais de cada seção são só um marcador, como na v4.

### API (`src/api/`)

**O `src/api/` é a única camada que usa o axios.** Stores, composables e componentes chamam as funções de um módulo daqui e nunca importam o axios nem o `apiClient` direto.

O `src/api/client.ts` cria o `apiClient` com `baseURL: '/private/v1'` (sempre na mesma origem, nunca com host) e `timeout` de 20 s. O interceptor de resposta converte toda falha num `ApiError`, com `status` (`null` quando a requisição nem chegou ao server, e `isNetworkError` para perguntar isso), `error` (o código do `ProblemDetail` do server), `detail`, `parameters` e o erro original em `cause`. Cancelamentos e erros que não vêm do axios passam sem conversão. O interceptor não mostra nada na tela: o toast padrão para um `ApiError` vem do `plugins/apiErrorHandler.ts` (veja [Notificações e confirmações](#notificações-e-confirmações)). Uma chamada que trata o erro por conta própria passa `silent: true` na configuração do axios e o plugin a ignora, como o `fetchSession` faz.

O `client.ts` também cuida de duas coisas da sessão (veja [Autenticação](#autenticação)): carimba a hora de toda resposta que o server deu, sucesso ou erro, em `api/serverActivity.ts` (é o que o `useInactivityLogout` lê), e garante o token de CSRF antes de uma escrita. O `client.ts` não importa o store nem o router, porque o `api/auth` importa o `client` e o store importa o `api/auth`: tudo o que navega ou mexe na sessão fica no `plugins/apiErrorHandler.ts`.

| Arquivo | Endpoints |
|---|---|
| `auth.ts` | `POST /auth/login` (devolve a sessão), `GET /auth/session`, `POST /auth/logout` |
| `accounts.ts` | `PATCH /accounts/activate`, `/accounts/forgot-password`, `/accounts/recover-password` |
| `users.ts` | o CRUD de `/administration/users` (`CrudApi`) mais `PATCH /{id}/update-password` (`updatePassword`) |
| `roles.ts` | `GET /administration/roles`, a lista de nomes de role que se pode conceder |
| `wallets.ts`, `cards.ts`, `costCenters.ts`, `classifications.ts`, `financialPeriods.ts` | o CRUD de cada cadastro em `/registration/<recurso>`: `GET` paginado (com `PageQuery`), `GET /{id}`, `POST`, `PUT /{id}` e `DELETE /{id}` |

Os módulos de cadastro têm a forma de `CrudApi` (`src/composables/useCrudResource.ts`): `findAll`, `findById`, `create`, `update` e `remove`.

### Tipos (`src/types.ts`)

Todos os formatos que atravessam a API ficam em `src/types.ts`, num arquivo só, com os nomes da v4: `<Entidade>CreateForm` e `<Entidade>UpdateForm` para o que vai, `<Entidade>View` e `<Entidade>ListView` para o que volta. Também ficam lá o `PagedResponse<T>` (o envelope `PagedModel` do Spring: `{ content, page: { size, number, totalElements, totalPages } }`), o `PageQuery` (`filter`, `status`, `page`, `size`, `sort`), o `ProblemDetail` e os tipos da sessão (`SessionResponse`, `Role`, `UserStatus`).

### Stores (`src/stores/`)

| Store | O que expõe |
|---|---|
| `auth` | `session`, `isAuthenticated`, `loading`, `endingSession`, `hasRole(role)`, `login`, `restoreSession` (devolve se há sessão), `clearSession`, `logout` e `expireSession(reason)` (veja [Autenticação](#autenticação)) |
| `account` | `loading`, `activate`, `forgotPassword`, `recoverPassword` e `reset` |
| `wallets`, `cards`, `costCenters`, `classifications`, `financialPeriods` | a ref da entidade (`wallet`, `card`, `costCenter`, `classification`, `financialPeriod`), `pageRequest`, `pageResponse`, `loading`, `findAll`, `findOne`, `create`, `update`, `remove` e `reset`; `wallets` e `costCenters` acrescentam `findByName` e a lista de opções que ele preenche |
| `usersAdmin` | a ref `user`, `roles`, `pageRequest` (o status padrão é `ALL`, não `ACTIVE`), `pageResponse`, `loading`, `findAll`, `findOne`, `findRoles`, `create`, `update`, `updatePassword`, `remove` e `reset` |

Os stores de cadastro montam tudo sobre o composable `useCrudResource`, que guarda o `pageRequest`, o `pageResponse` e a entidade corrente e conta as operações em andamento para o `loading`. Um store novo de CRUD usa o mesmo composable em vez de reescrever essa mecânica.

- **Carregamento sob demanda:** cada store é carregado pela view ou pelo componente que precisa dele, no `onMounted`. Cargas em paralelo numa mesma tela usam `Promise.all`.
- **Atualização pessimista:** toda mutação espera a resposta da API antes de mudar o estado do store. Não há atualização otimista nem rollback.
- **Ações devolvem promessas e propagam o `ApiError`.** Não há os callbacks `onSuccess`/`onError` da v4: quem chama usa `await` e `try`/`catch`.
- **`reset()` no fim da sessão:** todo store que guarda dado do usuário tem um `reset()`, e o `stores/resetUserStores.ts` chama todos eles. O `auth` chama o `resetUserStores()` em toda saída de sessão (todos passam pelo `clearSession()`: o `restoreSession()` que falha, o `logout()` e o `expireSession()`) e também no `login()`, antes de guardar a sessão nova: nenhum usuário começa vendo o que o anterior carregou. Um store novo com dado do usuário ganha um `reset()` e uma linha lá.

### Composables e utils

- `src/composables/useCrudResource.ts`: a mecânica comum dos stores de cadastro (veja acima).
- `src/composables/useInactivityLogout.ts`: o logout por inatividade, iniciado no `App.vue` (veja [Autenticação](#autenticação)).
- `src/composables/useNotification.ts` e `src/composables/useConfirmDialog.ts`: toasts e confirmação de exclusão (veja [Notificações e confirmações](#notificações-e-confirmações)).
- `src/composables/useCrudList.ts`, `useCrudForm.ts`, `useCrudDetail.ts` e `useServerErrors.ts`: a mecânica das telas de cadastro (veja [Cadastros](#cadastros)).
- `src/lib/utils.ts`: o `cn`, que junta classes e resolve conflitos do Tailwind. O shadcn-vue o importa de `@/lib/utils`.
- `src/utils/pageRequest.ts`: o `PageRequest` do client (`filterText`, `status`, `current`, `size`, `direction`, `sortField`), o `createPageRequest` (página de 15, ordem por `createdOn`), o `createPageResponse` e o `toPageQuery`, que traduz um para o `PageQuery` da API.
- `src/utils/apiErrorNotice.ts`: o `describeApiError` traduz um erro em chaves do i18n, com parâmetros e severidade (`warn` ou `error`), para quem for mostrá-lo. Devolve `null` para 401 e 403, que são tratados por navegação (a exceção é o 403 `invalid-csrf-token`, que tem aviso próprio), e cai na mensagem genérica quando o código de erro ou o campo em conflito não tem tradução, para que nenhuma chave crua chegue à tela.
- `src/utils/safeRedirect.ts` e `src/utils/queryValue.ts`: o filtro do `redirect` do login e a leitura de um parâmetro de query como texto (veja [Telas de autenticação e de erro](#telas-de-autenticação-e-de-erro)).
- `src/utils/localDate.ts`: `parseLocalDate` e `formatLocalDate` convertem as datas `yyyy-mm-dd` da API sem passar pelo UTC.

Um composable reutilizável vai em `src/composables/`; uma função pura sem estado reativo vai em `src/utils/`.

### Componentes

Os componentes se organizam pelo papel, não pela view que primeiro precisou deles:

| Pasta | O que tem |
|---|---|
| `components/ui/` | os primitivos do shadcn-vue, já ajustados ao Caderno verde (veja [Estilos](#estilos)). Não escreva testes para eles (ficam fora da cobertura). **Estão editados à mão:** rodar `shadcn-vue add` sobre um que já existe sobrescreve as variantes do design, então confira o diff e refaça o ajuste |
| `components/brand/` | `BrandMark` (o símbolo “wB”, com a prop `size`) e `BrandWordmark` (“web” em cinza e “Budget” com o `marker`; herda o tamanho da fonte de quem o usa) |
| `components/layout/` | o shell: `TopBar`, `AppSidebar` (menu lateral do desktop e, no celular, o `MobileMenu`), `SideMenu`, `MenuItem`, `PageBreadcrumb`, `UserMenu`, `UserAvatar`, `ThemeSwitch`, o registro das seções (`sections.ts`), os layouts por seção (`HomeLayout`, `DashboardsLayout`, `RegistrationLayout`, `FinancialLayout`, `ConfigurationLayout`, `AuthLayout`) e o tipo `menu.ts` |
| `components/` (raiz) | `PageStructure` (a moldura com barra superior, menu lateral e breadcrumb) e `ErrorPage` |
| `components/listing/` | `ItemsTable`, `SearchControls`, `ActionButtons`, `StatusBadge`, `PeriodStatusBadge` |
| `components/common/` | `CurrencyDisplay`, `DateTimeDisplay`, `ConfirmDialog`, `DetailCard`, `DetailField` |
| `components/forms/` | `StatusToggle`, `PasswordInput` (campo de senha com botão de mostrar e ocultar; repassa os atributos ao `<input>`, então vai dentro de um `FormControl`), `FormCard`, `InputField`, `SelectField`, `SearchSelectField`, `ServerErrorAlert` |

Um componente reutilizável e só de apresentação vai num diretório compartilhado, não ao lado do primeiro uso.

**Props e eventos da v4 foram mantidos** nos componentes de `listing/`, `common/` e `forms/`, para que as views de cadastro (#24) sigam o desenho da v4. O que muda é só o que o PrimeVue fazia por baixo:

- `ItemsTable`: no lugar das `<Column>` do PrimeVue, recebe a prop `columns` (`{ field, header, sortable?, class? }`, com `header` já traduzido). Uma célula customizada vem pelo slot `cell-<campo>` (`{ item, value }`) e a coluna de ações pelo slot `actions` (`{ item }`); sem o slot `actions` a coluna não existe. Os eventos são os da v4: `pageChanged` (`{ currentPage, pageSize }`, com `currentPage` **começando em zero**, como o `pageRequest.current`), `rowSelected` (`{ data, index }`) e `tableSorted` (`{ sortField, sortOrder: 'asc' | 'desc' }`; ao remover a ordenação volta para `createdOn` ascendente). A prop `currentPage` (zero-based) marca a página atual e `loading` mostra o esqueleto. O componente é genérico no tipo da linha (`T extends { id: string; active?: boolean }`), então o `item` dos slots chega tipado.
- `SearchControls`: os mesmos `v-model:status` e `v-model:filter` e os eventos `onFilterChange`, `onFilterReset` e `onNew`.
- `ActionButtons`: `onEdit` e `onDelete`.
- `StatusToggle`: recebe só o `name` e se liga ao formulário pelo `useField` do vee-validate, então vai dentro de um `useForm`.
- `CurrencyDisplay` mostra `R$ 0,00` para o zero (a v4 não mostrava nada); `null` só mostra algo com `zeroIfNull`. Sai sempre em `font-mono tabular-nums`. Com `signed`, o valor ganha `+ ` ou `− ` (U+2212) e a cor de receita (`text-income`) ou de despesa (`text-expense`); o zero fica sem sinal e sem cor. Use `signed` onde o valor é movimento de dinheiro: a cor sozinha nunca basta.
- `StatusBadge` usa o `Badge` neutro (inativo com `opacity-70`) e `PeriodStatusBadge` usa `approved`, `pending` e `neutral` para ativo, encerrado e contabilizado.

### Layout e rotas

O `App.vue` só tem o `<RouterView>`, o `Toaster` e o `ConfirmDialog`. As seções (`DASHBOARDS`, `FINANCIAL`, `REGISTRATION` e `ADMINISTRATION`, nessa ordem) estão num registro só, `components/layout/sections.ts`: `path`, `label` do i18n, `role` e os `items` (`label`, `icon` do Lucide e `to`). A `TopBar` e o `MobileMenu` leem esse registro, e cada layout de seção monta a `PageStructure` e passa a sua seção ao menu lateral pelo slot `side-menu`. Um item sem `to` aparece desabilitado: é o que o dashboard, o financeiro e as integrações da configuração têm hoje.

**O shell:** a `TopBar` mostra o botão do menu (`Ctrl+B`), as seções que o usuário pode ver (a atual com o sublinhado verde e `aria-current`) e o `UserMenu` (nome e e-mail, tema em Claro, Escuro e Sistema e Sair). O menu lateral tem a marca no topo, os itens da seção (o atual em negrito com o `marker`) e a versão do app (`__APP_VERSION__`) no rodapé; recolhido, vira ícones com tooltip, e o estado fica no cookie `sidebar_state` do `SidebarProvider`, lido a cada `PageStructure` para valer entre seções. Abaixo de 768px o menu lateral é um Sheet com todas as seções permitidas e, no rodapé, o usuário, o tema e o Sair, também na home (que não tem menu lateral no desktop e por isso leva a marca na barra). O item Dispositivos confiáveis do menu do usuário só entra com o diálogo da #31. A versão do app só aparece no menu lateral do desktop.

As rotas ficam em `src/router/`, um arquivo por seção: `dashboardsRoutes.ts`, `registrationRoutes.ts`, `financialRoutes.ts`, `configurationRoutes.ts` e `publicRoutes.ts`, montados no `index.ts`. Cada seção é um registro com o layout como `component` e as telas como `children` carregadas sob demanda (`() => import(...)`); uma tela nova entra como filha do registro da sua seção. Quatro chaves de `meta` valem (os tipos estão em `router/routeMeta.ts`):

- `public: true` no registro do layout marca a rota como pública (o `isPublicRoute` olha todos os registros de `to.matched`). São públicos o `/login`, o `/auth/*` e as telas de erro (veja [Telas de autenticação e de erro](#telas-de-autenticação-e-de-erro)).
- `breadcrumb` guarda a chave do i18n que o `PageBreadcrumb` mostra; repetir a mesma chave num filho não duplica o item. O último item é a página atual.
- `role` no registro do layout de uma seção exige essa role do usuário em toda rota dela: `/dashboards` pede `DASHBOARDS`, `/registration` pede `REGISTRATION`, `/financial` pede `FINANCIAL` e `/configuration` pede `ADMINISTRATION`. A home e as rotas públicas não pedem nenhuma. Uma seção nova ganha a `role` da sua área no registro do layout e uma entrada em `sections.ts`.
- `narrow: true` numa rota de formulário ou de detalhe limita o conteúdo a 960px, centralizado, com o breadcrumb dentro do mesmo contêiner (a `PageStructure` lê o `route.meta`); a lista usa a largura toda. O `crudRoutes` já marca `create`, `:id/update` e `:id/detail`, e as rotas de usuário `create` e `:id/update`. As views não definem largura máxima nem breadcrumb próprios.

O guard (`router/guard.ts`): rota pública passa; senão, com sessão no store ou com `restoreSession()` verdadeiro segue; senão vai para `{ name: 'login', query: { redirect } }`. Com sessão, se algum registro de `to.matched` pede uma role que o usuário não tem (`auth.hasRole`), vai para `{ name: '403' }`, a tela `/error/forbidden`. **Isso é UX, não controle de acesso:** o server confere a role em cada requisição, e a `TopBar` só esconde as seções sem a role pelo mesmo motivo. Os testes que chamam o `router/index.ts` precisam de um `createTestingPinia` ativo, e cada rota carregada sob demanda é coberta por um teste que resolve todos os carregadores (`router/index.test.ts`), então uma rota nova entra na contagem dele.

**O `redirect` é entrada do usuário.** Quem o usa depois do login passa por `safeRedirect` (`utils/safeRedirect.ts`), que aceita só caminho interno (começando em `/`, sem `//` nem `/\`) e devolve `null` para o resto; o `LoginView` cai no `home` nesse caso.

### Notificações e confirmações

`useNotification()` (sobre o `vue-sonner`) devolve `showSuccess`, `showInfo`, `showWarn` e `showError` com a assinatura da v4 (`título, detalhe, localizar = true`, as duas strings como chaves do i18n) e o `showApiNotice`, que mostra o que o `describeApiError` descreveu. O `Toaster` fica no `App.vue`, e o CSS do `vue-sonner` é importado no `main.ts`.

O `plugins/apiErrorHandler.ts`, instalado no `main.ts`, mostra o toast de todo `ApiError` que o `describeApiError` descreve e cuida da sessão. No 401: `invalid-credentials` e `account-disabled` são do formulário de login e passam; com sessão no store (`unauthenticated`, `session-revoked`) chama `auth.expireSession('expired')`; sem sessão limpa o store e, se a tela atual não for pública, leva ao `/login?redirect=`. No 403 `forbidden` (a role foi tirada no meio da sessão) leva ao `403`; o `pending_approval` não faz nada aqui (é da #31) e o `invalid-csrf-token` vira o toast "Requisição não autorizada". Uma chamada `silent` não passa por nada disso.

`useConfirmDialog()` devolve o `confirm(opções)` e o `confirmDelete()`, que abrem o `ConfirmDialog` (um `alert-dialog` montado uma vez no `App.vue`) e resolvem uma promessa com `true` ou `false`. Sem opções, o texto é o de exclusão da v4:

```ts
if (await confirmDelete()) {
  await wallets.remove(id)
}
```

### Formulários

Todo formulário usa o `useForm` do vee-validate com um esquema Zod, e os campos usam os componentes de `components/ui/form` (`FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormMessage`). O esquema fica em `src/schemas/<formulario>Schema.ts`, um arquivo por formulário, e é embrulhado com o `toTypedSchema` (veja `loginSchema.ts`). As mensagens de validação não ficam no esquema: o `schemas/zodErrorMap.ts`, instalado no `main.ts`, as traduz pelas chaves `validation.*` do i18n, então `z.string().min(1)` já dá "Campo obrigatório". O mapa conhece obrigatório, tamanho mínimo e máximo de texto, mínimo e máximo de número, email e uma regra cruzada própria (issue `custom` com `params: { i18n }`, que vira a chave `validation.<i18n>`, como o `end-before-start` do período financeiro e o `password-mismatch` da recuperação de senha); uma regra nova vira uma chave em `validation` e um caso no mapa. O `zod` fica na linha 3, porque o `@vee-validate/zod` pede `^3.24`.

### Cadastros

Carteiras, cartões, centros de custo, classificações e períodos financeiros vivem em `src/views/registration/<recurso>/`, três telas cada: `<Entidade>ListView`, `<Entidade>FormView` (criar e editar) e `<Entidade>DetailView`. As rotas saem do `router/crudRoutes.ts`, que monta, dentro do registro da seção, o registro do recurso (só com a migalha `<entidade>.menu`) e a filha de caminho vazio (a lista, nome `wallets`), `create`, `:id/update` e `:id/detail` (nomes `wallets.create`, `wallets.update`, `wallets.detail`), com `props: true`: o `id` chega como prop e é ele que diferencia o formulário de edição do de criação. **A v4 tinha uma quinta rota, `:id/delete`, que mostrava o detalhe com a pergunta "Confirma a exclusão?". Ela não existe mais:** a exclusão, na lista e no detalhe, passa pelo `useConfirmDialog().confirmDelete()`.

- **Lista:** o `useCrudList` recebe o `pageRequest`, o `findAll` e o `remove` do store e devolve os manipuladores de paginação, ordenação, navegação e exclusão; carrega a lista no `onMounted`. A lista monta `SearchControls` e `ItemsTable` com `columns` e os slots `cell-<campo>` e `actions`, e passa `:current-page` e `:page-size` do `pageRequest`.
- **Formulário:** `useForm` do vee-validate com o esquema de `src/schemas/<entidade>Schema.ts`, que também exporta os valores iniciais e as funções `to<Entidade>CreateForm`, `to<Entidade>UpdateForm` e `to<Entidade>FormValues` (esquema de formulário e payload da API não são iguais: `''` vira `null`, a opção escolhida vira o `id`). O `useCrudForm` carrega a entidade quando há `id`, grava e, ao criar, limpa o formulário. Os campos são `InputField` (texto, número, data e `multiline`), `SelectField` e `SearchSelectField`, dentro de um `FormCard`. Número e data usam o `<input>` nativo (a data já sai como `yyyy-mm-dd`, o formato da API, sem passar pelo UTC); o `optionalNumberSchema` converte o texto em número ou `null`.
- **`SearchSelectField`:** o seletor com busca no servidor (carteira do cartão, centro de custo pai). Só busca com dois caracteres ou mais, emite `search` com o texto e mostra as `options` que a tela passa; o valor do campo é `{ id, label }` ou `null`. O centro de custo pai aparece pelo `fullName`.
- **Detalhe:** `DetailCard` com `DetailField`s; o `useCrudDetail` carrega, leva à edição e exclui com confirmação.
- **Erro do servidor:** o `useServerErrors().run()` envolve toda chamada da tela; se ela falha, as mensagens (as mesmas do `describeApiError`) vão para o `ServerErrorAlert`, no formulário, no detalhe ou acima da tabela. O toast padrão do `apiErrorHandler` continua aparecendo: os dois são intencionais, o toast some e o alerta fica ao lado do que falhou.
- **Testes:** cada tela tem um `*.test.ts` com `createTestingPinia({ stubActions: false })` (via `mountView` de `src/test/crud.ts`) e o módulo `@/api/<recurso>` mockado, para exercitar o store de verdade. A confirmação de exclusão se resolve com `useConfirmDialog().accept()` ou `.cancel()`, sem montar o `ConfirmDialog`. Depois de um `submit`, use o `settle()` do mesmo helper: a validação do vee-validate é assíncrona.

### Administração de usuários

Tela em `src/views/configuration/users/` (`UserListView` e `UserFormView`), sob `/configuration/users`, `.../create` e `.../:id/update` (nomes `users`, `users.create` e `users.update`; sem tela de detalhe, por isso as rotas são escritas à mão em `configurationRoutes.ts` e não saem do `crudRoutes`). A role `ADMINISTRATION` vem do registro `/configuration`. O visual é o padrão do shadcn-vue e será refeito no design novo (#33); o store, a API, os esquemas e os testes continuam.

- **O contrato do server tem armadilhas que a tela já cobre.** O `POST` exige senha (`UserCreateForm.password`) e só envia o e-mail de ativação com `sendActivationEmail: true`, então o formulário de criação pede a senha e marca o envio por padrão. A `UserView` devolve `authorities`, mas os formulários enviam `roles`: o `schemas/userSchema.ts` faz a troca (`toUserFormValues`). Um usuário novo nasce inativo até ativar a conta, por isso o `usersAdmin` e o `SearchControls` da lista começam em `ALL`. O e-mail não muda na edição (o `UserUpdateForm` nem o tem). O `409` de e-mail repetido vem como `parameters['user.email']`, traduzido em `error.conflict.user.email`.
- **Sem ação sobre a própria conta.** A linha do usuário logado (`email` igual ao de `auth.session`) mostra "Sua conta" no lugar das ações. É só UX: o server de hoje (`feature/12`) **não** recusa editar ou apagar a própria conta (só recusa apagar o admin principal), então a proteção real é uma pendência do server.
- **Confirmação em toda ação.** Criar e salvar passam pela opção `confirm` do `useCrudForm` (roda antes da chamada e, se recusada, não grava, não mostra o aviso de sucesso nem limpa o formulário); excluir passa pela opção `confirmRemove` do `useCrudList`, que cita o nome do usuário. Redefinir a senha é um diálogo (`components/users/ResetPasswordDialog.vue`) com senha e confirmação; o botão do diálogo é a confirmação. A senha vai com `temporary: true` (o server ignora o campo hoje) e a troca encerra as sessões abertas do usuário, porque sobe o `credentials_version`.
- **Roles.** O `RoleSelectField` (caixas de seleção) lista o que o `GET /administration/roles` devolve, carregado pelo `findRoles` ao abrir o formulário, e exige ao menos uma. Quando as roles de alguém mudam, a próxima requisição dele já responde `403` `forbidden` nas áreas perdidas (o server confere a role no banco a cada chamada); o `apiErrorHandler` leva à tela `403`.
- **Fora de escopo, vem na #31:** filtro por status de aprovação, aprovar, bloquear, desbloquear e resetar o TOTP.

### i18n (`src/locales/`)

Todo texto que o usuário vê passa pelo vue-i18n (`t('chave')` no `<script setup>`, `$t('chave')` no template), em modo de composição (`legacy: false`). Os catálogos ficam em `src/locales/pt_BR.json` e `src/locales/en_US.json`, registrados como `pt-BR` e `en-US`. O `pt-BR` é o idioma padrão e o de fallback, e é o catálogo completo: o `en_US.json` está vazio por enquanto e cai nele. Uma chave nova entra primeiro no `pt_BR.json`. Os formatos de número (`currency`, `decimal`, `percent`) e de data (`short`, `long`) estão em `src/locales/index.ts`.

## Portabilidade da v4

O código de origem fica em `D:/desenvolvimento/web-budget/front-end`, o clone do repositório arquivado `web-budget/front-end`, em JavaScript. Ele é só referência: leia-o para portar telas, textos e comportamento, mas nunca o altere. Nada da pasta `docs/` dele é copiado para o monorepo; o que ainda vale está neste arquivo.

O port mantém as telas, os textos e as regras da v4. O que muda:

- Nada de PrimeVue nem de Yup, nem como dependência nem como import. Os componentes vêm do shadcn-vue e os formulários usam vee-validate com Zod.
- A seção de investimentos não é portada.
- Nada de `useApi` nem de `src/utilities/http.js`: as chamadas passam pelos módulos de `src/api/`, tipados.
- Nada de `src/models/`: os formatos ficam em `src/types.ts` e os esquemas de formulário ficam em `src/schemas/`.
- Os stores não recebem callbacks `onSuccess`/`onError` (veja [Stores](#stores-srcstores)).
- O client não tem `VITE_API_URL`: fala com `/private/v1` na mesma origem.

## Autenticação

A autenticação é por sessão no servidor (#26): o cookie de sessão é do navegador e o client nunca o lê, nunca guarda credencial e nunca recebe nem guarda token. O store `auth` só mantém a `SessionResponse` que o server devolve (`name`, `email`, `status` e `roles`). O `restoreSession()` pergunta ao `GET /auth/session` se a sessão continua viva e responde `false` em qualquer falha.

**Esconder um botão ou redirecionar uma rota é UX, não controle de acesso.** O server confere cada permissão por conta própria em cada requisição. Um `v-if` por role ou um redirecionamento do router melhora a experiência de quem usa o sistema direito e não faz nada contra quem chama a API direto, então nunca raciocine sobre o que o client esconde como se fosse a fronteira de segurança.

O guard de rotas (`router/guard.ts`) confere a sessão e a role (veja [Layout e rotas](#layout-e-rotas)). O auto-cadastro, o aguardando aprovação e o redirecionamento por `pending_approval` vêm na #31.

**Fim de sessão.** O `auth.logout()` e o `auth.expireSession(reason)` navegam para o `/login` primeiro e só então limpam a sessão e os stores (`endingSession` fica `true` no meio), para que a tela que está aberta nunca renderize sem sessão. Quem sai por `expireSession` leva `?reason=expired|inactivity` e, se a tela era privada, `redirect=` com ela; a `LoginView` mostra o aviso da razão como toast, sem mexer no layout, e não manda o usuário de volta ao app enquanto `endingSession` é `true`. `expireSession` não faz nada sem sessão ou com um fim de sessão em curso, e o `POST /auth/logout` que ele dispara é `silent` e ignora a falha.

**Logout por inatividade.** O `useInactivityLogout`, iniciado no `App.vue`, confere a cada 30 s (e quando a aba volta a ficar visível) se a última resposta do server (`lastServerActivityAt`) tem 30 minutos ou mais, o mesmo timeout de sessão do server, e então chama `expireSession('inactivity')`. Só vigia enquanto há sessão.

**CSRF.** O server (#26) exige o header `X-XSRF-TOKEN`, igual ao cookie `XSRF-TOKEN`, em toda escrita, até nas anônimas (`POST /auth/login`, `PATCH /accounts/*`); sem ele responde `403` `invalid-csrf-token`, não `401`. O axios do `apiClient` lê o cookie e manda o header sozinho (mesma origem). O cookie só nasce depois de algum `GET`, então um interceptor de requisição do `client.ts` dispara um `GET /auth/session` `silent` antes de qualquer escrita feita sem o cookie (as telas de recuperação de senha e de ativação, abertas direto pelo link do e-mail, não têm outro `GET`), e escritas simultâneas dividem esse mesmo `GET`.

### Telas de autenticação e de erro

As rotas públicas ficam em `router/publicRoutes.ts`. O login é `/login`; esqueci a senha, recuperação e ativação ficam sob `/auth` (`/auth/forgot-password`, `/auth/recover-password`, `/auth/account-activation`), dentro do `AuthLayout`. **Os dois últimos caminhos e os parâmetros `token` e `email` são o contrato dos emails que o server envia** (o back-end da v4 monta `${frontendUrl}/auth/...?token=...&email=...`): não os renomeie sem mudar o server. As telas de erro são `/error/forbidden` (`403`), `/error/not-found` (`404`) e `/error/server-error` (`500`), sem layout, e uma rota coringa pública (`not-found`) mostra a de 404 para qualquer caminho desconhecido.

- **Login:** `POST /auth/login` com `{ email, password }`. Credencial ou conta recusada (401 e 403) mostra `error.login.*` na própria tela, porque o `describeApiError` devolve `null` para os dois e o plugin não mostra nada; qualquer outra falha já virou o toast padrão e a view não repete. Ao montar, a tela pergunta ao `restoreSession()` e, com sessão viva, segue direto para o destino. Credencial inválida responde 401 `invalid-credentials` e conta recusada responde 401 `account-disabled`; o `apiErrorHandler` deixa os dois para a tela.
- **Esqueci a senha, recuperação e ativação:** usam o store `account`; falhas já viram o toast padrão (o `invalid-token` do 400 diz "Token inválido ou expirado"), então só o sucesso é tratado na tela. A ativação tem três estados explícitos (`activating`, `success`, `error`) e `queryValue` (`utils/queryValue.ts`) lê `token` e `email` da query.
- **Recuperação:** a confirmação precisa ser igual à senha. O `refine` do `recoverPasswordSchema` marca o issue com `params: { i18n: 'password-mismatch' }`, que o `zodErrorMap` traduz; uma regra cruzada nova segue o mesmo caminho.
- **Testes de formulário:** o vee-validate valida de forma assíncrona; depois de `trigger('submit')` use `await settle()` (`src/test/settle.ts`) em vez de um único `flushPromises()`.

## Estilos

O estilo é o **Caderno verde** (#66, #73), sobre o Tailwind 4, sem arquivo de configuração em JavaScript: o plugin `@tailwindcss/vite` está no `vite.config.ts` e o `src/assets/theme.css` importa o Tailwind e define os tokens (`--background`, `--primary`, `--sidebar` e companhia) para o claro e o escuro, mais o `@theme inline` que os expõe como classes. Mexer no visual é mexer nos tokens desse arquivo; entre os temas só mudam luminosidade e croma, nunca o matiz. Os mockups (linguagem visual, shell, login, usuários e listagem/formulário/detalhe) estão linkados na #73 e na #66.

- **A linguagem:** IBM Plex Sans na interface e IBM Plex Mono nos valores, datas, códigos e na marca; raio de 3px (`--radius`), bordas de 1px, controles de 36px (`h-9`), linhas de tabela de 40px e escala de 4px. Sombra só em menu, popover, toast e diálogo; cartão não tem sombra. Ícones Lucide em 16px, com o traço de 1,75 aplicado por `svg.lucide` no `theme.css`, sempre ao lado de texto.
- **Fontes pelo bundle:** `@fontsource-variable/ibm-plex-sans` e `@fontsource/ibm-plex-mono` (400, 500 e 600), importados no `main.ts`. Não use Google Fonts nem outra fonte externa.
- **Tokens além do shadcn-vue:** `--destructive-foreground`, `--highlight` e `--highlight-foreground`, `--income`/`--income-muted` e `--expense`/`--expense-muted`. O **marca-texto** (`highlight`) só aparece no que pede atenção (usuário pendente, item ativo do menu, linha selecionada) e nunca em texto de tabela; no escuro ele escurece para o texto claro continuar legível. **Dinheiro** de receita e despesa sempre leva sinal (`+`/`−`) ou seta, nunca só a cor (veja `CurrencyDisplay` com `signed`). O utilitário `marker` desenha o traço de marca-texto atrás do texto.
- **Variantes dos componentes** (`components/ui/`): `Button` (`default`, `secondary`, `outline`, `ghost`, `destructive`, `link`; tamanhos `sm`, `default`, `lg` e `icon`), `Badge` (`approved`, `pending` e `blocked` com o ponto, `neutral` e `outline` em mono), `Alert` (`default`, `destructive` e `attention`; o `ServerErrorAlert` é um `Alert` destrutivo), `Table` (cabeçalho em versalete de 11px, linhas de 40px; `data-state="selected"` na `TableRow` marca a linha com o marca-texto), `Switch` de cantos retos. O bloco do campo (`FormItem`) alinha pelo topo (`content-start`) para a mensagem de erro crescer para baixo sem desalinhar a linha; `Input` e `Textarea` ficam em `text-base` no celular e `text-sm` a partir de `md`, para o iOS não dar zoom ao focar.
- **Marca:** `BrandMark` e `BrandWordmark` (`components/brand/`) seguem o tema. O `src/assets/brand/mark.svg` é o símbolo “wB” com as letras em contorno e as cores fixas, para uso fora do app; o `public/favicon.svg` usa só o “B”, porque o “wB” a 16px não se lê. Para gerar o contorno de outra palavra, converta com o opentype.js a partir do arquivo `.woff` da fonte, sem acrescentar a dependência ao projeto.
- **Use os tokens, não cores fixas.** `bg-background`, `text-muted-foreground`, `border` e afins trocam sozinhos com o tema. Não use `text-white`, `bg-black/…` nem as cores do Tailwind (`emerald-600`): o texto sobre `destructive` é `text-destructive-foreground`, o fundo do diálogo é o `--popover`, e o status vem das variantes do `Badge`.
- **O tema escuro é a classe `dark` no `<html>`.** O store `appearance` (`stores/appearance.ts`) guarda o modo (`light`, `dark` ou `system`; `dark` é o efetivo, calculado, e `setMode` troca) em `localStorage` (`webbudget.appearance`, formato `{ "mode": "system" }`) e aplica a classe; ele é instanciado no `main.ts`, para valer também nas telas públicas. Sem escolha o modo é `system`, que segue `prefers-color-scheme` ao vivo. O formato antigo `{ "dark": true }` vira `dark`; `{ "dark": false }` vira `system`, porque o store antigo o gravava em toda partida. A troca fica no menu do usuário (`ThemeSwitch`) e no rodapé do Sheet.
- **Ícones vêm do `lucide-vue-next`.**
- **Componente novo do shadcn-vue:** o `components.json` já está pronto, mas a CLI só acha o alias `@/*` com um `compilerOptions.paths` no `tsconfig.json` da raiz, que aqui só tem referências. Acrescente-o à mão antes do comando, rode `pnpm dlx shadcn-vue@latest add <componente>` e **desfaça o `tsconfig.json`** depois. Confira o resultado: a CLI importou o `cn` de um pacote `cn` e os ícones do `@lucide/vue` (troque por `@/lib/utils` e `lucide-vue-next` e tire os dois do `package.json`), e o código gerado vem com aspas duplas (rode o Prettier nele).
- **Gráficos:** o `chart.js` não está instalado. A v4 não tem gráfico em lugar nenhum (o `FinancialLayout` dela só tem ícones de gráfico); quando uma tela precisar de um, o `chart.js` entra junto com ela.
