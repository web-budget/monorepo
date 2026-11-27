# webBudget

O webBudget é um sistema livre e de código aberto para controle de finanças pessoais: carteiras, cartões, centros de custo, classificações, períodos financeiros e os movimentos do dia a dia, com usuários e permissões por área. A interface está em português do Brasil e em inglês.

- **Site:** https://webbudget.com.br/
- **Versão estável:** a 3, em [arthurgregorio/web-budget](https://github.com/arthurgregorio/web-budget)

> A versão 4 está em desenvolvimento e ainda em fase `alpha`. As versões `alpha` **não geram release nem imagem Docker**: quem quiser experimentá-las compila o código, como descrito em [Compilar a partir do código-fonte](https://github.com/web-budget/monorepo/wiki/Compilar-do-codigo-fonte).

## Início rápido (desenvolvimento)

Este repositório é um monorepo: `server/` (Kotlin, Spring Boot 4, jOOQ, PostgreSQL 18) e `client/` (Vue 3, TypeScript). É preciso ter JDK 25, Docker, Node 24 e pnpm.

Em um terminal, a partir de `server/`, suba a API na porta 8085 (o PostgreSQL e o MailDev sobem junto):

```bash
./gradlew bootRun
```

Em outro, a partir de `client/`, suba a interface na porta 8086:

```bash
pnpm install
pnpm dev
```

Abra **http://localhost:8086**. Na primeira subida do server, o usuário `admin@webbudget.com.br` é criado com uma senha aleatória, que aparece no log. A página [Desenvolvimento local](https://github.com/web-budget/monorepo/wiki/Desenvolvimento-local) traz os detalhes.

Uma instância nova começa sem centros de custo nem classificações. A pasta [`sample-data/`](sample-data) tem um cadastro inicial pronto, que se carrega uma vez com `./sample-data/load-sample-data.ps1` (ou `.sh`): veja a página [Sample data](https://github.com/web-budget/monorepo/wiki/Sample-data).

## Documentação

Toda a documentação fica na [wiki](https://github.com/web-budget/monorepo/wiki):

- **Começando:** [Visão geral e funcionalidades](https://github.com/web-budget/monorepo/wiki/Visao-geral-e-funcionalidades)
- **Tecnologia e desenho:** [Arquitetura](https://github.com/web-budget/monorepo/wiki/Arquitetura), [Stack do server](https://github.com/web-budget/monorepo/wiki/Stack-do-server), [Stack do client](https://github.com/web-budget/monorepo/wiki/Stack-do-client), [Modelo de segurança](https://github.com/web-budget/monorepo/wiki/Modelo-de-seguranca)
- **Compilar e rodar:** [Compilar a partir do código-fonte](https://github.com/web-budget/monorepo/wiki/Compilar-do-codigo-fonte), [Desenvolvimento local](https://github.com/web-budget/monorepo/wiki/Desenvolvimento-local), [Pipeline de CI](https://github.com/web-budget/monorepo/wiki/Pipeline-de-CI)
- **Configuração:** [Variáveis de ambiente](https://github.com/web-budget/monorepo/wiki/Variaveis-de-ambiente), [Perfis do Spring](https://github.com/web-budget/monorepo/wiki/Perfis-do-Spring), [Login com Google](https://github.com/web-budget/monorepo/wiki/Login-com-Google), [E-mail](https://github.com/web-budget/monorepo/wiki/E-mail)
- **Projeto:** [Lançamentos](https://github.com/web-budget/monorepo/wiki/Lancamentos), [Contribuindo](https://github.com/web-budget/monorepo/wiki/Contribuindo)

## Acompanhe o desenvolvimento

- [Issues](https://github.com/web-budget/monorepo/issues): todo trabalho começa como uma
- [Milestones](https://github.com/web-budget/monorepo/milestones): o que entra em cada versão
- [Project do webBudget](https://github.com/orgs/web-budget/projects/7): o andamento por tarefa

## Contato

Quer contribuir ou tirar uma dúvida? Escreva para contato@consusoft.com.br.

## Licença

Distribuído sob a [Licença Apache 2.0](LICENSE).
