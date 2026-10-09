# Sistema de Gestão — Céu do Despertar (CDD)

## Documento 8 — Estrutura do front-end (apps/web)

**Versão 1.0** · outubro/2026 · Status: aceito pelo dono em 09/10/2026; decisões de comportamento e texto na seção 15

> Pressupõe o Documento 1 (Arquitetura), o Documento 4 (Mapa de telas) e o Documento 5 (Sistema de design, §4, em `project/uploads/CDD - System/CDD-v2_2-05-sistema-de-design.md`). Os [Documentos 6](CDD-06-plano-do-backend.md) e [7](CDD-07-backend-arquitetura-e-banco.md) tratam do backend e não se aplicam aqui.
> O mapeamento arquivo a arquivo da migração está no [anexo temporário](CDD-08-anexo-mapa-de-migracao.md). Este documento é a convenção. O anexo sai do repositório quando a migração terminar.

---

## 1. O que este documento decide e o que não decide

**Decide**

- as camadas de `apps/web/src/` e a direção das dependências (seção 3);
- o design system em níveis atômicos: o que entra, quem importa quem (seção 4);
- a unidade autocontida: pasta, porta única e privacidade (seção 5);
- onde cada trecho de código mora: a regra do ancestral comum (seção 6);
- a organização das telas por módulo e fluxo (seção 7);
- testes, apoio de teste e mocks (seção 8); acesso a dados (seção 9); nomes, imports e barrels (seção 10);
- a árvore-alvo (seção 11), as regras que verificam a estrutura (seção 12) e a ordem e o protocolo da migração (seção 13).

**Não decide**

- o comportamento das telas. Regras de negócio, textos e cálculos não mudam numa migração estrutural. Divergências encontradas são registradas (seção 14) e corrigidas em PR próprio;
- as correções de comportamento e de texto: as decisões estão na seção 15, e cada correção vai em PR próprio;
- o conteúdo do Documento 5, que não é reescrito;
- o backend.

---

## 2. Decisões do dono (09/10/2026)

O dono aprovou as recomendações da proposta em todos os pontos. Quatro decisões fixam a convenção.

| Tema | Decisão |
|---|---|
| O que é global | O `ds/` é global por definição: o catálogo do Documento 5 §4 e os primitivos genéricos (sem regra de domínio) que 3 ou mais telas pedem, contando uso real e re-implementações comprovadas. Isso é exceção declarada à regra do ancestral comum. Todo o resto (composições de tela, hooks, utils, constantes, mocks e apoios de teste) segue a regra do ancestral comum, com granularidade por export. |
| Páginas | `pages/{financeiro, eventos, estoque, pessoas, sistema}`, pelo módulo da primeira permissão da tela em `telas.ts`; `pages/transversal/` para telas sem módulo. Subgrupo de fluxo só com compartilhamento exclusivo: `financeiro/lancamentos`, `eventos/inscricao`, `transversal/entrada`. Devoluções fica em eventos; Ayahuasca e Feitio, em estoque; a `InscricaoPublicaPage`, em `eventos/inscricao`. O menu não muda. |
| Pastas atômicas | Só no `ds/`: `fundacao`, `providers`, `atoms`, `molecules`, `organisms`, `templates`. Cada nível só importa os de baixo. |
| Convenções | Unidade = pasta PascalCase com o nome do componente + `index.ts` (porta única; tudo dentro é privado à subárvore). Alias `@/` para atravessar camada ou módulo; relativo dentro da unidade. Primitivos promovidos mantêm o nome em pt-BR (o catálogo do Documento 5 continua em inglês). Tipos continuam exportados do arquivo que os define; `tipos.ts` quando 2 ou mais arquivos da unidade compartilham. |

**Ajustes aceitos nas revisões de conformidade e de viabilidade**

- O Tailwind sai em etapa própria (seção 15). Até lá fica como está: o preflight está ativo (`styles/global.css` importa `tailwindcss`) e reseta `ul`, `ol`, `table`, `input`, `img` e outros elementos, então a remoção leva essas regras para o `base.css` e é provada pela captura de telas, fora de qualquer etapa de limpeza.
- `Portao` só vai para `ds/templates` depois que a prop `volta`, sem uso, sai. O `ds` não pode depender de `react-router`.
- `FaixaDeDemonstracao` fica em `app/demonstracao/FaixaDeDemonstracao/` como UI de app. Sai de `ds/` na etapa de app/ em subpastas, sem nivelar antes.
- `mocks/ids.ts` fica em `src/mocks/`, a raiz da demonstração, e não em `lib/`.
- `iniciais` fica em `lib/formato` até a `MeuPerfilPage` passar a usar o `Avatar`.
- `RotuloDeCampo` é exportado pelo barrel do `ds`, porque `CampoDeTags` (em `pages/`) o usa.
- `Th` e `Td` são átomos do `ds` até a adoção do `DataTable`.
- `SheetOption` vira tipo comum de opção em `ds/fundacao/opcao.ts`: molécula não importa organismo.
- `eventoDoLink` acompanha `linkDaCerimonia` em `eventos/inscricao/mocks/linkDaCerimonia.ts`.
- `PERMISSAO_QUE_O_EU_TEM`, `PERMISSAO_QUE_O_EU_NAO_TEM`, `Sonda` e `ler` (testes de sessão) ficam junto de `criarEu` em `src/testes/sessaoDeTeste.tsx`. Os testes que os usam se repartem entre `app/sessao` e `pages/transversal/entrada`, então o ancestral comum é `src/`. `ler` hoje lê a tela de uma variável do próprio arquivo de teste e passa a recebê-la por parâmetro (`ler(tela, id)`): mudança só em apoio de teste, declarada na etapa.
- O `Aviso` da entrada tem um consumidor só, o `MensagemDeEntradaNaTela`, e vai para `transversal/entrada/components/MensagemDeEntradaNaTela/components/Aviso/`. O tipo `TomDeAviso` vai para `transversal/entrada/tipos.ts`, junto de `MensagemDeEntrada`. Na etapa de primitivos novos, o `ds/molecules/Aviso` absorve o componente.
- `Layout` é composição de app, fora da escala atômica. `ActionBar` e `ScreenHeader` são moléculas.
- Testes de hook são `useX.dom.test.ts` (projeto dom do vitest), ou `.dom.test.tsx` quando precisam de JSX.
- As regras de camada que proíbem `ds/`, `dados/` e `lib/` de importar `testes/` isentam os próprios `*.test.*`.
- A subárvore da `AcessosPage` segue o código do PR #55, mesclado em 09/10/2026. O anexo foi conferido no código mesclado.

**Exceções declaradas**

| Regra afetada | Exceção | Porquê |
|---|---|---|
| Regra do ancestral comum (seção 6) | O `ds/` é global por definição: catálogo do Documento 5 §4 e primitivos genéricos que 3 ou mais telas pedem ficam no `ds/` mesmo quando todos os consumidores estão em `pages/`. Exemplos: `Select` (15 áreas, todas em `pages/`), os 7 itens do catálogo usados só pelo `RegistrarLancamentoPage`, e `Th` e `Td` (3 telas do financeiro). | O `ds/` é a única biblioteca de UI global. Descer e subir de volta é churn. Hoje há 29 das cerca de 60 telas do Documento 4, e a régua do Documento 5 conta as telas planejadas. Uma segunda biblioteca global recriaria o problema atual: o `ds/` repete à mão o estilo de rótulo em caixa alta (14 ocorrências de `textTransform: "uppercase"` em `ds/`), porque não pode depender de `components/`. |
| Código sem consumidor é removido (seção 6.4) | `ConfirmAction`, `DataTable`, `PendencyCard` e `RegimeVocabulary`/`useTermo` ficam no `ds/` sem consumidor, com teste. | `ConfirmAction` e `DataTable` já são re-implementados por telas existentes (`FechamentoPage`; as 3 tabelas com `Th` e `Td`). `PendencyCard` e `RegimeVocabulary` (Documento 1 §4.3) carregam invariantes que as etapas B1 e B2 vão usar. |
| `ds/` é a única camada global de UI (seção 6) | `app/` tem UI própria do shell: `FaixaDeDemonstracao` em `app/demonstracao/FaixaDeDemonstracao/`, `Layout` em `app/shell/Layout/` e, depois da divisão, `TelaSemAcesso` em `app/shell/components/TelaSemAcesso/`. | A faixa sinaliza o modo de demonstração do app e não é design. O `Layout` filtra o menu por permissão e conta a fila, que é regra de app. Decisão do dono. |
| Mock é só dado de demonstração (seção 8.3) | `mocks/ids.ts`, que aplica a marca de tipo às fixtures, fica em `src/mocks/`. | Só a demonstração precisa forjar ids; o código de produção recebe ids da API. Em `lib/` ele viraria utilitário global de produção. Decisão do dono. |
| Um sistema de estilo só (seção 10.5) | `@import "tailwindcss"` e o `@theme` de `styles/global.css` continuam até a etapa "Remover o Tailwind". | O preflight do Tailwind reseta `ul`, `ol`, `table`, `input`, `img` e outros elementos usados em 22 arquivos, e `base.css` não cobre isso. Remover muda o visual e exige captura. |
| Gate do e2e do B0 (seção 13.5) | Antes do gate, só linhas de import de `app/`, `dados/`, sistema e transversal mudam. Nenhum arquivo dessas pastas é movido, dividido ou tem corpo alterado. | Promover primitivos, mover a fundação e mover telas de demonstração muda o caminho que esses arquivos importam. Esperar o gate pararia todo o plano. |
| Operação de mover não muda corpo (seção 13.2) | Na etapa `lib/formato por export`, `formatarDinheiro` passa a chamar `formatarValor(centavos / 100)`, para não exportar o `Intl.NumberFormat` privado (BRL) de `lib/formato`. | `formatarValor` fica em `lib` e `formatarDinheiro` desce para `pages/utils`. É o mesmo formatador, com o mesmo resultado, coberto pelos testes de formato da etapa de caracterização de `lib/formato` e `components`. |
| Regras de camada que proíbem importar `testes/` | `testes/` não está no alvo de `lib-e-folha`, `dados-sem-ui` e `ds-autonomo`. Quem barra é `apoio-de-teste-so-em-teste`, que isenta os `*.test.*`. | Os testes de `lib`, `dados` e `ds` precisam das fábricas de `src/testes` (ex.: a fábrica de `ErroDaApi` em `dados/clienteDeConsultas.test.ts`). Decisão do dono. |
| `mock-global-so-dados` | Até a etapa de mocks transversais, `src/mocks/financeiro.ts` guarda só o que o Painel usa e importa `contas` de `@/pages/mocks/contas`. É 1 aviso previsto. | `contas` cruza financeiro e eventos e desce na etapa de mocks transversais. As sobras do Painel só descem quando o Painel mudar de pasta, depois do gate. |
| Hook fora do `ds/` (seção 4.1) | `useDensidade` e o tipo `Density` ficam em `ds/fundacao/`. Hoje nenhum arquivo do `ds/` consome o hook; `app/shell/Layout` e as páginas consomem. | A densidade é token do design system (Documento 5, §3.4): as duas densidades, campo e escritório, são definidas no `ds/`. O hook que lê o token fica com ele. |
| Regra do ancestral comum dentro de `app/` (seção 6.1) | Em `app/`, a área (`shell`, `sessao`, `rotas`, `providers`, `demonstracao`) é o nível de posse. Módulos, hooks, utils e componentes internos ficam em `app/<área>/{hooks,utils,components}` mesmo com um só consumidor (ex.: `derivarEstado` e `useExisteUsuarioOidc`, só do `SessaoProvider`; `nomeDaTela`, `useContagemDoLote` e `TelaSemAcesso`, só do `Layout`). | `app/` é composição de app e expõe cada área por um `index.ts`. Descer a regra de app para dentro das pastas de componente a espalharia sem ganho de leitura. |
| Renome ao entrar numa unidade ou ao repartir (seção 10.1) | O arquivo pode perder o sufixo que repetia o dono (`consultasDeAcessos.ts` → `AcessosPage/consultas.ts`; `comandosDeAcessos.ts` → `comandos.ts`; `mensagemDeErroDeAcessos.ts` → `utils/mensagemDeErro.ts`) ou ganhar o nome da anatomia (`lib/chaveDeIdempotencia.ts` → `hooks/useChaveDeIdempotencia.ts`; `clienteHttp.tsx` → `ClienteHttpProvider/ClienteHttpProvider.tsx`). O conteúdo é idêntico, conferido pelo `conferir-movimento` com o par antigo → novo. `textosDeAcessos.ts` não é renome: reparte-se por export. Teste que acompanha um export repartido toma o nome do módulo de destino (`app/navegacao.test.ts`, que só testa `rotaAtiva`, vira `app/shell/rotaAtiva.test.ts`). | Dentro da unidade, o nome do dono já está no caminho. A anatomia (seção 5.1) é o que o leitor procura. |

---

## 3. Camadas de `src/` e direção das dependências

| Camada | O que contém | Não importa |
|---|---|---|
| `lib/` | Funções puras (`formato.ts`; `numero.ts` ao fim da migração) | Outra camada; React |
| `dados/` | Acesso a dados: clientes HTTP e OIDC, erros, consulta e comando | UI (`app`, `components`, `ds`, `mocks`, `pages`); React |
| `ds/` | Design system, em níveis atômicos (seção 4) | `app`, `pages`, `dados`, `mocks`, `react-router`. Pode importar `lib/`, `@cdd/contracts` e bibliotecas externas |
| `app/` | Composição e UI do shell: providers, rotas, sessão, demonstração e shell (`Layout`, menu). Fora da escala atômica | `pages/`, exceto `router.tsx` |
| `pages/` | Telas, por módulo (seção 7). Usa `ds/` e `dados/` pelo barrel e `app/` só pela API pública | `app/` fora de `sessao`, `rotas`, `providers` e `demonstracao` |
| `mocks/` (raiz) | Dados de demonstração lidos por `app/` e `pages/` | Tudo, exceto `lib/` e `@cdd/contracts` |
| `testes/` | Apoio de teste global (seção 8.2) | Código de produção nunca importa `testes/` |
| `styles/` | Entrada do CSS (`global.css`) | — |

Direção das dependências:

```
lib/  ◀── dados/  ◀── app/
lib/  ◀── ds/     ◀── pages/
pages/ ──▶ app/sessao, app/rotas, app/providers, app/demonstracao   (só pela API pública, index.ts)
app/router.tsx ──▶ pages/<modulo>/<Nome>Page/index.ts               (única ligação de app com pages)
```

- `components/` deixa de existir. Cada trecho vai para o nível que lhe cabe (seção 6).
- Em `app/`, componente React vira unidade (seção 5), com `index.ts`. Módulo sem componente (`rotas.ts`, `telas.ts`, `menu.ts`, `acesso.ts`, `estadoDaSessao.ts`) fica como arquivo na pasta da área, e a área é exposta por `index.ts`.
- Regras que verificam a direção: `lib-e-folha`, `dados-sem-ui`, `ds-autonomo`, `app-nao-conhece-paginas`, `roteador-so-pelo-index-da-pagina` e `paginas-so-pela-api-publica-do-app` (seção 12).

---

## 4. O design system em níveis atômicos

### 4.1 Admissão

Entra no `ds/`:

1. todo item do catálogo do Documento 5 §4;
2. todo primitivo genérico, sem regra de domínio, que 3 ou mais telas pedem, contando uso real e re-implementações comprovadas. É a régua do Documento 5.

Não entra no `ds/`: composição de tela, hook, util, constante, mock e apoio de teste. Esses seguem a regra do ancestral comum (seção 6), com a exceção declarada de `useDensidade` (seção 2).

Um componente admitido fica no `ds/` mesmo quando todos os consumidores estão em `pages/` ou em uma única tela (exceção declarada, seção 2). Item do catálogo sem consumidor fica no `ds/`, com teste (seção 6.4).

As categorias do Documento 5 §4 dizem o papel do componente; o nível atômico diz como ele é composto. Uma não deriva da outra:

| Categoria (Documento 5 §4) | Componentes e nível |
|---|---|
| Estrutura | `AppShell` (template); `ScreenHeader` e `ActionBar` (moléculas); `BottomSheet` e `WorkQueue`/`WorkQueueItem` (organismos; a fila ainda não existe no código) |
| Dado | `AmountDisplay` e `StatusBadge` (átomos); `AmountInput`, `RecordRow`, `SuggestionChip`, `DefaultField` e `AttachmentCapture` (moléculas); `Receipt` e `DataTable` (organismos) |
| Domínio | `RegimeVocabulary` (provider, base); `ConfirmAction`, `PeriodLock` e `TwoAxisGuard` (moléculas); `PendencyCard` (organismo) |
| Estado | `SkeletonList`, `EmptyState`, `InfraError`, `DomainError` e `PermissionDenied` (moléculas) |

### 4.2 Níveis

| Nível | Pasta | Conteúdo | Importa |
|---|---|---|---|
| Fundação | `ds/fundacao/` | `Density` (`densidade.ts`), `SheetOption` (`opcao.ts`), `rotuloCaixaAlta` (`estilos.ts`), `useDensidade`, `marca.css` e tokens CSS | `lib/` |
| Providers (base) | `ds/providers/` | `RegimeVocabulary` e `useTermo` | base (`fundacao`, `providers`) e `lib/` |
| Átomos | `ds/atoms/` | `Button`, `Icon`, `StatusBadge`, `Rotulo`, `Cartao` e demais átomos (tabela 4.3) | base e átomos |
| Moléculas | `ds/molecules/` | `TextField`, `Select`, `EmptyState` e demais moléculas | base, átomos e moléculas |
| Organismos | `ds/organisms/` | `BottomSheet`, `Receipt`, `DataTable` e demais organismos | base, átomos, moléculas e organismos |
| Templates | `ds/templates/` | `AppShell`, `Portao`, `CorpoDaTela` | todos os níveis acima |

Cada nível importa a base, o próprio nível e os de baixo, nunca um de cima. Átomo pode usar átomo: `Button` importando `Icon` é permitido. `Button` importando `TextField` (molécula) viola `ds-atomo-nao-sobe`.

### 4.3 Tabela de classificação

Catálogo = item do catálogo do Documento 5 §4. Consumidores = uso de hoje, antes da migração.

| Componente | Nível | Catálogo | Destino | Consumidores hoje |
|---|---|:--:|---|---|
| `AppShell` | template | sim | `ds/templates/AppShell/` | `app/Layout` |
| `ScreenHeader` | molécula | sim | `ds/molecules/ScreenHeader/` | app e 21 áreas de `pages` |
| `ActionBar` | molécula | sim | `ds/molecules/ActionBar/` | fluxo de lançamentos (33 linhas; não compõe outro componente do `ds`) |
| `WorkQueue` / `WorkQueueItem` | organismo | sim | `ds/organisms/WorkQueue/` quando a fila de trabalho for real; até lá, `AvisoDeLote` em `PainelPage` | ainda não existe no código |
| `BottomSheet` | organismo | sim | `ds/organisms/BottomSheet/` (`SheetOption` vai para `ds/fundacao/opcao.ts`) | fluxo de lançamentos |
| `AmountInput` | molécula | sim | `ds/molecules/AmountInput/` | fluxo de lançamentos |
| `AmountDisplay` | átomo | sim | `ds/atoms/AmountDisplay/` | `Receipt` e `RecordRow`; nenhuma página (adoção em centavos na etapa de primitivos novos) |
| `RecordRow` | molécula | sim | `ds/molecules/RecordRow/` | registros |
| `StatusBadge` | átomo | sim | `ds/atoms/StatusBadge/` | 20 áreas |
| `SuggestionChip` | molécula | sim | `ds/molecules/SuggestionChip/` | fluxo de lançamentos |
| `DefaultField` | molécula | sim | `ds/molecules/DefaultField/` | fluxo de lançamentos |
| `Receipt` | organismo | sim | `ds/organisms/Receipt/` | lançamentos, registros |
| `AttachmentCapture` | molécula | sim | `ds/molecules/AttachmentCapture/` | fluxo de lançamentos |
| `DataTable` | organismo | sim | `ds/organisms/DataTable/` (absorve `Th` e `Td` na adoção) | 0; catálogo mantido, com teste |
| `PendencyCard` | organismo | sim | `ds/organisms/PendencyCard/` | 0; catálogo mantido, com teste |
| `ConfirmAction` | molécula | sim | `ds/molecules/ConfirmAction/` | 0; `FechamentoPage` re-implementa (adoção na etapa de primitivos novos) |
| `PeriodLock` | molécula | sim | `ds/molecules/PeriodLock/` | fluxo de lançamentos; `FechamentoPage` re-implementa |
| `TwoAxisGuard` | molécula | sim | `ds/molecules/TwoAxisGuard/` | lançamentos, adiantamentos |
| `RegimeVocabulary` / `useTermo` | provider (base) | sim | `ds/providers/RegimeVocabulary/` | 0; catálogo mantido, com teste |
| `SkeletonList` | molécula | sim | `ds/molecules/SkeletonList/` (`Bar` fica dentro até a etapa de app/shell, sessão e ds) | app, acessos, entrada |
| `EmptyState` | molécula | sim | `ds/molecules/EmptyState/` | 8 áreas |
| `InfraError` | molécula | sim | `ds/molecules/InfraError/` | acessos |
| `DomainError` | molécula | sim | `ds/molecules/DomainError/` | empréstimos, faturas, lançamentos |
| `PermissionDenied` | molécula | sim | `ds/molecules/PermissionDenied/` | app |
| `Density` | fundação (tipo) | não | `ds/fundacao/densidade.ts` | `ds` inteiro, `useDensidade`, páginas |
| `SheetOption` | fundação (tipo) | não | `ds/fundacao/opcao.ts` | `BottomSheet`, `Select`, `CampoDeTags`, mocks de opções |
| `useDensidade` | fundação (hook) | não | `ds/fundacao/useDensidade.ts` | `app/Layout` e 29 arquivos de `pages` |
| `rotuloCaixaAlta` | fundação (estilo) | não | `ds/fundacao/estilos.ts` | `Rotulo`, `Th`; 12 constantes `rotuloLabel` das páginas (etapa de rótulo e corpo da tela) |
| `Button` | átomo | não | `ds/atoms/Button/` | 23 áreas |
| `Icon` | átomo | não | `ds/atoms/Icon/` | 23 áreas |
| `TextField` | molécula | não | `ds/molecules/TextField/` | 13 áreas |
| `FlowerOfLife` | átomo | não | `ds/atoms/FlowerOfLife/` | `EmptyState`, entrada, inscrição pública |
| `PainelDeAcao` | organismo | não | `ds/organisms/PainelDeAcao/` (PR #55) | acessos; gavetas de lançamentos, revisão, relatórios e Ayahuasca (etapa de primitivos novos) |
| `Rotulo` | átomo | não | `ds/atoms/Rotulo/` | 12 áreas, inclusive `components/` |
| `RotuloDeCampo` | átomo | não | `ds/atoms/RotuloDeCampo/` (exportado pelo barrel) | `Select` (ds) e `CampoDeTags` (pages) |
| `Cartao` | átomo | não | `ds/atoms/Cartao/` | 10 áreas; cópias locais em Relatórios, Pessoas, Anamnese e Meu perfil |
| `Numero` | molécula | não | `ds/molecules/Numero/` | 7 áreas |
| `Recado` | molécula | não | `ds/molecules/Recado/` (absorvido por `Aviso` na etapa de primitivos novos) | 8 áreas |
| `BarraDeProporcao` | átomo | não | `ds/atoms/BarraDeProporcao/` | empréstimos; barras inline em Ayahuasca, Relatórios, Feitio, Contratações, Contas e Parâmetros |
| `Th` / `Td` | átomo | não | `ds/atoms/Th/` e `ds/atoms/Td/` até a adoção do `DataTable` | empréstimos, faturas, parâmetros |
| `Select` | molécula | não | `ds/molecules/Select/` | 15 áreas |
| `SeletorDeTipo` | molécula | não | `ds/molecules/SeletorDeTipo/` | 11 áreas |
| `Interruptor` | átomo | não | `ds/atoms/Interruptor/` | agenda, eventos, lançamentos, pessoas |
| `Avatar` | átomo | não | `ds/atoms/Avatar/` (`iniciais` fica em `lib/formato` até a etapa de primitivos novos) | acessos e pessoas; Meu perfil e `AppShell` re-implementam |
| `Portao` | template | não | `ds/templates/Portao/` (sem a prop `volta`) | `app/sessao` (`ExigeSessao`), `EntrarPage`, `RetornoPage` |
| `BotaoDeIcone` | átomo | novo | `ds/atoms/BotaoDeIcone/` (etapa de primitivos novos) | botões só de ícone em formulários, revisão, contas, registros, paginação, captura de anexo, sugestões e `TextField` |
| `Marca` | átomo | novo | `ds/atoms/Marca/` (etapa de primitivos novos) | `Portao`, `AppShell`, inscrição pública |
| `Aviso` | molécula | novo | `ds/molecules/Aviso/` (etapa de primitivos novos) | 10 ou mais telas |
| `Leitura` | molécula | novo | `ds/molecules/Leitura/` (etapa de primitivos novos) | 5 telas |
| `ListaDividida` | molécula | novo | `ds/molecules/ListaDividida/` (etapa de primitivos novos) | Devoluções, Leitos, Feitio |
| `Modal` | organismo | novo | variante central do `PainelDeAcao`; `ds/organisms/Modal/` só se o protótipo não couber nela | Contas, Ayahuasca, Agenda |
| `CorpoDaTela` | template | novo | `ds/templates/CorpoDaTela/` (etapa de rótulo e corpo da tela) | 29 telas e `TelaSemAcesso` |

Componentes de composição de tela (`CartazSlot`, `PermissoesPorModulo`, `Paginacao`, `CampoDeTags`, `BlocoDePergunta`, `MensagemDeEntradaNaTela`, `SeloDaAnamnese`, `PontosDeAtencao`, entre outros) não entram no `ds/`. Ficam em `pages/` no nível que a regra do ancestral comum indicar, e o anexo lista cada um. `FaixaDeDemonstracao`, `Layout` e `TelaSemAcesso` são UI de app (seção 2).

---

## 5. A unidade autocontida

### 5.1 Anatomia

```
<Nome>/                        pasta = nome exato do componente (PascalCase)
  index.ts                     porta única: export { Nome } e o que mais a API pública precisar
  <Nome>.tsx                   composição + JSX; estado vem de hooks/, regra de utils/
  <Nome>.dom.test.tsx          teste da unidade (projeto dom)
  constantes.ts                mapas fixos, rótulos, opções, tons (sem lógica)
  tipos.ts                     (opcional) tipo local usado por 2 ou mais arquivos da unidade
  consultas.ts / comandos.ts   (opcional) queryOptions e hooks sobre dados/criarConsulta|criarComando
  apoioDeTeste.tsx             (opcional) fixtures e falsos de 2 ou mais testes da subárvore
  hooks/useXxx.ts              estado, handlers, efeitos  (+ useXxx.dom.test.ts)
  utils/xxx.ts                 função pura                (+ xxx.test.ts, projeto logica)
  mocks/xxx.ts                 só dado de demonstração; some quando a tela liga no backend
  components/<Filho>/          mesma anatomia, recursiva, privada a esta subárvore (até 6 níveis)
```

- Componente do `ds` recebe `density: Density`. Componente de página recebe `densidade: Density`. Nunca `campo: boolean`. A divisão aplica isso ao extrair.
- `consultas.ts` e `comandos.ts` só existem onde a unidade fala com `dados/` (seção 9).

### 5.2 Operações sobre unidades

- **Mover**: `git mv` e troca de caminho de import. Repartir por export também é mover (seção 13.2).
- **Repartir por export**: a declaração exportada muda de arquivo, com o corpo idêntico (conferido por hash).
- **Dividir**: código não exportado vira unidade, hook ou util. Exige caracterização antes e, quando mexe em JSX, captura de tela.

### 5.3 Porta

Quem está fora de uma unidade entra só pelo `index.ts` do topo dela.

```ts
import { FaturasPage } from "@/pages/financeiro/FaturasPage";
```

- Dentro de `FaturasPage.tsx`, `./components/DetalheDaFatura` é permitido. `./components/DetalheDaFatura/components/TabelaDeCompras`, mesmo pelo `index`, não é.
- Irmão entra pelo `index`: `../CartaoDoTopo` sim; `../CartaoDoTopo/utils/x` não.
- O exemplo acima é ilustrativo do formato do alias. O caminho exato depende da unidade.

### 5.4 Privacidade

- Tudo dentro da pasta é privado à subárvore.
- Dentro da própria subárvore o acesso é livre, inclusive aos `utils/` e `mocks/` dos ancestrais.
- No máximo 6 unidades aninhadas. Regras `unidade-so-pelo-index-0` a `-6` e `unidade-ate-6-niveis` (seção 12).

### 5.5 Página fina e tamanho

- `<Nome>Page.tsx` só compõe e chama no máximo um hook de orquestração.
- Estado e handlers ficam em `hooks/`; regra pura em `utils/`, com teste; mapas fixos em `constantes.ts`.
- Alvo de aviso: página até 150 linhas; componente até 200 linhas.

### 5.6 Exemplos reais

Forma pretendida da `AcessosPage`, conferida no código mesclado do #55. Testes de hook seguem a seção 8.1; o teste de `useChaveDeIdempotencia` usa JSX e fica `.dom.test.tsx` (anexo, seção 14).

```
pages/sistema/AcessosPage/
  index.ts, AcessosPage.tsx, AcessosPage.dom.test.tsx, AcoesDeAcessos.dom.test.tsx
  consultas.ts (+ teste)               ex-consultasDeAcessos
  comandos.ts (+ teste)                ex-comandosDeAcessos
  constantes.ts                        AVISO_DE_VERSAO_DESATUALIZADA (+ Aba, ROTULO_DA_ABA na divisão)
  apoioDeTeste.tsx
  hooks/  useAcaoNoUsuario.ts, useFocoNoPrimeiroCampoInvalido.ts,
          useChaveDeIdempotencia.ts (+ teste de hook)    ex-lib/chaveDeIdempotencia
  utils/  focarTitulo.ts, mensagemDeErro.ts (+ teste), abasVisiveis.ts (+ teste; divisão)
  components/
    PainelDeConvite/ {…, constantes.ts}  SeletorDeGrupos/  ErroDoPainel/
    AbaDeUsuarios/   {index.ts (+ ATRASO_DA_BUSCA_EM_MS), AbaDeUsuarios.tsx, constantes.ts, situacaoDeUsuario.ts}
      hooks/useValorComAtraso.ts                 ex-lib
      utils/temFiltroAplicado.ts (+ teste)       ex-consultasDeAcessos (só AbaDeUsuarios usa)
      utils/semRepetidos.ts (+ teste)            divisão
      components/
        FiltrosDeUsuarios/
        LinhaDeUsuario/  utils/formatarDataHora.ts (+ teste)   ex-lib/formato
        PainelDoUsuario/ {…, PainelDoUsuario.dom.test.tsx, constantes.ts}
          components/CampoDeMotivo/ {…, constantes.ts}  components/AvisoDeAtencao/
    AbaDeGrupos/
      components/CartaoDeGrupo/                  divisão
```

`PermissoesPorModulo` é usado pela `AbaDeGrupos` (sistema) e pelo `MeuPerfilPage` (transversal). Fica em `pages/components/PermissoesPorModulo/`, com `utils/permissoesAgrupadas.ts`.

Exemplo da `InscricaoPage` (dividida):

```
pages/eventos/inscricao/              fluxo: InscricaoPage + InscricaoPublicaPage
  mocks/eventos.ts, mocks/linkDaCerimonia.ts (eventoDoLink + linkDaCerimonia)
  utils/valorDaInscricao.ts           composição de domínio, com parâmetro de isenção (EQUIPE)
  components/OpcaoMarcavel/ …         composição de domínio
  InscricaoPage/
    index.ts, InscricaoPage.tsx (só compõe), InscricaoPage.dom.test.tsx
    constantes.ts, tipos.ts
    hooks/useInscricao.ts (+ .dom.test.ts)               os 19 useState num reducer
    utils/pendenciasDaInscricao.ts (+ teste)
    mocks/inscricao.ts
    components/Bloco/ EscolhaDoEvento/ LinkDaCerimonia/ BuscaDePessoa/ PessoaEscolhida/
               EstadoDaAnamnese/ Contribuicao/ LinhaDeInterruptor/ Pendencias/ Fechamento/
```

A árvore-alvo completa está na seção 11; o destino de cada arquivo está no anexo.

---

## 6. A regra do ancestral comum

### 6.1 Enunciado

Todo trecho que não é primitivo do `ds/` mora no menor ancestral comum dos arquivos de produção que a importam. Vale para composição de tela, hook, util, constante, mock e apoio de teste.

- Com **um** consumidor, o trecho mora na unidade dele.
- Com **dois ou mais**, mora na pasta de tipo (`components/`, `hooks/`, `utils/`, `mocks/`, `constantes.ts`) do menor ancestral comum.
- Quando ganha consumidor de fora, **sobe**. Quando perde, **desce**.
- Teste não muda a posição de código de produção: ele entra pelo `index` da unidade.

### 6.2 Granularidade por export

A posição é medida por export, então um arquivo pode ser repartido. Exemplos da migração:

- `ehCaixa` é usado por `ContasEFundoPage` e pelo `GerenciarContasModal`, então mora em `ContasEFundoPage/utils/conta.ts`.
- `contaVazia` só é usado pelo modal, então mora em `GerenciarContasModal/utils/novos.ts`.
- `contas` (mock) é usado por financeiro e eventos, então mora em `pages/mocks/contas.ts`.
- `formatarValor` é usado pelo `ds` e pelas telas, então mora em `lib/formato.ts`.

### 6.3 Sobe e desce

- `PermissoesPorModulo` é usado pela `AbaDeGrupos` (sistema) e pelo `MeuPerfilPage` (transversal), então sobe para `pages/components/PermissoesPorModulo/`.
- `formatarDataHora` é usado só pela linha de usuário da tela de acessos, então desce para `LinhaDeUsuario/utils/`.
- `nomeDoMes` é usado só pela `AgendaPage`, então desce para `AgendaPage/utils/`.

Quem sobe ou desce é a posse, não o nome do arquivo de origem. O anexo indica, por export, onde cada um mora.

### 6.4 Código sem consumidor

- Fora do `ds/`: export sem consumidor de produção sai em PR de remoção, listado pela detecção de código sem uso. Até a remoção, ele acompanha o arquivo onde está; ninguém o posiciona nem o promove.
- No `ds/`: item do catálogo do Documento 5 §4 sem consumidor fica, com teste. Hoje: `ConfirmAction`, `DataTable`, `PendencyCard` e `RegimeVocabulary`/`useTermo` (seção 2).

### 6.5 Exceções

- O `ds/` é global por definição (seções 2 e 4).
- O apoio de teste é posicionado pelos testes que o usam (seção 8.2).

### 6.6 Consumidor que conta

Só código de produção posiciona código de produção. Teste entra pelo `index` da unidade. Exemplo: `ATRASO_DA_BUSCA_EM_MS` fica em `AbaDeUsuarios` e sai pelo `index` para o apoio de teste.

---

## 7. Páginas: módulos e fluxos

### 7.1 Caminho

`pages/<modulo>/[<fluxo>/]<Nome>Page/`

- O **módulo** é o prefixo da primeira permissão da tela em `app/telas.ts`. Na etapa de app em subpastas, esse arquivo passa a `app/shell/telas.ts`.
- Módulos: `financeiro`, `eventos`, `estoque`, `pessoas`, `sistema`. Tela sem permissão de módulo vai para `pages/transversal/`.
- Tela pública vai para o módulo do recurso que cria.
- O menu não muda. Devoluções está em eventos, mas o menu a mostra em Financeiro; Ayahuasca e Feitio estão em estoque, e o menu os mostra em Cerimônias.
- O sufixo `Page` é só da unidade de página.

### 7.2 Fluxos

Fluxo só existe com compartilhamento exclusivo entre telas do mesmo módulo. Fluxo sem pasta de tipo compartilhada é desfeito.

| Fluxo | Telas |
|---|---|
| `financeiro/lancamentos` | `RegistrarLancamentoPage`, `MeusRegistrosPage`, `LancamentosPage`, `VerificacaoLotePage` |
| `eventos/inscricao` | `InscricaoPage`, `InscricaoPublicaPage` |
| `transversal/entrada` | `EntrarPage`, `RetornoPage` |

### 7.3 Compartilhamento dentro de `pages/`

- `pages/{components,hooks,utils,mocks}`: nível compartilhado de todas as telas. Sobe quando dois módulos dividem algo.
- `pages/<modulo>/components` e `pages/<modulo>/<fluxo>/utils`: compartilhado dentro do módulo ou do fluxo.
- Nível compartilhado nunca importa tela. Página não importa página. Módulo não importa módulo.

### 7.4 As 29 telas

| Tela | Rota | Primeira permissão | Módulo | Fluxo | Destino |
|---|---|---|---|---|---|
| `PainelPage` | `/` | (nenhuma) | transversal | — | `pages/transversal/PainelPage/` |
| `RegistrarLancamentoPage` | `/registrar` | `financeiro.lancamento.registrar` | financeiro | lancamentos | `pages/financeiro/lancamentos/RegistrarLancamentoPage/` |
| `MeusRegistrosPage` | `/meus-registros` | `financeiro.lancamento.ler_proprios` | financeiro | lancamentos | `pages/financeiro/lancamentos/MeusRegistrosPage/` |
| `VerificacaoLotePage` | `/verificacao-de-lote` | `financeiro.lancamento.confirmar` | financeiro | lancamentos | `pages/financeiro/lancamentos/VerificacaoLotePage/` |
| `LancamentosPage` | `/lancamentos` | `financeiro.lancamento.ler` | financeiro | lancamentos | `pages/financeiro/lancamentos/LancamentosPage/` |
| `ContasEFundoPage` | `/contas-e-fundo` | `financeiro.conta.ler` | financeiro | — | `pages/financeiro/ContasEFundoPage/` |
| `FaturasPage` | `/faturas` | `financeiro.fatura.gerenciar` | financeiro | — | `pages/financeiro/FaturasPage/` |
| `EmprestimosPage` | `/emprestimos` | `financeiro.emprestimo.gerenciar` | financeiro | — | `pages/financeiro/EmprestimosPage/` |
| `AdiantamentosPage` | `/adiantamentos` | `financeiro.adiantamento.registrar` | financeiro | — | `pages/financeiro/AdiantamentosPage/` |
| `RelatoriosPage` | `/relatorios` | `financeiro.dre.ler` | financeiro | — | `pages/financeiro/RelatoriosPage/` |
| `FechamentoPage` | `/fechamento` | `financeiro.periodo.fechar` | financeiro | — | `pages/financeiro/FechamentoPage/` |
| `ConciliacaoPage` | `/conciliacao` | `financeiro.conciliacao.executar` | financeiro | — | `pages/financeiro/ConciliacaoPage/` |
| `DevolucoesPage` | `/devolucoes` | `eventos.devolucao.efetivar` | eventos | — (menu: Financeiro) | `pages/eventos/DevolucoesPage/` |
| `PrestacaoDeContasPage` | `/prestacao-de-contas` | `financeiro.prestacao_contas.gerar` | financeiro | — | `pages/financeiro/PrestacaoDeContasPage/` |
| `ParametrosPage` | `/parametros` | `financeiro.plano_contas.gerenciar` | financeiro | — | `pages/financeiro/ParametrosPage/` |
| `AgendaPage` | `/agenda` | `eventos.evento.editar` | eventos | — | `pages/eventos/AgendaPage/` |
| `InscricaoPage` | `/inscricao` | `eventos.inscricao.ler` | eventos | inscricao | `pages/eventos/inscricao/InscricaoPage/` |
| `LeitosPage` | `/leitos` | `eventos.operacao.ler` | eventos | — | `pages/eventos/LeitosPage/` |
| `ContratacoesPage` | `/contratacoes` | `eventos.contratacao.gerenciar` | eventos | — | `pages/eventos/ContratacoesPage/` |
| `AyahuascaPage` | `/ayahuasca` | `estoque.saldo.ler` | estoque | — (menu: Cerimônias) | `pages/estoque/AyahuascaPage/` |
| `FeitioPage` | `/feitio` | `estoque.feitio.gerenciar` | estoque | — (menu: Cerimônias) | `pages/estoque/FeitioPage/` |
| `PessoasPage` | `/pessoas` | `pessoas.pessoa.ler` | pessoas | — | `pages/pessoas/PessoasPage/` |
| `AnamnesePage` | `/anamnese` | `pessoas.anamnese.ler` | pessoas | — | `pages/pessoas/AnamnesePage/` |
| `AcessosPage` | `/acessos` | `sistema.usuario.gerenciar` | sistema | — (fonte api) | `pages/sistema/AcessosPage/` |
| `AuditoriaPage` | `/auditoria` | `sistema.auditoria.ler` | sistema | — | `pages/sistema/AuditoriaPage/` |
| `MeuPerfilPage` | `/meu-perfil` | (nenhuma) | transversal | — (fonte api) | `pages/transversal/MeuPerfilPage/` |
| `EntrarPage` | `/entrar` | (pública, fora de `TELAS`) | transversal | entrada | `pages/transversal/entrada/EntrarPage/` |
| `RetornoPage` | `/entrar/retorno` | (pública, fora de `TELAS`) | transversal | entrada | `pages/transversal/entrada/RetornoPage/` |
| `InscricaoPublicaPage` | `/i/:token` | (pública, fora de `TELAS`) | eventos (recurso que cria) | inscricao | `pages/eventos/inscricao/InscricaoPublicaPage/` |

---

## 8. Testes, apoio de teste e mocks

### 8.1 Sufixos e projetos

| Sujeito | Arquivo de teste (ao lado do sujeito) | Projeto do vitest |
|---|---|---|
| Componente | `<Nome>.dom.test.tsx` | dom |
| Hook | `useX.dom.test.ts` (`useX.dom.test.tsx` quando o teste precisa de JSX) | dom |
| Util pura | `x.test.ts` | logica |
| Fronteiras e estrutura | `apps/web/test/estrutural/fronteiras.test.ts` | estrutural (node), criado na etapa de fronteiras no depcruise |

- Os projetos são escolhidos pelo sufixo, em `apps/web/vitest.config.ts`: `logica` roda `src/**/*.test.ts` em node, exceto `*.dom.test.ts`; `dom` roda `src/**/*.test.tsx` e `src/**/*.dom.test.ts` em jsdom. Mudar arquivo de pasta não muda o projeto.
- Toda unidade nova tem teste. Durante a migração, unidade sem teste é aviso do `conferir-estrutura.mjs` (seção 12.4); ao fim dela, erro.

### 8.2 Apoio de teste

O apoio global fica em `src/testes/`:

- `configurarDom.ts`: efeito global do projeto dom (`IS_REACT_ACT_ENVIRONMENT` e stub de `matchMedia`), por `setupFiles`;
- `sessaoDeTeste.tsx`: `criarEu`, com `PERMISSAO_QUE_O_EU_TEM` e `PERMISSAO_QUE_O_EU_NAO_TEM`, `Sonda` e `ler`, além de falsos e montagens de sessão (`EntradaFalsa`, `AvisoDeEncerramentoFalso`, `CenarioDeSessao`, `TelaMontada`, `montarComSessao`, entre outros);
- `fabricas.ts`: `erroDaApi`, que unifica as fábricas locais de erro dos testes.
- `montagem.tsx`: render global sem provider (`montar`, `desmontarTudo`, `elemento`, `todos`, `clicar`). Entra com o #58; o #59 traz o mesmo arquivo.

Apoio colocalizado (`apoioDeTeste.tsx`) segue a regra do ancestral comum e fica no menor ancestral dos testes que o usam.

- Código de produção nunca importa `apoioDeTeste`, `src/testes` nem `vitest` (`apoio-de-teste-so-em-teste`).
- Qualquer `*.test.*` pode usar `src/testes` e `apoioDeTeste`.

### 8.3 Mocks de demonstração

- Mock é só dado de demonstração. Regra de domínio sai para `utils/`, com teste. Mapa de apresentação (rótulo, tom, explicação) sai para `constantes.ts`. Função falsa da demonstração, que imita o que o backend devolverá (`gerarHash`), fica no mock e some com ele.
- `ds/`, `lib/` e `dados/` nunca importam mock. `src/mocks/` só importa `lib/` e `@cdd/contracts`.
- Tela com fonte `api` (Acessos, Meu perfil) e as telas de entrada não importam mock. Quando a tela liga no backend, a pasta `mocks/` dela é apagada. A lista de telas de api cresce a cada tela ligada nas etapas B1 a B6.
- Onde cada mock mora: `<Unidade>/mocks/<nome>.ts` para o de uma tela; `pages/mocks/` para o compartilhado entre telas; `src/mocks/` para a raiz da demonstração (`ids.ts`, `verificacao.ts`).
- `ids.ts` aplica a marca de tipo às fixtures. É exceção declarada (seção 2): só a demonstração forja ids; o código de produção recebe ids da API.
- Arquivo que muda de pasta inteiro mantém o nome (`mocks/<nome>.ts`).

---

## 9. Acesso a dados por unidade

- `consultas.ts` e `comandos.ts` ficam na unidade que os usa. São `queryOptions` e hooks sobre `criarConsulta` e `criarComando`, com chave prefixada pelo módulo ou pela tela.
- Nenhum `fetch` em componente. Nada de `src/services`.
- `dados/index.ts` é barrel sem efeito colateral.
- As instâncias (`gerenciadorOidc`, `credencial`, `servicoDeEntrada`, `clienteHttp`, `consulta`, `comando`) ficam em `dados/instancias.ts`, importado só por `main.tsx`.
- Fora de `dados/`, só se importa pelo barrel.
- O `silencioso.ts` usa `criarGerenciadorOidc` pelo barrel.

Regras: `dados-sem-ui` (erro), `dados-so-pelo-barrel` (aviso), `instancias-so-no-main` (erro).

---

## 10. Nomes, imports e barrels

### 10.1 Nomes

- Agrupamentos (módulo, fluxo, tipo) em minúsculas e pt-BR: `financeiro`, `lancamentos`, `components`, `utils`.
- Unidades em PascalCase, com o nome exato do componente.
- Componentes do catálogo do Documento 5 §4 em inglês. Primitivos promovidos ao `ds` e demais componentes em pt-BR.
- Hooks em `useXxx.ts`; utils em `camelCase.ts`.
- Arquivo que muda de pasta inteiro mantém o nome.

### 10.2 Imports

- Alias `@/…` para atravessar camada ou módulo. Relativo dentro da camada ou do módulo.
- Fora do `ds/`, importa-se só `ds/index.ts`:

```ts
import { Button } from "@/ds";
```

(Exemplo ilustrativo do formato.)

Regras: `camada-cruzada-por-alias` (aviso, passa a erro quando zerar) e `ds-so-pelo-barrel` (erro).

### 10.3 Tipos

- Tipos são exportados do `.ts`/`.tsx` que os define.
- Tipos de domínio vêm de `@cdd/contracts`.
- Uma unidade cria `tipos.ts` quando 2 ou mais arquivos dela compartilham um tipo local.

### 10.4 Barrels

- Um `index.ts` por unidade, com a API pública.
- Além deles, só existem `ds/index.ts`, `dados/index.ts` e `app/<area>/index.ts`.
- Pasta de tipo não tem barrel agregador.

### 10.5 Estilo

- Variáveis CSS dos tokens e estilo inline, com cor sempre por `var(--…)`.
- Tokens, marca e keyframes globais ficam em `ds/fundacao/`. `styles/global.css` é só a entrada.
- O Tailwind segue importado, com o preflight ativo, até a etapa "Remover o Tailwind" (seção 15).

---

## 11. Árvore-alvo

Legenda: `{…}` = `index.ts` + `<Nome>.tsx` + `<Nome>.dom.test.tsx`. `(+ t)` = teste ao lado: `x.test.ts` para util, `useX.dom.test.ts` para hook. `(F)` = depende das etapas de composição de domínio, rótulo e adoção de primitivos (seção 13). A etapa que cria cada item está no anexo. A etapa confere a árvore no código da época e pode ajustar nome, nunca a posse.

```
apps/web/
├── test/estrutural/              fronteiras.test.ts, casosDasFronteiras.ts, fixtures/apps/web/src/…, fixtures-negativas/apps/web/src/…
├── captura/                      captura de telas (seção 13.6); saida/ fica fora do git
├── scripts/                      conferir-movimento.mjs, conferir-estrutura.mjs
└── src/
    ├── main.tsx                  raiz de composição; único importador de dados/instancias.ts
    ├── silencioso.ts, env.d.ts
    ├── styles/global.css         só a entrada: @import de ../ds/fundacao/** + tailwindcss (exceção)
    ├── app/                      composição e UI do shell (fora da escala atômica)
    │   ├── router.tsx (+ router.dom.test.tsx)       importa só pages/**/<Nome>Page/index.ts
    │   ├── providers/   index.ts, ClienteHttpProvider/ {…}
    │   ├── rotas/       index.ts, rotas.ts, destino.ts (+ destino.dom.test.ts),
    │   │                rotasAntigasDaEntrada.tsx (+ .dom.test.tsx)
    │   ├── sessao/      index.ts, SessaoProvider/ {…}, ExigeSessao/ {…},
    │   │                estadoDaSessao.ts (+ t), hooks/useExisteUsuarioOidc.ts, utils/derivarEstado.ts (+ t)
    │   ├── demonstracao/ index.ts, demonstracao.ts (+ t), sessaoDeDemonstracao.ts, FaixaDeDemonstracao/ {…}
    │   └── shell/       index.ts, Layout/ {…}, menu.ts, rotaAtiva.ts (+ t), telas.ts (+ t), acesso.ts (+ t),
    │                    hooks/useContagemDoLote.ts, utils/nomeDaTela.ts (+ t), components/TelaSemAcesso/ {…}
    ├── dados/                    index.ts (barrel puro), instancias.ts, caminhosOidc.ts, clienteHttp.ts (+ t),
    │                             clienteDeConsultas.ts (+ t), consultaEComando.ts (+ t), credencial.ts,
    │                             credencialOidc.ts (+ t), erros.ts (+ t), oidc.ts, oidc.dom.test.ts, apoioDeTeste.ts
    ├── lib/                      formato.ts (+ t): formatarValor; numero.ts (+ t)
    ├── mocks/                    ids.ts, verificacao.ts (filaDeVerificacaoInicial)
    ├── testes/                   configurarDom.ts (setupFiles), sessaoDeTeste.tsx, fabricas.ts, montagem.tsx
    ├── ds/                       DESIGN SYSTEM (global por definição)
    │   ├── index.ts              barrel único
    │   ├── fundacao/             densidade.ts (Density), opcao.ts (SheetOption), estilos.ts (rotuloCaixaAlta),
    │   │                         useDensidade.ts (+ .dom.test.ts), marca.css,
    │   │                         tokens/{fonts, colors, typography, spacing, base}.css
    │   ├── providers/            RegimeVocabulary/ {…, useTermo.ts, constantes.ts}
    │   ├── atoms/                Icon/ {…, registro.ts}, Button/ {…, constantes.ts}, StatusBadge/ {…, constantes.ts},
    │   │                         AmountDisplay/, FlowerOfLife/, Rotulo/, RotuloDeCampo/, Cartao/, Interruptor/,
    │   │                         Avatar/ (+ utils/iniciais.ts) (F), BarraDeProporcao/, Th/, Td/,
    │   │                         BotaoDeIcone/ (F), Marca/ (F)                                    {…} cada
    │   ├── molecules/            ActionBar/, ScreenHeader/, TextField/, Select/, SeletorDeTipo/, Numero/,
    │   │                         Recado/ (→ Aviso) (F), Aviso/ (F), Leitura/ (F), ListaDividida/ (F),
    │   │                         AmountInput/, SuggestionChip/, DefaultField/, AttachmentCapture/, RecordRow/,
    │   │                         ConfirmAction/, PeriodLock/, TwoAxisGuard/, DomainError/, EmptyState/,
    │   │                         InfraError/, PermissionDenied/, SkeletonList/ (+ components/BarraDeEsqueleto) {…} cada
    │   ├── organisms/            BottomSheet/, Receipt/, PendencyCard/, PainelDeAcao/,
    │   │                         DataTable/ (absorve Th e Td) (F), Modal/ só se não couber como variante do PainelDeAcao (F)  {…} cada
    │   └── templates/            AppShell/ {…, navegacao.ts} (+ components/{NavItem, RailDeNavegacao, ChipDoUsuario,
    │                             BarraDeContexto, NavInferior}), Portao/ {…}, CorpoDaTela/ {…} (F)
    └── pages/
        ├── components/           CartazSlot/ {…}, PermissoesPorModulo/ {…} (+ utils/permissoesAgrupadas.ts (+ t)),
        │                         SeloDaAnamnese/ (F; tipos.ts), PontosDeAtencao/ (F)
        ├── hooks/                useCarrossel.ts (+ t) (F)
        ├── utils/                formato.ts (+ t): formatarDinheiro, formatarBRL, formatarInteiro, formatarLitros, formatarDiaMes, formatarData,
        │                         formatarCompetencia, competenciaPorExtenso, pluralizar (+ privados)
        ├── mocks/                relogio.ts (hoje, competenciaAtual), contas.ts (contas, fundoProprio)
        ├── transversal/
        │   ├── PainelPage/ {…}           mocks/{cerimonias, resumoFinanceiro}.ts; components/{CartaoDeSaldo, MovimentoDoMes, AvisoDeLote,
        │   │                             GraficoEstoque (mocks/estoque.ts), CarrosselDeCerimonias (… GraficoResultado), EixoDeCerimonias (F)}
        │   ├── MeuPerfilPage/ {…}        components/PerfilDoEu
        │   └── entrada/                  fluxo: tipos.ts (MensagemDeEntrada, TomDeAviso), components/MensagemDeEntradaNaTela (+ components/Aviso),
        │                                 EntrarPage/ {…}, RetornoPage/ {…}
        ├── financeiro/
        │   ├── mocks/lancamentos.ts      components/CartaoDeFormulario (F)
        │   ├── lancamentos/              fluxo: utils/{recibo, rotulosDoLancamento, totais (F)}.ts, hooks/usePaginacao.ts (F),
        │   │   │                         components/{Paginacao, ChipDeFiltro (F)}
        │   │   ├── RegistrarLancamentoPage/ {…}  hooks/useFormularioDeLancamento.ts, mocks/opcoes.ts, components/CampoDeTags, …
        │   │   ├── MeusRegistrosPage/ {…}        mocks/meusLancamentos.ts, …
        │   │   ├── LancamentosPage/ {…}          utils/corDoTipo.ts, …
        │   │   └── VerificacaoLotePage/ {…}      constantes.ts (ORIGENS, CONFIANCA), components/PainelDeRevisao, …
        │   ├── ContasEFundoPage/ {…}     utils/{conta, reservas}.ts, mocks/fundos.ts, components/GerenciarContasModal (utils/novos.ts), …
        │   ├── FaturasPage/, EmprestimosPage/, AdiantamentosPage/, RelatoriosPage/ (hooks/useRelatorio.ts,
        │   │   components/{GraficoSerie, PainelDeQuebra}), FechamentoPage/, ConciliacaoPage/, PrestacaoDeContasPage/,
        │   │   ParametrosPage/           {…} cada, com mocks/<nome>.ts
        ├── eventos/
        │   ├── components/PainelDeContaEData (F)
        │   ├── AgendaPage/ {…}           mocks/agenda.ts, utils/{rascunhoDeTrabalho, nomeDoMes}.ts,
        │   │                             components/{CalendarioMensal, LegendaDeTipos, DetalheDoTrabalho, FormularioDeTrabalho}, …
        │   ├── inscricao/                fluxo: mocks/{eventos, linkDaCerimonia}.ts, utils/valorDaInscricao.ts (F), components/ (F)
        │   │   ├── InscricaoPage/ {…}           mocks/inscricao.ts, …
        │   │   └── InscricaoPublicaPage/ {…}    utils/regraDeAlerta.ts, mocks/inscricaoPublica.ts,
        │   │                                    components/PassoAnamnese/components/BlocoDePergunta, …
        │   └── LeitosPage/, ContratacoesPage/, DevolucoesPage/   {…} cada, com mocks/<nome>.ts
        ├── estoque/                      AyahuascaPage/, FeitioPage/          {…} cada, com mocks/<nome>.ts
        ├── pessoas/                      PessoasPage/, AnamnesePage/          {…} cada, com mocks/<nome>.ts
        └── sistema/                      AcessosPage/ (seção 5.6), AuditoriaPage/ {…} (mocks/auditoria.ts)
```

`…` = internos criados pelas etapas de divisão (seção 13), um a um no anexo.

---

## 12. Como a estrutura é verificada

### 12.1 Regras de fronteira

Todas as regras rodam no depcruise, com configuração `.dependency-cruiser.web.mjs`. A severidade inicial é a da primeira versão da configuração; a severidade final está em 12.5.

| Regra | O que proíbe | Severidade inicial | Linha de base (main) |
|---|---|:--:|:--:|
| `web-sem-ciclo` | Ciclo no grafo de `apps/web/src`, inclusive por `import type` | aviso | 2 |
| `lib-e-folha` | `lib/` importar outra camada ou React | aviso | 5 |
| `dados-sem-ui` | `dados/` importar UI ou React | erro | 0 |
| `ds-autonomo` | `ds/` importar `app`, `components`, `dados`, `mocks`, `pages` ou `react-router` | erro | 0 |
| `ds-so-pelo-barrel` | Fora do `ds/`, importar qualquer caminho do `ds/` que não seja `ds/index.ts` | erro | 0 |
| `ds-base-nao-sobe` | `fundacao/` ou `providers/` importar átomos, moléculas, organismos ou templates | erro | 0 |
| `ds-atomo-nao-sobe` | Átomos importarem moléculas, organismos ou templates | erro | 0 |
| `ds-molecula-nao-sobe` | Moléculas importarem organismos ou templates | erro | 0 |
| `ds-organismo-nao-sobe` | Organismos importarem templates | erro | 0 |
| `dados-so-pelo-barrel` | Fora de `dados/`, importar arquivo que não seja `index.ts` ou `instancias.ts` | aviso | 14 |
| `instancias-so-no-main` | Importar `dados/instancias.ts` fora de `main.tsx` | erro | 0 |
| `app-nao-conhece-paginas` | `app/` importar `pages/`, exceto `router.tsx` e testes | aviso | 1 |
| `roteador-so-pelo-index-da-pagina` | `router.tsx` importar `pages/` por outro caminho que não o `index.ts` de uma `*Page/` | aviso | 29 |
| `paginas-so-pela-api-publica-do-app` | `pages/` importar `app/` fora de `sessao`, `rotas`, `providers` e `demonstracao` (pelo `index.ts`) | aviso | 16 |
| `pagina-nao-importa-pagina` | Uma `*Page/` importar outra | erro | 0 |
| `modulo-nao-importa-modulo` | Um módulo importar outro | erro | 0 |
| `compartilhado-nao-importa-tela` | Nível compartilhado de `pages/` importar uma `*Page/` | erro | 0 |
| `compartilhado-de-pages-nao-importa-modulo` | `pages/{components,hooks,utils,mocks}` importar módulo | erro | 0 |
| `unidade-so-pelo-index-0` a `-6` | De fora de uma unidade, importar algo que não seja o `index.ts` do topo dela (irmão, primo ou neto). Uma regra por profundidade da origem, de 0 a 6 unidades | erro | 0 cada |
| `unidade-ate-6-niveis` | Sétima unidade aninhada | erro | 0 |
| `producao-global-sem-mock` | `ds/`, `lib/` ou `dados/` importar mock | aviso | 1 |
| `mock-global-so-dados` | `src/mocks/` importar `app`, `components`, `dados`, `ds`, `pages` ou `testes` | aviso | 1 |
| `tela-de-api-sem-mock` | Telas com fonte `api` e o fluxo de entrada inteiro (`transversal/entrada/`, inclusive `constantes.ts` e `components/`) importarem mock | erro | 0 |
| `apoio-de-teste-so-em-teste` | Código de produção importar `apoioDeTeste`, `src/testes` ou `vitest` | erro | 0 |
| `camada-cruzada-por-alias` | Atravessar camada, ou módulo dentro de `pages/`, sem alias `@/`. Passa a erro quando chegar a zero | aviso | 290 |
| `pasta-camel-case` | Pasta de agrupamento em camelCase sob `apps/web/src` (agrupamento é minúsculo; unidade é PascalCase), que escaparia das regras de unidade | erro | 0 |

São 32 regras: 25 nomeadas acima e as 7 de `unidade-so-pelo-index`. As contagens são a linha de base de 09/10/2026; os `comment` da configuração apontam para `pnpm fronteiras:web`, que a reproduz.

### 12.2 Linha de base

- Na main: 359 avisos e 0 erros. São 40 avisos de sete regras, 29 do roteador e 290 da regra de alias.
- Com o #55 (mesclado em 09/10/2026), a main passa a 404 avisos e 0 erros.
- Ainda não há catraca: um aviso novo não falha o CI, e nas etapas de mover "sem aviso novo" é conferido à mão (seção 13.3). A catraca entra logo depois do merge do #57, do #58 e do #59 (seção 15). Nesse PR, os imports do apoio de teste passam ao alias `@/`, que entra no vitest com o #57; `depcruise-baseline` gera os avisos conhecidos e o CI roda com `--ignore-known`.
- A linha de base é a foto de antes da migração. Cada etapa de mover a reduz, e a etapa de fronteiras em erro fecha a conta.

### 12.3 Como cada regra é provada

- No molde de `apps/api/test/estrutural`, mas com duas árvores só: `fixtures/apps/web/src/…` (imports que violam) e `fixtures-negativas/apps/web/src/…` (imports permitidos). Cada árvore tem `tsconfig.json` próprio, para o `@/` resolver dentro dela. São 2 execuções do depcruise em vez de uma por regra.
- `casosDasFronteiras.ts` lista, por regra, a severidade prevista e o conjunto exato de imports `origem -> destino` que a fixture positiva deve acusar e que a negativa deve liberar.
- O teste confere: toda regra da configuração tem caso; nenhum import das fixtures fica sem resolver; cada regra acusa exatamente os imports previstos; a negativa tem 0 violações; e `apps/web/src` não tem violação em erro.
- Toda regex é sem grupo quantificado com quantificador dentro: o depcruise 18.4 recusa regex insegura e aborta a execução inteira.
- O `tsconfig` da configuração usa caminho absoluto (caminho relativo dá TS5083). Regras que precisam valer também nas fixtures usam o prefixo `(?:^|/)` ou a captura `^(.*apps/web/src…)`.
- O teste roda no projeto `estrutural` do vitest, dentro de `pnpm --filter @cdd/web test`. O script `fronteiras:web` da raiz roda as regras sobre `apps/web/src`, com passo próprio no CI.

### 12.4 Outros verificadores

- `apps/web/scripts/conferir-movimento.mjs` (criado na etapa Mover ds em níveis, a primeira que precisa dele): em cada renomeação de `git diff -M --name-status`, compara o conteúdo sem as linhas de import e `export … from`. Para declarações repartidas, compara o hash do corpo pelo nome. Renomes com troca de nome (seção 2) entram como par `antigo → novo` explícito, porque a detecção de similaridade do git pode não os casar.
- `apps/web/scripts/conferir-estrutura.mjs` (etapa de fronteiras em erro): toda pasta PascalCase tem `<Nome>.tsx`, `index.ts` e teste (falta de teste é aviso até o fim da migração); o módulo de cada tela é o prefixo da primeira permissão em `app/shell/telas.ts`; fluxo sem pasta de tipo compartilhada é acusado; toda `RotaId` tem rota, item em `TELAS` e elemento no router.
- `pnpm lint` passa a cobrir `apps/web/src` (etapa de fronteiras em erro). As violações antigas vão em PR separado.
- Captura de telas (seção 13.6), para o efeito visual.

### 12.5 Severidade final

Na etapa de fronteiras em erro, todas as regras viram erro. `camada-cruzada-por-alias` vira erro quando chegar a zero.

---

## 13. Ordem da migração e protocolo de segurança

### 13.1 Princípios de execução

- Uma etapa estrutural aberta por vez. Cada etapa começa rebaseada na main.
- As etapas de mover rodam em série: cada uma depende da anterior.
- Etapa que só cria teste pode correr em paralelo, desde que não crie arquivo numa pasta que outra etapa aberta move.
- A ordem desta seção é de leitura. Quem manda são as dependências declaradas (depende de, bloqueada por). O bloqueio herda-se pela cadeia de dependências.
- Enquanto o gate do e2e do B0 estiver fechado, as caracterizações e as divisões das telas de demonstração podem andar.
- Divergência encontrada na migração é registrada como está pelo teste de caracterização e corrigida em PR próprio, nunca dentro de etapa estrutural.

### 13.2 As três operações

- **Mover**: `git mv` e troca de caminho de import. Repartir por export também é mover: a declaração muda de arquivo com o corpo idêntico, conferido por hash.
- **Dividir**: código não exportado vira unidade, hook ou util nova. Exige caracterização antes e, quando mexe em JSX, captura de tela.
- Etapa de mover não divide.
- Exceção declarada: `formatarDinheiro` muda de corpo na etapa de `lib/formato` (seção 2).

### 13.3 Verificação padrão de mover

- `pnpm --filter @cdd/web typecheck`, `test` e `build`;
- `pnpm fronteiras:web` sem erro e sem aviso novo além dos previstos na etapa;
- `node apps/web/scripts/conferir-movimento.mjs`: renomeação sem diferença fora das linhas de import, e declaração repartida com o mesmo hash de corpo;
- o mesmo número de testes da main.

### 13.4 Verificação padrão de divisão

- Os testes de caracterização da tela passam antes e depois, sem edição;
- a captura nas duas densidades é idêntica entre a main e a branch (`captura` e `captura:comparar`, seção 13.6);
- `typecheck`, `test` e `build`;
- `fronteiras:web` sem erro.

Nenhuma regra, texto ou cálculo muda numa divisão.

### 13.5 Gates

- **Merge do #55**: era o gate da etapa Mover ds em níveis. Cumprido em 09/10/2026.
- **e2e do B0 e ajustes do login mesclados**: antes de qualquer mudança de pasta em `app/`, `dados/`, sistema e transversal. Antes desse gate, só linhas de import dessas pastas mudam (exceção declarada, seção 2).

A cadeia de dependências transmite esses gates: as etapas de divisão de sistema, transversal e app/shell só andam depois dele.

### 13.6 Captura de telas

- O script (`apps/web/captura/`) sobe o Vite em desenvolvimento com a sessão de demonstração, congela o relógio em 2026-09-02 e usa dois viewports: campo (390 × 844, dentro da consulta de 900 px do `useDensidade`) e escritório (1440 × 900).
- Cobre as 26 rotas do `Layout`, a aba de grupos de Acessos, a entrada (`/entrar` e o retorno, inclusive o recusado) e a inscrição pública com os passos do assistente: 36 telas em 2 densidades. Cada área com rolagem horizontal ganha fotos extras, uma por largura visível (`<tela>--<densidade>--rolagem-N-P.png`).
- Não precisa de API nem de `.env`: toda requisição `/api` é respondida por fixtures de `captura/fixturesDaApi.mjs`, e uma requisição sem fixture derruba a captura. O proxy do Vite aponta para uma porta sem ninguém.
- Comandos: `pnpm --filter @cdd/web captura --saida <dir>` (opções `--so <telas>`, `--url <servidor>`; `--ajuda` lista tudo) e `pnpm --filter @cdd/web captura:comparar <dirA> <dirB>`, que compara byte a byte e sai com código diferente de 0 se alguma foto mudou ou faltou.
- Antes e depois: gerar a base na main e a captura na branch, na mesma máquina, com o mesmo script; depois comparar.
- Critério: duas execuções seguidas no mesmo código dão fotos idênticas, inclusive com a máquina carregada. Uma mudança visual proposital acusa diferença.
- Por que o relógio é congelado: há 14 usos de `new Date()` e `Date.now()` nas páginas. As fontes do Google ficam em cache local (`~/.cache/cdd-captura/fontes`) e são carregadas antes da foto.
- Limites: só o estado inicial de cada tela e os passos catalogados em `captura/telas.mjs` são fotografados; painéis e modais que abrem por clique entram no catálogo quando uma etapa for mexer neles. Telas com wrapper `min-height: 100%` abaixo de uma faixa de aviso deixam a área vazia final fora da foto, e a captura avisa.
- A captura roda antes de qualquer divisão de view. Toda divisão de view depende do harness.

### 13.7 Etapas

Títulos na ordem de leitura. Dependências por título.

| Etapa | Depende de | Bloqueada por |
|---|---|---|
| Convenção escrita | — | — |
| Fronteiras no depcruise | Convenção escrita | — |
| Caracterizar lib/formato e components | — | — |
| Harness de captura de telas | — | — |
| Caracterizar primitivos do ds (`Button`, `StatusBadge`, `AmountDisplay`, `AmountInput`, `Icon`, `RecordRow`, `Receipt`, estados e `FaixaDeDemonstracao`) | — | — |
| Caracterizar o restante do ds (`BottomSheet`, `TextField`, `ScreenHeader`, `PainelDeAcao` e os componentes de domínio) | Caracterizar primitivos do ds | — |
| Mover ds em níveis | Fronteiras no depcruise; Caracterizar o restante do ds | — |
| Primitivos para o ds | Caracterizar lib/formato e components; Mover ds em níveis | — |
| Mover fundação do ds | Primitivos para o ds | — |
| Mover financeiro I | Mover fundação do ds | — |
| Mover financeiro II | Mover financeiro I | — |
| Mover lancamentos | Mover financeiro II | — |
| Mover eventos | Mover lancamentos | — |
| Mover inscricao | Mover eventos | — |
| Mover pessoas e estoque | Mover inscricao | — |
| Mocks transversais | Mover pessoas e estoque | — |
| lib/formato por export | Mocks transversais | — |
| Caracterizar fluxo lancamentos | Mover lancamentos | — |
| Caracterizar financeiro I | Mover financeiro I | — |
| Caracterizar financeiro II | Mover financeiro II | — |
| Caracterizar eventos | Mover eventos | — |
| Caracterizar inscrição | Mover inscricao | — |
| Caracterizar pessoas e estoque | Mover pessoas e estoque | — |
| testes/ global e setupFiles | lib/formato por export | e2e do B0 e ajustes do login |
| app/ em subpastas | testes/ global e setupFiles | e2e do B0 e ajustes do login |
| dados/ sem efeito e sem ciclo | app/ em subpastas | e2e do B0 e ajustes do login |
| Portao no ds | dados/ sem efeito e sem ciclo | e2e do B0 e ajustes do login |
| Mover sistema | Portao no ds | e2e do B0 e ajustes do login |
| Mover transversal | Mover sistema | e2e do B0 e ajustes do login |
| Fronteiras em erro | Mover transversal | — |
| Caracterizar sistema e transversal | Mover transversal | — |
| Dividir RegistrarLancamento | Caracterizar fluxo lancamentos; Harness de captura de telas; lib/formato por export | — |
| Dividir Lançamentos e Meus registros | Caracterizar fluxo lancamentos; Harness; Dividir RegistrarLancamento | — |
| Dividir Verificação de lote | Caracterizar fluxo lancamentos; Harness; Dividir Lançamentos e Meus registros | — |
| Dividir Contas e fundo | Caracterizar financeiro I; Harness; Dividir Verificação de lote | — |
| Dividir Faturas e Empréstimos | Caracterizar financeiro I; Harness; Dividir Contas e fundo | — |
| Dividir Adiantamentos | Caracterizar financeiro I; Harness; Dividir Faturas e Empréstimos | — |
| Dividir Relatórios | Caracterizar financeiro II; Harness; Dividir Adiantamentos | — |
| Dividir Fechamento e Conciliação | Caracterizar financeiro II; Harness; Dividir Relatórios | — |
| Dividir Prestação e Parâmetros | Caracterizar financeiro II; Harness; Dividir Fechamento e Conciliação | — |
| Dividir Agenda | Caracterizar eventos; Harness; Dividir Prestação e Parâmetros | — |
| Dividir Inscrição | Caracterizar inscrição; Harness; Dividir Agenda | — |
| Dividir Leitos, Contratações e Devoluções | Caracterizar eventos; Harness; Dividir Inscrição | — |
| Dividir Ayahuasca e Feitio | Caracterizar pessoas e estoque; Harness; Dividir Leitos, Contratações e Devoluções | — |
| Dividir Pessoas e Anamnese | Caracterizar pessoas e estoque; Harness; Dividir Ayahuasca e Feitio | — |
| Dividir sistema, Meu perfil e entrada | Caracterizar sistema e transversal; Harness; Dividir Pessoas e Anamnese; Fronteiras em erro | herdado: e2e do B0 e ajustes do login |
| Dividir Painel | Caracterizar sistema e transversal; Harness; Dividir sistema, Meu perfil e entrada | herdado |
| Dividir app/shell, sessão e ds | Fronteiras em erro; Caracterizar o restante do ds; Harness; Dividir Painel | herdado |
| Leitura única de valor | Caracterizar primitivos do ds; Caracterizar fluxo lancamentos; Caracterizar financeiro I; Caracterizar eventos; Caracterizar inscrição; Caracterizar pessoas e estoque | — |
| Correções de comportamento | Caracterização da tela correspondente (seções 14 e 15) | — |
| Rotulo e CorpoDaTela | Todas as etapas de divisão; Harness | — |
| Primitivos novos e adoção do catálogo | Rotulo e CorpoDaTela | — |
| Composições de domínio | Primitivos novos e adoção do catálogo | — |
| Limpeza | Composições de domínio | — |
| Rotas lazy | Fronteiras em erro | — |
| Remover o Tailwind | Harness de captura de telas | — |
| Catraca de avisos | Fronteiras no depcruise; Caracterizar lib/formato e components; Caracterizar primitivos do ds | — |

Etapas de divisão de telas de demonstração (de Dividir RegistrarLancamento a Dividir Pessoas e Anamnese) podem andar com o gate fechado. A etapa de leitura única de valor depende das caracterizações das 10 telas que fazem leitura de valor (primitivos do ds, fluxo de lançamentos, financeiro I, eventos, inscrição e pessoas e estoque).

---

## 14. Divergências de comportamento conhecidas

Divergências são registradas como estão pela caracterização e corrigidas em PR próprio, nunca dentro de etapa estrutural. As evidências citam caminhos anteriores à migração.

| Divergência | Evidência | Quando corrigir |
|---|---|---|
| A soma do `AmountInput` não tira o ponto de milhar; a do hook do lançamento tira. Com `1.200+50`, o campo mostra 51,20 e o registro grava 1.250 | `ds/AmountInput.tsx:24`; `pages/lancamento/useFormularioDeLancamento.ts:75-79` | Leitura única de valor, em PR próprio, depois das caracterizações do `ds` e do fluxo de lançamentos |
| `"1.500,00"` vira NaN em Empréstimos e Adiantamentos: o valor é recusado como inválido. Feitio e Ayahuasca leem litros sem tirar o milhar (`1.500,00` vira 0 e 1,5), e Agenda lê os litros do mesmo jeito | `EmprestimosPage.tsx:50` e `:96`; `AdiantamentosPage.tsx:502` (`Number(valor.replace(",", "."))`); `FeitioPage.tsx:48` e `:398`; `AyahuascaPage.tsx:47`; `AgendaPage.tsx:66` | Leitura única de valor, depois da caracterização de financeiro I (e das divisões de Faturas e Empréstimos e de Adiantamentos, se já tiverem rodado); Feitio, Ayahuasca e Agenda na mesma etapa |
| O `{...rest}` do `Button` vem depois de `title`, `onMouseEnter` e `onMouseLeave`. Quem passa `title` apaga o `title` do `blockedReason`; quem passa `onMouseEnter` ou `onMouseLeave` perde o hover | `ds/Button.tsx:59-61` define os handlers e o `title`; `ds/Button.tsx:82` espalha `{...rest}` depois | PR próprio, depois de Caracterizar primitivos do ds, que registra o comportamento atual |
| Os totais tratam o estorno de formas diferentes em 3 telas. Lançamentos exclui os estornados de entradas e de saídas; Meus registros e Fechamento excluem só das saídas | `LancamentosPage.tsx:94-96`; `MeusRegistrosPage.tsx:27-30`; `FechamentoPage.tsx:115-116` | PR próprio, depois das caracterizações; antes da composição de totais. Decisão: fora de entradas e de saídas (seção 15) |
| Na inscrição pública, dias e refeições nunca mudam. Os setters chegam ao `Participacao`, que não os chama, e o total usa sempre 1 diária e nenhuma refeição | `InscricaoPublicaPage.tsx:72-73`, `:302-305`, `:690` e `:692` | PR próprio, depois da caracterização de inscrição |
| Na Conciliação, "importado" é sempre `true`: o estado inicial e a única escrita são `true`, então o caminho "Importar extrato" nunca aparece | `ConciliacaoPage.tsx:22`, `:82` e `:233` | PR próprio, depois da caracterização de financeiro II, conferindo o estado inicial no protótipo |
| `disparaAlerta` ignora `MAIOR_QUE` e compara texto com valor numérico ou booleano. `IGUAL` com valor numérico nunca dispara; `DIFERENTE` com valor numérico sempre dispara | `components/Anamnese.tsx:15-23`; `packages/contracts/src/pessoas.ts:60-61` | PR próprio, depois da caracterização de `components` |
| O `GerenciarContasModal` ignora sem avisar o salvar com nome vazio | `GerenciarContasModal.tsx:60-70`: `return` antes de `onSalvarConta` e `onSalvarFundo`, sem mensagem | PR próprio, depois da caracterização de financeiro I |
| O rótulo do valor da transferência diverge: "Quanto transferir" no registro e "Quanto transferiu" na revisão | `useFormularioDeLancamento.ts:193`; `PainelDeRevisao.tsx:162` | No vocabulário único da composição de domínio. Decisão: "Quanto transferiu" (seção 15) |
| O ícone da conta diverge: a tela usa `wallet`, `credit-card` (para `PESSOAL_DE_TERCEIRO`) ou `landmark`; o modal usa `wallet` ou `landmark` | `ContasEFundoPage.tsx:32-33`; `GerenciarContasModal.tsx:176` | PR próprio, depois da caracterização de financeiro I. Decisão: os 3 casos nas duas telas (seção 15) |
| A demonstração tem três "hoje": `2026-09-02` em `mocks/sessao.ts:6`; `11/09/2026` em `DevolucoesPage.tsx:24`, `ContratacoesPage.tsx:39` e `FeitioPage.tsx:30`; e `new Date(2026, 8, 11)` em `DevolucoesPage.tsx:163` | Evidências citadas | Composição de domínio. Decisão: `2026-09-02`, uma data só (seção 15) |
| Códigos de tela colidem no `ScreenHeader`: `F-11` em `MeuPerfilPage.tsx:18` e `AdiantamentosPage.tsx:143`; `F-09` em `PessoasPage.tsx:75` e `FaturasPage.tsx:74` | Evidências citadas | PR de texto, conferindo os códigos no Documento 4. Pode rodar a qualquer momento fora das etapas de mover |
| O total da inscrição não é duplicata: a interna zera a contribuição de `EQUIPE`; a pública não | `InscricaoPage.tsx:115` e `:120` (`isento = tipo === "EQUIPE"`), contra `InscricaoPublicaPage.tsx:126` | Não é bug. Ao fundir em `inscricao/utils/valorDaInscricao.ts`, entra com parâmetro de isenção e teste para os dois casos |
| A paginação de Lançamentos e a de Meus registros não são iguais: só Lançamentos limita a página atual ao total de páginas | `LancamentosPage.tsx:90-92` contra `MeusRegistrosPage.tsx:22-24` | Não é bug visível hoje. Ao fundir em `usePaginacao`, entra com teste dos dois casos |
| O `AppShell` mostra as duas primeiras letras do nome (`slice(0, 2)`); `iniciais()` mostra a inicial do primeiro e do último nome. Com "Ana", o shell mostra "AN" e Meu perfil mostra "A" | `ds/AppShell.tsx:155`; `lib/formato.ts:77-82`; `pages/perfil/MeuPerfilPage.tsx:62` | PR próprio, antes da adoção do `Avatar` no `AppShell` (a adoção muda o texto) |
| "Contribuições sugeridas" da Agenda separa a lista por vírgula, que também é o decimal: `45,50` vira duas contribuições (45 e 50) | `pages/agenda/AgendaPage.tsx:52-53`; placeholder `"40, 60, 90"` em `FormularioDeTrabalho.tsx:165` | PR próprio, depois da caracterização de eventos. Decisão: só inteiros, valor com centavos recusado com mensagem (seção 15) |

---

## 15. Decisões do dono sobre comportamento e texto

Respondidas pelo dono em 09/10/2026. Cada uma vira correção em PR próprio, depois da caracterização da tela, nunca dentro de etapa estrutural (seção 14).

| Pergunta | Decisão | Onde entra |
|---|---|---|
| Como o lançamento estornado conta nos totais de Lançamentos, Meus registros e Fechamento? | Fica fora de entradas e de saídas, como em Lançamentos hoje: o estorno anula o lançamento (Documento 2, L2). Meus registros e Fechamento mudam de total | PR próprio, depois das caracterizações do fluxo de lançamentos e de financeiro II; antes da composição de totais |
| Qual rótulo do valor da transferência vale no registro e na revisão? | "Quanto transferiu", no mesmo tempo verbal de "Quanto entrou" e "Quanto foi". O formulário de registro muda | Vocabulário único da composição de domínio |
| Que ícone a conta mostra na tela e no modal de contas? | Os 3 casos nas duas: `wallet` (caixa), `credit-card` (conta pessoal de terceiro) e `landmark` (banco). O modal muda | PR próprio, depois da caracterização de financeiro I |
| Que data a demonstração usa como "hoje"? | `2026-09-02`, uma data só, em `pages/mocks/relogio.ts`. Devoluções, Contratações e Feitio passam a usá-la: prazos e "dias esperando" mudam nelas. É a mesma data do relógio da captura de telas | Composição de domínio |
| O que fazer com o Tailwind? | Remover em etapa própria: as regras do preflight de que as telas dependem vão para `ds/fundacao/tokens/base.css`, o plugin e o `@theme` saem, e a captura nas duas densidades prova que nada mudou | Etapa "Remover o Tailwind", depois do harness de captura |
| O cartão "Acesso ao sistema" da ficha de Pessoas (`PessoasPage.tsx:398-444`) repete a gestão de acesso da tela Acessos. O que fazer? | Fica como demonstração até Pessoas ligar no backend (B4); então vira link para Acessos, para não haver dois lugares que concedem acesso. A decisão sobre dados de saúde (08/10) não cobre este cartão | Na ligação de Pessoas ao backend |
| Ligar a catraca de avisos das fronteiras no CI? | Sim: `depcruise-baseline` gera os avisos conhecidos e o CI roda com `--ignore-known`, então aviso novo falha o PR. A linha de base só cai; cada etapa de mover a regenera | PR próprio, logo depois do merge do #57, do #58 e do #59, com os imports do apoio de teste já pelo alias `@/` |
| Como a Agenda lê "Contribuições sugeridas"? | Só valores inteiros em reais, separados por vírgula, como o placeholder ("40, 60, 90"). Valor com centavos é recusado com mensagem no campo; hoje `45,50` vira 45 e 50 | PR próprio, depois da caracterização de eventos |

Pendência de redação: o Documento 5 ainda não lista os primitivos admitidos em pt-BR (tabela da seção 4.3, coluna "Catálogo" = não). Ele mora fora do repositório (`project/uploads/`) e não foi alterado; o apêndice entra quando os documentos de desenho forem versionados.
