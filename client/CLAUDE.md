# CLAUDE.md

Este arquivo orienta o Claude Code no `client/`, o frontend do webBudget: Vue 3 com `<script setup>` e TypeScript 6.0, Vite 8, Vue Router 5, Pinia 4, vue-i18n 11, axios, Vitest 5, ESLint 10, oxlint e Prettier, sobre Node 24 e pnpm 12. O alias `@` aponta para `src/`. As regras do repositório inteiro (issues, branches, PRs, idioma, comentários no código, como ativar o Node e o pnpm nesta máquina e a proibição de subir os servidores de desenvolvimento do usuário) estão no `CLAUDE.md` da raiz e valem aqui também.

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

O ambiente é o `jsdom`, e o `src/test/setup.ts` roda antes de cada arquivo (`test.setupFiles`) com o `enableAutoUnmount(afterEach)`, então nenhum teste precisa desmontar o que montou. Os `globals` do Vitest estão desligados: importe `describe`, `it`, `expect` e `vi` de `'vitest'` em cada arquivo.

O Pinia tem uma regra que decide sozinha:

| O teste | Usa |
|---|---|
| monta um componente | `createTestingPinia()` do `@pinia/testing`, passado em `global.plugins` |
| exercita um store ou um composable direto | `setActivePinia(createPinia())` no `beforeEach` |

O `createTestingPinia()` troca todas as ações por spies, que é o que um teste de componente quer: as ações viram algo para conferir e nenhuma chamada à API escapa. Passe `{ stubActions: false }` só quando o comportamento testado *é* a ação de verdade rodando. Os testes de store mockam o módulo da API com `vi.mock('@/api/<recurso>')`, como em `src/stores/auth.test.ts`.

Confira o que aparece na tela, os eventos emitidos e as interações do usuário, nunca o `wrapper.vm` ou métodos privados, que prendem o teste à implementação e quebram na primeira refatoração. Nada de teste só de snapshot: um snapshot que ninguém lê continua passando com a funcionalidade quebrada.

A cobertura é medida pelo `pnpm test:coverage` (provider v8, relatório em `client/coverage/`) e **imposta**: `coverage.thresholds` no `vite.config.ts` define um piso para statements, lines, functions e branches, e o CI roda esse comando, então um PR que derruba qualquer um dos quatro abaixo do piso quebra o build. O piso hoje é **100% nos quatro**. Ficam fora do conjunto medido os arquivos de teste, `src/test/**`, `src/main.ts`, `src/types.ts` e `src/api/**`.

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

Hoje o client tem as camadas não visuais (#19), mas nenhuma tela: o `src/router/index.ts` tem `routes: []` e o `App.vue` ainda é o placeholder do create-vue, que o `App.test.ts` confere. As telas, o shell e as rotas chegam na tarefa #21 (a base delas na #22).

### API (`src/api/`)

**O `src/api/` é a única camada que usa o axios.** Stores, composables e componentes chamam as funções de um módulo daqui e nunca importam o axios nem o `apiClient` direto.

O `src/api/client.ts` cria o `apiClient` com `baseURL: '/private/v1'` (sempre na mesma origem, nunca com host) e `timeout` de 20 s. O interceptor de resposta converte toda falha num `ApiError`, com `status` (`null` quando a requisição nem chegou ao server, e `isNetworkError` para perguntar isso), `error` (o código do `ProblemDetail` do server), `detail`, `parameters` e o erro original em `cause`. Cancelamentos e erros que não vêm do axios passam sem conversão. O interceptor não mostra nada na tela: o toast padrão para um `ApiError` vem na #22.

| Arquivo | Endpoints |
|---|---|
| `auth.ts` | `POST /auth/login` (devolve a sessão), `GET /auth/session`, `POST /auth/logout` |
| `accounts.ts` | `PATCH /accounts/activate`, `/accounts/forgot-password`, `/accounts/recover-password` |
| `wallets.ts`, `cards.ts`, `costCenters.ts`, `classifications.ts`, `financialPeriods.ts` | o CRUD de cada cadastro em `/registration/<recurso>`: `GET` paginado (com `PageQuery`), `GET /{id}`, `POST`, `PUT /{id}` e `DELETE /{id}` |

Os módulos de cadastro têm a forma de `CrudApi` (`src/composables/useCrudResource.ts`): `findAll`, `findById`, `create`, `update` e `remove`.

### Tipos (`src/types.ts`)

Todos os formatos que atravessam a API ficam em `src/types.ts`, num arquivo só, com os nomes da v4: `<Entidade>CreateForm` e `<Entidade>UpdateForm` para o que vai, `<Entidade>View` e `<Entidade>ListView` para o que volta. Também ficam lá o `PagedResponse<T>` (o envelope `PagedModel` do Spring: `{ content, page: { size, number, totalElements, totalPages } }`), o `PageQuery` (`filter`, `status`, `page`, `size`, `sort`), o `ProblemDetail` e os tipos da sessão (`SessionResponse`, `Role`, `UserStatus`).

### Stores (`src/stores/`)

| Store | O que expõe |
|---|---|
| `auth` | `session`, `isAuthenticated`, `loading`, `login`, `restoreSession` (devolve se há sessão), `clearSession` e `logout` |
| `account` | `loading`, `activate`, `forgotPassword`, `recoverPassword` e `reset` |
| `wallets`, `cards`, `costCenters`, `classifications`, `financialPeriods` | a ref da entidade (`wallet`, `card`, `costCenter`, `classification`, `financialPeriod`), `pageRequest`, `pageResponse`, `loading`, `findAll`, `findOne`, `create`, `update`, `remove` e `reset`; `wallets` e `costCenters` acrescentam `findByName` e a lista de opções que ele preenche |

Os stores de cadastro montam tudo sobre o composable `useCrudResource`, que guarda o `pageRequest`, o `pageResponse` e a entidade corrente e conta as operações em andamento para o `loading`. Um store novo de CRUD usa o mesmo composable em vez de reescrever essa mecânica.

- **Carregamento sob demanda:** cada store é carregado pela view ou pelo componente que precisa dele, no `onMounted`. Cargas em paralelo numa mesma tela usam `Promise.all`.
- **Atualização pessimista:** toda mutação espera a resposta da API antes de mudar o estado do store. Não há atualização otimista nem rollback.
- **Ações devolvem promessas e propagam o `ApiError`.** Não há os callbacks `onSuccess`/`onError` da v4: quem chama usa `await` e `try`/`catch`.
- **`reset()` no fim da sessão:** todo store que guarda dado do usuário tem um `reset()`, e o `stores/resetUserStores.ts` chama todos eles. O `auth` chama o `resetUserStores()` no `clearSession()` e no `logout()`. Um store novo com dado do usuário ganha um `reset()` e uma linha lá.

### Composables e utils

- `src/composables/useCrudResource.ts`: a mecânica comum dos stores de cadastro (veja acima).
- `src/utils/pageRequest.ts`: o `PageRequest` do client (`filterText`, `status`, `current`, `size`, `direction`, `sortField`), o `createPageRequest` (página de 15, ordem por `createdOn`), o `createPageResponse` e o `toPageQuery`, que traduz um para o `PageQuery` da API.
- `src/utils/apiErrorNotice.ts`: o `describeApiError` traduz um erro em chaves do i18n, com parâmetros e severidade (`warn` ou `error`), para quem for mostrá-lo. Devolve `null` para 401 e 403, que são tratados por navegação, e cai na mensagem genérica quando o código de erro ou o campo em conflito não tem tradução, para que nenhuma chave crua chegue à tela.
- `src/utils/localDate.ts`: `parseLocalDate` e `formatLocalDate` convertem as datas `yyyy-mm-dd` da API sem passar pelo UTC.

Um composable reutilizável vai em `src/composables/`; uma função pura sem estado reativo vai em `src/utils/`.

### Componentes e rotas

Ainda não existem. Quando chegarem (#22), os componentes se organizam pelo papel, não pela view que primeiro precisou deles: os primitivos do shadcn-vue em `src/components/ui/`, e os demais em diretórios como `layout/` e `forms/`. Um componente reutilizável e só de apresentação vai num diretório compartilhado, não ao lado do primeiro uso. As rotas se dividem por seção (autenticação, cadastros, financeiro, configuração), cada seção com o seu layout.

### i18n (`src/locales/`)

Todo texto que o usuário vê passa pelo vue-i18n (`t('chave')` no `<script setup>`, `$t('chave')` no template), em modo de composição (`legacy: false`). Os catálogos ficam em `src/locales/pt_BR.json` e `src/locales/en_US.json`, registrados como `pt-BR` e `en-US`. O `pt-BR` é o idioma padrão e o de fallback, e é o catálogo completo: o `en_US.json` está vazio por enquanto e cai nele. Uma chave nova entra primeiro no `pt_BR.json`. Os formatos de número (`currency`, `decimal`, `percent`) e de data (`short`, `long`) estão em `src/locales/index.ts`.

## Portabilidade da v4

O código de origem fica em `D:/desenvolvimento/web-budget/front-end`, o clone do repositório arquivado `web-budget/front-end`, em JavaScript. Ele é só referência: leia-o para portar telas, textos e comportamento, mas nunca o altere. Nada da pasta `docs/` dele é copiado para o monorepo; o que ainda vale está neste arquivo.

O port mantém as telas, os textos e as regras da v4. O que muda:

- Nada de PrimeVue nem de Yup, nem como dependência nem como import. Os componentes vêm do shadcn-vue e os formulários usam vee-validate com Zod (#22).
- A seção de investimentos não é portada.
- Nada de `useApi` nem de `src/utilities/http.js`: as chamadas passam pelos módulos de `src/api/`, tipados.
- Nada de `src/models/`: os formatos ficam em `src/types.ts` e os esquemas de formulário virão em `src/schemas/` (#22).
- Os stores não recebem callbacks `onSuccess`/`onError` (veja [Stores](#stores-srcstores)).
- O client não tem `VITE_API_URL`: fala com `/private/v1` na mesma origem.

## Autenticação

A autenticação é por sessão no servidor (#26): o cookie de sessão é do navegador e o client nunca o lê, nunca guarda credencial e nunca recebe nem guarda token. O store `auth` só mantém a `SessionResponse` que o server devolve (`name`, `email`, `status` e `roles`). O `restoreSession()` pergunta ao `GET /auth/session` se a sessão continua viva e responde `false` em qualquer falha.

**Esconder um botão ou redirecionar uma rota é UX, não controle de acesso.** O server confere cada permissão por conta própria em cada requisição. Um `v-if` por role ou um redirecionamento do router melhora a experiência de quem usa o sistema direito e não faz nada contra quem chama a API direto, então nunca raciocine sobre o que o client esconde como se fosse a fronteira de segurança.

Hoje não há guard de rotas. O guard completo (sessão, status da conta e role), o auto-cadastro e o logout por inatividade vêm na #30.

## Estilos

**Seção provisória.** O client ainda não tem Tailwind nem shadcn-vue, que chegam na #22, sob a tarefa #21. Até lá, não acrescente CSS próprio, biblioteca de componentes ou framework de estilo; esta seção será reescrita quando a base visual entrar.
