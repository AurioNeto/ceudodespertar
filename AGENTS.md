# Instruções para agentes — Céu do Despertar

Vale para qualquer agente de código neste repositório (Codex, Claude Code e outros). Leia antes de tocar em qualquer arquivo. O `CLAUDE.md` da raiz importa este arquivo.

## O front é a fonte da verdade

O projeto segue o método do Doc 1 §8.1: design → front-end com mocks → backend. As telas em `apps/web` já existem e dizem o que o sistema mostra e faz. **O backend serve o que a tela consome. A tela não muda para caber no backend.**

Em novembro de 2026 um agente fez o backend do financeiro antes de olhar as telas e depois reescreveu dez telas para caber na API, apagando 266 arquivos do front e os testes junto. O CI ficou verde. Foi tudo revertido (`docs/runbooks/restauracao-pr-235.md`). As regras abaixo existem para isso não se repetir.

### Ao ligar uma tela à API

1. **Antes de qualquer código**, escreva na task o inventário de blocos da tela: bloco, tipo que ele consome, rota que vai servi-lo, e se fica em mock nesta etapa.
2. **Só muda o miolo do hook de dados** (`pages/**/hooks/`, `consultas.ts`, `comandos.ts`). O hook mantém a assinatura e o formato de retorno. O padrão de código é o de `apps/web/src/pages/sistema/AcessosPage/consultas.ts` e `comandos.ts`.
3. **Não mudam:** componentes, textos, rotas, permissões do menu (`app/shell/menu.ts`, `telas.ts`) e testes de tela (`*.test.tsx`, `*.dom.test.tsx`). Não apague nem reescreva teste para o gate passar.
4. **Bloco que a etapa não serve continua em mock.** Exemplos: sugestão do cupom por IA, conciliação nos cartões de conta, gráfico de estoque do Painel. A `fonte` da tela em `app/shell/telas.ts` só vira `'api'` quando o último bloco for servido; até lá a faixa de demonstração continua.
5. **Faltou campo no contrato:** promova o tipo do mock para `packages/contracts`, sem mudar a forma. Os tipos de leitura das telas ficam em `packages/contracts/src/readmodels.ts`.

### Ao escrever uma consulta (read model) no backend

- A consulta nasce do inventário de blocos da tela e devolve exatamente o tipo que a tela já consome. Não crie um tipo paralelo com a forma do domínio.
- Campo que a etapa não tem como preencher vira pergunta ao dono na task. Não invente valor e não tire o campo.

### Conflito entre tela e domínio

A tela pode restringir o domínio, nunca contradizê-lo (Doc 4). Se a tela pede algo que o Doc 2 proíbe, ou o domínio exige algo que a tela não mostra: **pare**. Descreva o conflito e as duas opções na task e espere o dono. Não mude a tela nem o domínio por conta própria.

### Limites de cada PR

- PR de backend não toca `apps/web`. PR de integração de tela não toca `apps/api/src/modules`.
- Um PR por peça. Uma tela por PR.
- O executor não altera o objetivo nem os critérios de aceite da própria task. Pode registrar o que fez em "Como ficou"; remover algo da tela nunca é registrado como decisão do executor.

### O gate

`pnpm paridade:web --base <ref>` roda no CI em todo PR e falha se o PR apagar teste de tela, tirar caso de teste de tela ou apagar arquivo em `apps/web/src/pages/**/components/`. Mudar tela é decisão do dono: só ele aplica o rótulo `tela-alterada-pelo-dono`, que libera o PR. Não peça o rótulo para destravar uma integração; o gate vermelho numa integração quer dizer que a integração está errada.

## Onde está o resto

- Estado do projeto e tasks: `project-flow/README.md` e `project-flow/tasks/`.
- O que construir e em que ordem: `docs/CDD-06-plano-do-backend.md`. Como construir o backend: `docs/CDD-07-backend-arquitetura-e-banco.md`. Estrutura do front: `docs/CDD-08-frontend-estrutura.md`.
- Domínio, permissões e telas: Docs 1 a 5 em `project/uploads/CDD - System/`.
- Regras de revisão e convenções de código: `.codefox.yaml`. Processo de PR e merge: seção "Convenções" de `project-flow/README.md`.
- Regra de negócio mora no backend, nunca no SQL.
