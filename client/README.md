# webBudget: client

Interface web do webBudget, em Vue 3, TypeScript, Pinia e shadcn-vue, construída com o Vite. As convenções de código e a arquitetura estão em [`CLAUDE.md`](CLAUDE.md).

## Pré-requisitos

- Node 24.15 ou mais novo
- pnpm na versão do campo `packageManager` de `package.json`

## Desenvolvimento

```bash
pnpm install
pnpm dev
```

O Vite sobe na porta 8086 e encaminha as chamadas a `/private` para o server em `localhost:8085`, então o server precisa estar rodando (veja o [`README` do server](../server/README.md)). Abra `http://localhost:8086`.

## Qualidade

```bash
pnpm lint      # oxlint e eslint, com correção automática
pnpm format    # prettier em src/
```

## Testes

```bash
pnpm test           # Vitest em modo de observação
pnpm test:run       # uma execução só
pnpm test:coverage  # uma execução com cobertura
```

A cobertura exigida é de 100% (instruções, ramos, funções e linhas), e é o que o CI executa. O relatório em HTML fica em `coverage/index.html`.

## Gerar os arquivos estáticos

```bash
pnpm build
```

Confere os tipos e gera o `dist/`. Para experimentá-lo localmente, rode `pnpm preview` (porta 4173, também com o encaminhamento de `/private`). O passo a passo completo está em [Compilar a partir do código-fonte](../docs/compilar-do-codigo-fonte.md).
