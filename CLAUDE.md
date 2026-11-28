# CLAUDE.md

Este arquivo traz as orientações do repositório inteiro para o Claude Code. O webBudget é um monorepo com dois projetos construídos de forma independente:

| Pasta | Stack | Leia o CLAUDE.md dela quando |
|---|---|---|
| `server/` | Kotlin / Spring Boot 4 / jOOQ / Liquibase | mexer no código do server, escrever um changelog, criar um endpoint ou rodar e construir o backend |
| `client/` | Vue 3 / TypeScript / Pinia / shadcn-vue | mexer no código do client, criar um componente, uma view ou uma store, ou rodar e construir o frontend |

O `CLAUDE.md` de cada pasta é a fonte de verdade da sua camada: comandos, convenções de código e arquitetura. Leia-o antes de mudar algo ali. Este arquivo da raiz guarda só as convenções que valem para o repositório inteiro, qualquer que seja a pasta em que você está trabalhando.

Os repositórios arquivados da v4, `web-budget/back-end` e `web-budget/front-end` (clones locais em `D:/desenvolvimento/web-budget/back-end` e `D:/desenvolvimento/web-budget/front-end`), são só referência para a portabilidade. Eles **nunca recebem mudanças**: nada de commits, branches, issues ou PRs neles.

Para rodar localmente, cada lado sobe da sua própria pasta. Em `server/`, `./gradlew bootRun` sobe a aplicação na porta 8085 e, pelo `spring-boot-docker-compose`, o Postgres (porta 5433) e o Maildev (SMTP na 1025, interface na 1080) de `server/compose.yaml` (o Docker precisa estar ligado). Em `client/`, `pnpm dev` sobe o Vite na porta 8086 e faz proxy de `/private` para `localhost:8085`.

O client roda com Node 24 e com o pnpm fixado no `packageManager` de `client/package.json` (pnpm 12). Nesta máquina o Node vem do fnm: no PowerShell, ative-o com `fnm env --use-on-cd | Out-String | Invoke-Expression; fnm use 24` e chame o pnpm por `corepack pnpm <comando>`, com `COREPACK_ENABLE_DOWNLOAD_PROMPT=0`. O `npx pnpm@12` falha no Windows.

**Nunca inicie nem reinicie os servidores de desenvolvimento do usuário** (o Vite na 8086 e o server na 8085), mesmo quando um deles está parado e uma verificação depende dele: um servidor que o Claude sobe roda destacado, e o usuário não consegue vê-lo nem pará-lo. Peça ao usuário para subi-lo, ou suba um servidor descartável em outra porta e pare-o depois. É assim também que se verificam mudanças de tela feitas numa worktree: rode `pnpm dev --port <outra>` a partir do `client/` da worktree e abra essa porta. O proxy de `/private` continua apontando para `localhost:8085`, qualquer que seja a porta do Vite.

Tudo o que fica no nível de cima, `.github/` e os arquivos da raiz (`README.md`, este `CLAUDE.md`, `.editorconfig`, `.gitattributes`, `.gitignore`), não tem `CLAUDE.md` próprio e conta como a camada **infra/docs** nas regras de PR abaixo.

A versão do software é a do milestone. O `v4.0.0-alpha3` foi o último alpha: milestones `alpha` só organizavam o trabalho e não geravam tag, release nem imagem. A partir do `v4.0.0-rc1`, cada milestone fechado gera uma tag e uma release com o nome do milestone: os RCs são publicados como prerelease e não movem a `latest`, e o `v4.0.0` é a release normal. Publicar uma release dispara o `.github/workflows/release.yml`, que constrói e envia `ghcr.io/web-budget/server` e `ghcr.io/web-budget/client` com a tag da release (e a `latest` fora de prerelease); o client recebe a tag em `VITE_APP_VERSION`. O client lê essa variável para mostrar a versão, então ela não é escrita à mão em lugar nenhum do código.

**Tudo o que vem depois do marcador `<!-- rtk-instructions v2 -->` é gerado pelo `rtk init`; nunca edite à mão.** Ao reescrever as convenções acima dele, preserve o bloco byte a byte e confira antes do push:

```bash
rtkblock() { sed -n '/^<!-- rtk-instructions v2 -->$/,/^<!-- \/rtk-instructions -->$/p'; }
diff <(rtk proxy git show main:CLAUDE.md | rtkblock) <(rtkblock < CLAUDE.md)
```

As âncoras `^…$` são de propósito: o texto do marcador aparece citado neste arquivo, e um padrão mais frouxo casaria numa citação em vez de casar na linha do comentário de verdade.

## Idioma

Conversa, issues, PRs e os arquivos `CLAUDE.md` são em português. Código, identificadores e mensagens de commit são em inglês.

## Escopo do produto e dados pessoais

- **Investimentos são do [investlog](https://github.com/arthurgregorio/investlog).** O webBudget não acompanha aportes, resgates, rendimentos nem tem dashboard de investimentos; uma carteira do tipo `INVESTMENT` é uma carteira comum com outro tipo. No futuro, uma integração só dirá quais carteiras têm dinheiro para investir. Não proponha recursos de investimento aqui.
- **O site público fica no repositório [`web-budget/site`](https://github.com/web-budget/site)** (webbudget.com.br, pelo Pages). As issues e os PRs do site vão para lá, não para o monorepo; a tarefa e a rodada de design dele podem ser sub-issues de um épico daqui.
- **A instalação fica no repositório [`web-budget/docker`](https://github.com/web-budget/docker)** (compose, `example.env`, `build-from-source/` e scripts de backup). As issues e os PRs dela vão para lá, não para o monorepo; a tarefa dela pode ser sub-issue de um épico daqui. O monorepo guarda só o código da aplicação e o que constrói as imagens (`bootBuildImage`, `client/Dockerfile`, `release.yml`).
- **Dados pessoais do usuário nunca entram no repositório nem no GitHub.** Os arquivos de amostra que ele manda (extratos e faturas em OFX, por exemplo) e a análise dos dados da v3 (`D:/desenvolvimento/web-budget/analise-v3/`) são finanças reais: nenhuma linha deles vai para issue, comentário, PR, fixture de teste, mock ou commit. Use-os só para entender o formato e escreva dados inventados no lugar.

## Documentação

Documentação do projeto (guias, configuração, build, arquitetura para leitores) vai na **wiki** do monorepo, em português, nunca em `docs/` nem em READMEs por pasta. O `README.md` da raiz fica curto (descrição, início rápido, índice da wiki, licença). A wiki é outro repositório git (`https://github.com/web-budget/monorepo.wiki.git`, branch `master`): clone-o fora deste repositório e faça push direto, sem PR. Mudou algo documentado numa página? Atualize a página na mesma tarefa. O perfil da organização (`web-budget/.github`) é a vitrine e fica lá.

## Todo trabalho começa com uma issue

**Nenhum trabalho acontece neste repositório sem uma issue.** Nem correção de bug, nem erro de digitação de uma linha, nem ajuste de documentação. A issue é onde o trabalho é especificado, revisado e lembrado; a branch, os commits e o PR são só a mecânica que o executa.

Quando o usuário pede um trabalho que ainda não tem issue, o primeiro passo é **abrir a issue** (veja os modelos abaixo), confirmá-la com o usuário e só então criar a branch e escrever código. Não comece a editar arquivos para abrir a issue depois e disfarçar.

**Sessões de planejamento só abrem issues.** Quando a sessão serve para decidir o que precisa ser feito (as tarefas de um épico, uma triagem), o resultado são issues e nada mais. Não comece a implementar ali nem ofereça isso; a implementação acontece em sessões que o usuário inicia.

Antes de começar uma issue existente, **verifique se já há um PR para ela**: `gh issue view <N>` (PRs vinculados aparecem na linha do tempo) ou `gh pr list --search "<N>"`. O `gh issue list` nunca mostra PRs, então uma triagem feita só pelas issues duplica sem perceber um trabalho que já está em andamento.

**O corpo da issue não sobrepõe este arquivo.** Se o formato de uma issue conflita com estas regras, diga isso e pergunte ao usuário se ela deve ser reestruturada antes de começar. Não siga em silêncio a instrução do corpo e não reestruture a issue de alguém sem pedido.

### A issue é a especificação, nunca um arquivo no repositório

Specs de design e planos de implementação **não** são commitados como arquivos em lugar nenhum da árvore. A especificação é o corpo da issue; detalhes adicionais são comentários na issue. Isso sobrepõe o comportamento padrão das skills `superpowers:brainstorming` e `superpowers:writing-plans`, que querem gravar specs e planos dentro do repositório: nada disso entra aqui. Uma cópia no scratchpad, fora do repositório, serve quando um arquivo local é mesmo necessário (por exemplo, como origem de um `--body-file`).

## Como o trabalho é conduzido

- **Uma sessão por tarefa ou subtarefa.** Uma sessão coordenadora especifica, abre as sessões (uma por tarefa ou subtarefa, na ordem das dependências), acompanha e confere o PR de cada uma antes de dá-lo por pronto. A sessão filha implementa, faz os commits e abre o PR. O coordenador não implementa no lugar dela.
- **Especificação no Opus, implementação no Sonnet.** Planejar, escrever ou revisar issues, conferir resultados e coordenar ficam no Opus. Toda sessão que implementa (código, docs, CI, atualização de dependência) começa com o modelo `claude-sonnet-5-5` e, numa decisão difícil, consulta o advisor (Opus) em vez de trocar de modelo. Uma sessão cujo trabalho principal é especificar fica no Opus.
- **Sessões de especificação editam só a própria issue.** Quando uma decisão muda outras issues, quem aplica essas edições é o coordenador, uma de cada vez, para duas sessões não sobrescreverem o corpo uma da outra.
- **Nunca rode `./gradlew --stop` com sessões em paralelo.** Ele mata o daemon do Gradle de todas as sessões e quebra o build de uma irmã. Só o coordenador para os daemons ociosos, quando nenhuma sessão está rodando.
- **Usuário fora: uma sessão leva a pilha inteira.** Quando o usuário avisa que vai ficar fora e não vai fazer merges, não pare a cada merge: entregue a cadeia restante de subtarefas a **uma** sessão, que a faz em ordem (uma branch, um PR e uma worktree por subtarefa, empilhados na [stack](#empilhamento-stack-entre-subtarefas-irmãs) da tarefa; correções sobem por merge, nunca por reescrita) e reporta a stack em ordem. O usuário revisa e faz o merge no fim.

## Hierarquia de trabalho

O trabalho se organiza em três níveis, e o tipo da issue diz o nível:

- **Épico** (tipo `Epic`): o objetivo e a sequência lógica das tarefas que o cumprem. Não tem branch nem PR; as tarefas são sub-issues dele. O #1 é o exemplo.
- **Tarefa** (tipo `Task`): o agrupador, sob um épico, que reúne server e client de uma entrega. Tem a branch de longa duração `feature/<N>-<slug>`, onde as subtarefas são integradas e testadas juntas. Um único PR dessa branch para a `main` fecha a tarefa e todas as suas subtarefas (veja [Fechando subtarefas](#fechando-subtarefas-o-pr-da-tarefa-faz-isso)). O #2 é o exemplo.
- **Subtarefa** (tipo `Feature`, `Maintenance` ou `Bug`): um pedaço autocontido de uma camada só (server, client ou infra/docs), com o seu próprio PR contra a branch da tarefa, nunca contra a `main`. O corpo é detalhado o bastante para um agente começar a implementar sem perguntar nada. Os #3, #4 e #5 são os exemplos.

Uma issue corresponde a exatamente um PR. Quando um trabalho é largo ou grande demais para um PR, ele não vira uma issue com vários PRs: vira uma tarefa com subtarefas.

**Por que a divisão por camada existe:** misturar server e client num PR deixa a revisão penosa. Quem revisa a configuração do Spring Security não quer rolar por componentes Vue, e vice-versa. É uma regra sobre como o trabalho é fatiado em subtarefas, e a regra de um PR por issue decorre dela.

### Ligações nativas

Ligue as issues sempre pelos recursos nativos do GitHub, não só por uma linha "Subtarefa de #N" no corpo: links em prosa não aparecem em `gh api .../sub_issues`, não alimentam a barra de progresso do pai e não sobrevivem a alguém reorganizar o texto. Tarefas são sub-issues do seu épico, e subtarefas são sub-issues da sua tarefa:

```bash
for n in <filha> <filha>; do id=$(rtk proxy gh api repos/:owner/:repo/issues/$n --jq .id); rtk proxy gh api -X POST repos/:owner/:repo/issues/<pai>/sub_issues -F sub_issue_id=$id --jq '"linked #\(.number)"'; done
```

Esse comando contorna duas armadilhas. O endpoint quer o **id REST** da filha (`gh api repos/:owner/:repo/issues/<n> --jq .id`), não o número da issue nem o id GraphQL que `gh issue view --json id` devolve. E esse id precisa chegar como inteiro JSON, por isso o `-F` é obrigatório: `-f sub_issue_id=$id` manda uma string e falha com `422 Invalid property /sub_issue_id: … is not of type integer`. O `rtk proxy` mantém o filtro do rtk longe dos ids crus. Confira depois com `gh api repos/:owner/:repo/issues/<pai>/sub_issues --jq '.[].number'`.

Dependências também são registradas de forma nativa, além da seção `## Dependências` do corpo, para aparecerem no Project e na própria issue:

```bash
gh issue edit <N> --add-blocked-by <M>            # N é bloqueada por M
gh issue view <N> --json blockedBy --jq '[.blockedBy.nodes[].number] | join(", ")'
```

Repare no `.nodes[]` da leitura. O `blockedBy` é um objeto com `nodes` e `totalCount`, então um `.blockedBy[]` puro não devolve nada e parece exatamente uma escrita que falhou em silêncio. Adicionar de novo uma aresta que já existe falha com `Target issue has already been taken`, o que quer dizer que ela já está registrada. As duas flags precisam do `gh` 2.95 ou mais novo.

**Arestas de bloqueio são permanentes.** Deixe a aresta `blockedBy` no lugar depois que a issue que bloqueia fechar. Um bloqueador fechado quer dizer que a issue está desbloqueada, não que a ligação ficou velha, e removê-la apaga o histórico da dependência.

### Dependência entre tarefas aponta para a tarefa, nunca para uma subtarefa dela

Quando uma issue depende de trabalho de **outra** tarefa, a seção `## Dependências` e a aresta `blockedBy` nomeiam essa **tarefa**, não a subtarefa que por acaso guarda o código necessário. Só uma subtarefa que depende de uma subtarefa irmã, da mesma tarefa, nomeia a irmã diretamente.

O motivo é mecânico: um trabalho só fica pronto quando a branch da tarefa entra na `main`. O PR de uma subtarefa cai na branch da tarefa, então o código dele não está na `main` nem disponível fora daquela tarefa até ela inteira ser mergeada. Nomear a subtarefa afirma uma prontidão que não existe e aponta para um commit que nunca chega sozinho à `main`.

### Recomende tarefas, nunca uma subtarefa solta

Quando perguntarem o que fazer a seguir ou o que pode rodar em paralelo, recomende tarefas inteiras. Uma subtarefa não tem propósito sem o resto da sua tarefa, então nunca a sugira sozinha: compare bloqueios e paralelismo entre tarefas e cite subtarefas só como o conteúdo de uma tarefa. Quando a tarefa recomendada ou o seu épico tem `spec required`, o primeiro passo é a especificação; quando tem `design required`, é a rodada de design. Nunca código.

## Escrevendo uma issue

**Título:** curto e preciso, para que quem passa os olhos pela lista saiba do que se trata sem abrir. Subtarefas levam o prefixo da camada: `server: …`, `client: …`, `infra: …`, `docs: …`.

**Corpo:** as seções são em português e seguem os modelos abaixo; não invente um arranjo novo por issue. A propriedade mais importante é que um agente que pega a issue a frio consiga **começar a implementar só pelo corpo**, sem fazer nenhuma pergunta de volta.

### Modelo de subtarefa

```markdown
> Subtarefa de #<tarefa>. Mira a branch `feature/<tarefa>-<slug>`, não a `main`. Branch desta subtarefa: `<feature|fix>/<N>-<slug>`.

## Motivação
## Dependências        <- opcional; issues #N que bloqueiam ou ordenam esta
## Design
### Schema             <- só quando há changelog
### Server             <- só para as camadas que esta issue toca
### Client
## Fora de escopo
## Critérios de aceite
```

- **Motivação**: o que isto entrega e por quê, em **5 linhas ou menos**, em prosa. O que está quebrado ou faltando hoje e o que esta issue muda. Nada de detalhe de design.
- **Design**: a especificação inteira, os pontos de mudança e como eles se comportam. É onde quem implementa procura o que construir, então tem que **nomear os pontos de referência explicitamente**: caminhos de arquivo (`client/src/views/LoginView.vue`), repositórios, pacotes, assinaturas de endpoint, nomes de tabela e coluna, nomes de componente. Uma seção `### Server` que diz o que construir mas não onde não está terminada.
- **Fora de escopo**: o que alguém poderia supor que está incluído e não está, e qual issue cuida disso. É o que impede o PR de se espalhar.
- **Critérios de aceite**: uma lista verificável dos resultados observáveis que significam que a issue está pronta, escrita para ser conferida na aplicação rodando ou nos testes, não lendo o diff.

### Modelo de tarefa

```markdown
> **Tarefa agrupadora.** O trabalho acontece na branch de longa duração `feature/<N>-<slug>`, criada a partir da `main`. Cada subtarefa abaixo tem sua própria branch e seu próprio PR **contra essa branch**, nunca contra a `main`. Quando todas tiverem sido integradas, a branch da tarefa recebe um único PR para a `main`, com um `Closes #N` para esta tarefa e um para cada subtarefa; o merge desse PR fecha tudo. Os PRs das subtarefas formam uma stack do GitHub com base nesta branch; o usuário faz o merge da stack e pede o PR da tarefa.

## Motivação
## Escopo
## Subtarefas          <- lista de checkboxes das subtarefas, com a ordem sugerida
## Fora de escopo
## Critérios de aceite
```

`Escopo` faz o papel do `Design`: a tarefa diz a forma da entrega inteira, e cada subtarefa leva o detalhe de design da sua camada.

### Modelo de épico

```markdown
## Objetivo
## Sequência           <- as tarefas em ordem, com o que corre em paralelo
## Decisões já tomadas
## Fora de escopo
## Critério de conclusão
```

### Bugs e manutenção pequena

Defeitos pequenos e arrumações usam uma forma mais leve; não os force pelo modelo de subtarefa:

```markdown
## Problema
## Correção
## Por quê       <- opcional; só quando a correção não se explica sozinha
```

### Issues que precisam de especificação

Uma tarefa que nasceu como ideia (de uma triagem, por exemplo) e ainda não tem as regras decididas recebe a label **`spec required`**. **Nenhuma subtarefa abre e nenhum código começa antes de a especificação ser decidida com o usuário** e registrada no corpo. A tarefa abre com o aviso **Spec required.** logo no início e lista o que falta decidir numa seção `## A especificar`.

Enquanto tem a label, a tarefa pode ficar com Size, Camada e Prioridade vazios no Project. A label sai quando a especificação aprovada pelo usuário é escrita no corpo, e é quem a escreve que a remove. Quando a tarefa tem as duas labels, a ordem é: especificação, depois a rodada de design, depois as subtarefas.

### Issues que precisam de design

Trabalho que traz telas novas ou interface pesada de layout recebe a label **`design required`**, e **nada nele começa antes da rodada de design** que desenha essas telas. **Toda tela nova passa por essa rodada**, feita com a skill `hallmark`. A issue (normalmente um épico ou uma tarefa) abre com um aviso logo no início, como o do #33, e lista no corpo as telas que o design precisa cobrir, mais qualquer questão em aberto que a rodada tem que resolver.

As subtarefas são **abertas depois da rodada de design**, não junto com a issue, para que a seção `Design` de cada subtarefa de client aponte para o mockup da sua tela em vez de inventar a interface.

**Dashboards se agrupam em poucas visões.** Ao propor dashboards ou indicadores, junte-os em 2 a 4 visões com boa informação cada, nunca em dezenas de telas fragmentadas, e faça esse mapa antes de abrir as issues.

**Sem texto que explica o comportamento.** Títulos, subtítulos e textos que introduzem o conteúdo são essenciais e ficam. O que não entra, nem no mock nem na tela, é texto prolixo explicando o que um botão faz ou o efeito de preencher ou não um campo: se a tela precisa disso para ser entendida, o design não está bom e é ele que muda.

**A tela segue o design aprovado exatamente.** O design é o mock aprovado **mais os comentários do usuário nele**; quando os dois divergem, vale o comentário. A tela reproduz tudo o que o design mostra:
- layout, textos e rótulos;
- botões, cartões de resumo, colunas, filtros e onde eles ficam, abas e menus;
- diálogos, toasts e estados (vazio, carregando, erro);
- período e ordenação padrão;
- a versão de celular.

Só o código fica em inglês: identificadores, caminhos de URL e nomes de parâmetro. As exceções já decididas pelo usuário estão no `client/CLAUDE.md`. Uma tarefa com telas só está pronta quando cada tela foi comparada com o design no navegador, lado a lado; passar nos testes não basta.

**Falta de dado no server não corta a tela.** Se o server não entrega o que o design mostra, a tarefa ganha uma subtarefa de server que passa a entregar o dado. A especificação nunca diz "o mock diverge, vale X", nem "fica de fora porque o server não traz", nem troca um elemento do design por outro. Quando o design contradiz uma regra já decidida, pergunte ao usuário antes de escrever a especificação e registre a resposta na issue de design.

### Mantendo o corpo estável

O corpo é a declaração estável do trabalho. Contexto novo encontrado durante a implementação, abordagens revistas e achados de revisão entram como **comentários na issue** (`gh issue comment <N> --body-file <scratchpad>`), não reescrevendo o corpo: o corpo é a especificação, e os comentários são o histórico dela. Reescreva o corpo só quando a própria especificação mudou de verdade.

### Metadados na criação

**Toda issue recebe, ao ser criada:**

- O **tipo** certo: `Epic`, `Task`, `Feature`, `Maintenance` ou `Bug`. O tipo é o que classifica a issue; labels só entram quando houver necessidade real, como a `spec required` e a `design required`.
- Um **milestone**, sempre, com duas exceções: o usuário diz explicitamente para não vincular, ou a issue é um **spike** (pesquisa com prazo) ou um item de **backlog** (registrado para depois, sem agenda). Spikes e itens de backlog ganham o milestone quando forem de fato agendados. Veja os abertos com `gh api repos/:owner/:repo/milestones --jq '.[].title'` e defina com `gh issue create --milestone "<nome>"`.
- **`arthurgregorio` como assignee.**
- Um item no Project [webBudget](https://github.com/orgs/web-budget/projects/7), com os campos **Status**, **Size** (XS a XL), **Camada** (server, client, infra, docs) e **Prioridade** (P0 a P2) preenchidos. Uma tarefa com `spec required` pode deixar Size, Camada e Prioridade para quando a especificação sair.

## Nomes de branch

Toda branch que o Claude cria é `feature/<N>-<slug>` ou `fix/<N>-<slug>` e começa pelo número da sua issue, sem exceção. Só o próprio usuário pode contornar essa regra.

Não existe prefixo `maintenance/`: **manutenção usa `fix/`**. Tarefas usam `feature/`; subtarefas usam `feature/` ou `fix/` conforme o trabalho, por exemplo `fix/4-claude-md-raiz`.

**Remova a worktree assim que o trabalho dela estiver no remoto.** Quando a branch foi enviada, de preferência com o PR aberto, apague a worktree local por padrão, sem perguntar. Mantenha-a só quando o usuário quer continuar iterando ali sobre a revisão, ou quando ela ainda guarda commits não enviados. Worktrees de agentes em segundo plano (`.claude/worktrees/agent-*`) continuam `locked` depois que o agente termina, o que impede o usuário de fazer checkout da branch delas; quando o agente já reportou e não há nada por enviar, rode `git worktree unlock` e depois `git worktree remove` na hora, porque o lock nunca sai sozinho.

## Pull requests

**Uma issue, um PR.** Um PR implementa exatamente uma issue, e uma issue é implementada por exatamente um PR. Se o trabalho não cabe num PR só, esse é o sinal para reestruturá-lo como tarefa com subtarefas, não para abrir um segundo PR para a mesma issue. A única exceção ao "fecha exatamente uma issue" é o PR da tarefa para a `main`, que também fecha as subtarefas que carrega.

**Todo PR, ao ser criado, tem:**

- **`Closes #N`** no corpo, com a sua própria issue. Pela regra de um para um, o **corpo do PR** nunca usa `Refs #N` para a issue que implementa; um PR de subtarefa pode citar a tarefa como contexto, mas o único `Closes` é o da subtarefa. O **PR da tarefa para a `main`** tem uma linha `Closes #N` para a tarefa e uma para cada subtarefa. Isso vale só para o corpo do PR: as **mensagens de commit** usam `Refs #N`, porque repetir a palavra de fechamento em todo commit seria ruído.
- **Uma issue vinculada, conferida e não suposta.** Veja abaixo; num PR de subtarefa o vínculo exige uma chamada explícita ao `gh api graphql` e falha em silêncio sem ela.
- O **mesmo milestone da issue** (`gh issue view <N> --json milestone` para conferir). O `gh pr create` não o herda, então é o item mais fácil de esquecer.
- **`arthurgregorio` como assignee.**

Se algum deles não foi definido na criação, corrija na hora:

```bash
gh pr edit <N> --add-assignee arthurgregorio --milestone "<nome>"
```

### `Closes #N` não faz nada num PR de subtarefa: vincule com o `gh`

O GitHub só honra uma palavra de fechamento quando o PR mira a branch padrão do repositório. Um PR de subtarefa mira a branch da tarefa, então o `Closes #N` dele é ignorado: não há issue vinculada, nem entrada no painel Development, nem contribuição para o progresso da tarefa. Sobra só uma referência cruzada na linha do tempo, que é uma relação mais fraca e não sobrevive a alguém editar o texto do corpo. A linha `Closes #N` continua no corpo, porque diz o que o PR implementa, mas é uma declaração de intenção, não um mecanismo.

Por isso **o vínculo é obrigatório em todo PR de subtarefa, na criação**: logo depois do `gh pr create`, vincule o PR à issue com a mutation GraphQL `addCloseIssueReferences` (`<N>` é a issue, `<PR>` o pull request):

```bash
issue=$(gh issue view <N> --json id --jq .id); pr=$(gh pr view <PR> --json id --jq .id)
gh api graphql -f query='mutation($i:ID!,$p:ID!){addCloseIssueReferences(input:{issueId:$i,pullRequestIds:[$p]}){clientMutationId}}' -f i="$issue" -f p="$pr"
```

Depois **confira o vínculo em todo PR**, de subtarefa ou não; o resultado precisa trazer a issue do PR:

```bash
gh pr view <PR> --json closingIssuesReferences --jq '[.closingIssuesReferences[].number] | join(", ")'
```

Um resultado vazio quer dizer que não há vínculo; rode a mutation acima. O `gh pr create` reporta sucesso de qualquer jeito, e um corpo com `Closes #N` parece certo na revisão, então nada denuncia um vínculo faltando além dessa conferência. A `removeCloseIssueReferences` recebe a mesma entrada e desfaz um vínculo errado.

### Empilhamento (stack) entre subtarefas irmãs

Subtarefas irmãs, da mesma tarefa, não esperam umas pelas outras. **Todo PR de subtarefa entra numa [stack nativa do GitHub](https://docs.github.com/en/pull-requests/how-tos/stacked-pull-requests) cuja base é a branch da tarefa.** Requisito: a extensão `gh stack` (`gh extension install github/gh-stack`).

- O **primeiro** PR de subtarefa cria a stack: `gh stack link --base feature/<N>-<slug> <URL do PR>`.
- Cada PR **seguinte** sai da branch do PR anterior, abre contra ela (o diff mostra só as suas mudanças, e o CI roda nele também), cita no corpo o PR sobre o qual está empilhado e é acrescentado com `gh stack link <número da stack> <URL do PR>`.
- **Sempre** com `--base` ou com o número da stack. Sem eles, o `gh stack link` usa a `main` como base e redireciona o PR de baixo para ela (aconteceu com o #370 e foi desfeito).
- Passe a **URL do PR**, nunca o nome da branch: o comando faz push das branches que recebe como argumento.
- **Nunca a `main` como base de uma stack.** A stack avalia todo PR pelas regras da base, e o ruleset da `main` pede revisão e CodeQL das duas linguagens. Um PR só de server ou só de client não passa no CodeQL, e o GitHub só aceita bypass no PR de baixo de uma stack. O PR da tarefa para a `main` fica fora da stack, como sempre.
- Antes de ligar um PR, confira que a branch dele contém a base: `git merge-base --is-ancestor origin/<base> origin/<head>`. **Nunca rode `gh stack rebase` nem use o botão "Rebase stack"** sem pedir ao usuário: os dois fazem force push, e o rebase pelo site gera commits sem assinatura. Correções na base sobem para as branches de cima por merge.
- **Merge:** o merge do PR do topo leva todos os de baixo, e o de um PR do meio leva os de baixo dele. Depois do merge, o PR seguinte é redirecionado sozinho.
- Cada PR tem um pai só: uma subtarefa que precisa de várias irmãs não mergeadas espera por elas em vez de juntar as branches delas. Esperar é a regra para dependências **entre** tarefas diferentes.

**Pilha não ligada** (feita à mão, sem `gh stack`): o GitHub só redireciona o PR de cima quando a branch de baixo é apagada. Mergear o de baixo e manter a branch deixa o de cima apontando para ela, e o conteúdo dele nunca chega à branch da tarefa. Nesse caso, passe ao usuário a ordem de merge explícita (de cima para baixo, ou apagando cada branch depois do merge e conferindo a base antes do próximo) e, depois, compare a branch da tarefa com as da pilha. Prefira sempre ligar a pilha.

### Fechando subtarefas: o PR da tarefa faz isso

**Subtarefas nunca se fecham sozinhas.** O merge de um PR de subtarefa na branch da tarefa não fecha nada, porque essa branch não é a padrão. Os PRs de subtarefa são mergeados com squash e mensagem em branco, então o `Closes #N` do corpo nunca chega a um commit, e os commits da branch dizem `Refs #N`. Um passo de "fechar à mão depois do merge" fica sem dono quando o merge acontece no navegador, e acaba pulado.

Por isso o **PR da tarefa para a `main` é o mecanismo**. Ele mira a branch padrão, então o GitHub honra todas as palavras de fechamento do corpo. Ao abri-lo:

1. Liste as subtarefas da tarefa e escreva uma linha `Closes #N` para cada uma, mais a da própria tarefa:

   ```bash
   rtk proxy gh api repos/:owner/:repo/issues/<tarefa>/sub_issues --jq '.[] | "#\(.number) \(.state) \(.title)"'
   ```

2. **Antes de entregar o PR para merge**, confirme que o GitHub vinculou todas. Qualquer subtarefa aberta que falte na saída abaixo bloqueia o merge; corrija o corpo em vez de mergear por cima:

   ```bash
   comm -23 <(rtk proxy gh api repos/:owner/:repo/issues/<tarefa>/sub_issues --jq '.[] | select(.state=="open") | .number' | sort) <(rtk proxy gh pr view <PR> --json closingIssuesReferences --jq '.closingIssuesReferences[].number' | sort)
   ```

   Saída vazia quer dizer que toda subtarefa aberta está vinculada.

3. **Depois do merge**, confirme que nada ficou aberto. A saída precisa ser vazia:

   ```bash
   rtk proxy gh api repos/:owner/:repo/issues/<tarefa>/sub_issues --jq '.[] | select(.state=="open") | "#\(.number) \(.title)"'
   ```

**Subtarefa nova depois do PR da tarefa.** Quando uma subtarefa é criada depois de o PR da tarefa para a `main` existir, acrescente o `Closes #N` dela ao corpo desse PR e confira o vínculo de novo (passo 2).

**Depois de cada rodada de merge, audite.** Antes de reportar o trabalho como pronto, confira as issues abertas do milestone e os vínculos dos PRs mergeados: issue sem PR vinculado ou entregue na `main` e ainda aberta é corrigida na hora (vínculo pela GraphQL, ou fechamento com um comentário que cita o PR da subtarefa e o da tarefa).

**O usuário faz o merge da stack e pede o PR da tarefa.** Trabalhe todas as subtarefas da tarefa, abra cada PR na stack, vincule-o e então pare e reporte a stack em ordem. Nunca faça merge de um PR de subtarefa, e nunca abra o PR da tarefa para a `main` sem pedido: o usuário valida o trabalho, faz o merge da stack (o do topo leva todos) e então pede o PR da tarefa.

### CI

O CI separa os jobs por camada, atrás de um job que detecta quais camadas mudaram, então um PR só de client não roda o job do server, e vice-versa.

**Não espere o CI do PR.** As checagens locais da camada (lint, testes, build) rodam antes do push. Depois, abra o PR, vincule e confira a issue e o milestone e reporte, sem `gh pr checks --watch` nem laço de espera: o usuário avisa quando algo falha. Vale também para a sessão que leva uma stack inteira, que segue para a próxima subtarefa sem esperar o CI da anterior.

## Escrevendo corpos de issue e PR

**Nunca quebre linha dentro da prosa.** Escreva cada parágrafo e cada item de lista numa única linha física, por mais longa que fique. O GitHub mostra um `\n` dentro de um parágrafo como quebra de linha visível, então cada quebra "arrumadinha" em 90 caracteres vira uma quebra na tela e transforma a issue numa coluna estreita e picotada. A estrutura do markdown (títulos, linhas em branco entre blocos, marcadores `- ` e `1. `) continua na sua própria linha; só a prosa *dentro* de um bloco fica sem quebra.

**Passe os corpos com `--body-file`**, apontando para um arquivo no scratchpad da sessão, em vez de um heredoc inline. Corpos grandes, com crases e blocos de código, já quebraram a citação de heredocs inline antes.

## Comentários no código

**Código não leva comentários.** Se algo precisa de um comentário para ser entendido, o design está errado: refatore até que os nomes e a estrutura digam isso. Vale para o código do server e do client, em todo o repositório, não só na pasta que está sendo editada.

A única exceção é um **porquê não óbvio que o código não consegue expressar e que a issue ainda não registra**: uma peculiaridade do framework, um bug de uma dependência sendo contornado, uma restrição escondida que torna errada a implementação óbvia. Nunca um comentário que repete a especificação, a regra de negócio ou o que a próxima linha faz.

<!-- rtk-instructions v2 -->
# RTK (Rust Token Killer) - Token-Optimized Commands

## Golden Rule

**Always prefix commands with `rtk`**. If RTK has a dedicated filter, it uses it. If not, it passes through unchanged. This means RTK is always safe to use.

**Important**: Even in command chains with `&&`, use `rtk`:
```bash
# ❌ Wrong
git add . && git commit -m "msg" && git push

# ✅ Correct
rtk git add . && rtk git commit -m "msg" && rtk git push
```

## RTK Commands by Workflow

### Build & Compile (80-90% savings)
```bash
rtk cargo build         # Cargo build output
rtk cargo check         # Cargo check output
rtk cargo clippy        # Clippy warnings grouped by file (80%)
rtk tsc                 # TypeScript errors grouped by file/code (83%)
rtk lint                # ESLint/Biome violations grouped (84%)
rtk prettier --check    # Files needing format only (70%)
rtk next build          # Next.js build with route metrics (87%)
```

### Test (60-99% savings)
```bash
rtk cargo test          # Cargo test failures only (90%)
rtk go test             # Go test failures only (90%)
rtk jest                # Jest failures only (99.5%)
rtk vitest              # Vitest failures only (99.5%)
rtk playwright test     # Playwright failures only (94%)
rtk pytest              # Python test failures only (90%)
rtk rake test           # Ruby test failures only (90%)
rtk rspec               # RSpec test failures only (60%)
rtk test <cmd>          # Generic test wrapper - failures only
```

### Git (59-80% savings)
```bash
rtk git status          # Compact status
rtk git log             # Compact log (works with all git flags)
rtk git diff            # Compact diff (80%)
rtk git show            # Compact show (80%)
rtk git add             # Ultra-compact confirmations (59%)
rtk git commit          # Ultra-compact confirmations (59%)
rtk git push            # Ultra-compact confirmations
rtk git pull            # Ultra-compact confirmations
rtk git branch          # Compact branch list
rtk git fetch           # Compact fetch
rtk git stash           # Compact stash
rtk git worktree        # Compact worktree
```

Note: Git passthrough works for ALL subcommands, even those not explicitly listed.

### GitHub (26-87% savings)
```bash
rtk gh pr view <num>    # Compact PR view (87%)
rtk gh pr checks        # Compact PR checks (79%)
rtk gh run list         # Compact workflow runs (82%)
rtk gh issue list       # Compact issue list (80%)
rtk gh api              # Compact API responses (26%)
```

### JavaScript/TypeScript Tooling (70-90% savings)
```bash
rtk pnpm list           # Compact dependency tree (70%)
rtk pnpm outdated       # Compact outdated packages (80%)
rtk pnpm install        # Compact install output (90%)
rtk npm run <script>    # Compact npm script output
rtk npx <cmd>           # Compact npx command output
rtk prisma              # Prisma without ASCII art (88%)
rtk uv run <cmd>        # Compact uv project command output
```

### Files & Search (60-75% savings)
```bash
rtk ls <path>           # Tree format, compact (65%)
rtk read <file>         # Code reading with filtering (60%)
rtk grep <pattern>      # Search grouped by file (75%). Format flags (-c, -l, -L, -o, -Z) run raw.
rtk find <pattern>      # Find grouped by directory (70%)
```

### Analysis & Debug (70-90% savings)
```bash
rtk err <cmd>           # Filter errors only from any command
rtk log <file>          # Deduplicated logs with counts
rtk json <file>         # JSON structure without values
rtk deps                # Dependency overview
rtk env                 # Environment variables compact
rtk summary <cmd>       # Smart summary of command output
rtk diff                # Ultra-compact diffs
```

### Infrastructure (85% savings)
```bash
rtk docker ps           # Compact container list
rtk docker images       # Compact image list
rtk docker logs <c>     # Deduplicated logs
rtk kubectl get         # Compact resource list
rtk kubectl logs        # Deduplicated pod logs
```

### Network (65-70% savings)
```bash
rtk curl <url>          # Compact HTTP responses (70%)
rtk wget <url>          # Compact download output (65%)
```

### Meta Commands
```bash
rtk gain                # View token savings statistics
rtk gain --history      # View command history with savings
rtk discover            # Analyze Claude Code sessions for missed RTK usage
rtk proxy <cmd>         # Run command without filtering (for debugging)
rtk init                # Add RTK instructions to CLAUDE.md
rtk init --global       # Add RTK to ~/.claude/CLAUDE.md
```

## Token Savings Overview

| Category | Commands | Typical Savings |
|----------|----------|-----------------|
| Tests | vitest, playwright, cargo test | 90-99% |
| Build | next, tsc, lint, prettier | 70-87% |
| Git | status, log, diff, add, commit | 59-80% |
| GitHub | gh pr, gh run, gh issue | 26-87% |
| Package Managers | pnpm, npm, npx | 70-90% |
| Files | ls, read, grep, find | 60-75% |
| Infrastructure | docker, kubectl | 85% |
| Network | curl, wget | 65-70% |

Overall average: **60-90% token reduction** on common development operations.
<!-- /rtk-instructions -->