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
| Pastas atômicas | Só no `ds/`: `fundacao`, `providers`, `atoms`, `molecules`, `organisms`, `templates`. Cada nível importa a base, o próprio nível e os de baixo. |
| Convenções | Unidade = pasta PascalCase com o nome do componente + `index.ts` (porta única; tudo dentro é privado à subárvore). Alias `@/` para sair da camada e, dentro de `pages/`, para sair do módulo ou da pasta compartilhada (`components`, `hooks`, `utils`, `mocks`); relativo só dentro do mesmo módulo ou da mesma pasta compartilhada. Primitivos promovidos mantêm o nome em pt-BR (o catálogo do Documento 5 continua em inglês). Tipos continuam exportados do arquivo que os define; `tipos.ts` quando 2 ou mais arquivos da unidade compartilham. |

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
- `PERMISSAO_QUE_O_EU_TEM`, `PERMISSAO_QUE_O_EU_NAO_TEM` e `ler` (testes de sessão) ficam junto de `criarEu` em `src/testes/sessaoDeTeste.tsx`. Os testes que os usam se repartem entre `app/sessao` e `pages/transversal/entrada`, então o ancestral comum é `src/`. `Sonda` só é usada pelos testes do `SessaoProvider` e fica em `app/sessao/SessaoProvider/SessaoProvider.dom.test.tsx`. `ler` hoje lê a tela de uma variável do próprio arquivo de teste e passa a recebê-la por parâmetro (`ler(tela, id)`): mudança só em apoio de teste, declarada na etapa.
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
| `useDensidade` | fundação (hook) | não | `ds/fundacao/useDensidade.ts` | `app/Layout` e 31 arquivos de `pages` |
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
- `sessaoDeTeste.tsx`: `criarEu`, com `PERMISSAO_QUE_O_EU_TEM` e `PERMISSAO_QUE_O_EU_NAO_TEM`, e `ler`, além de falsos e montagens de sessão (`EntradaFalsa`, `AvisoDeEncerramentoFalso`, `CenarioDeSessao`, `TelaMontada`, `montarComSessao`, entre outros);
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

- Alias `@/` para sair da camada e, dentro de `pages/`, para sair do módulo ou da pasta compartilhada (`components`, `hooks`, `utils`, `mocks`); relativo só dentro do mesmo módulo ou da mesma pasta compartilhada.
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
| `lib-e-folha` | `lib/` importar outra camada ou React | aviso | 8 |
| `dados-sem-ui` | `dados/` importar UI ou React | erro | 0 |
| `ds-autonomo` | `ds/` importar `app`, `components`, `dados`, `mocks`, `pages` ou `react-router` | erro | 0 |
| `ds-so-pelo-barrel` | Fora do `ds/`, importar qualquer caminho do `ds/` que não seja `ds/index.ts` | erro | 0 |
| `ds-base-nao-sobe` | `fundacao/` ou `providers/` importar átomos, moléculas, organismos ou templates | erro | 0 |
| `ds-atomo-nao-sobe` | Átomos importarem moléculas, organismos ou templates | erro | 0 |
| `ds-molecula-nao-sobe` | Moléculas importarem organismos ou templates | erro | 0 |
| `ds-organismo-nao-sobe` | Organismos importarem templates | erro | 0 |
| `dados-so-pelo-barrel` | Fora de `dados/`, importar arquivo que não seja `index.ts` ou `instancias.ts` | aviso | 25 |
| `instancias-so-no-main` | Importar `dados/instancias.ts` fora de `main.tsx` | erro | 0 |
| `app-nao-conhece-paginas` | `app/` importar `pages/`, exceto `router.tsx` e testes | aviso | 1 |
| `roteador-so-pelo-index-da-pagina` | `router.tsx` importar `pages/` por outro caminho que não o `index.ts` de uma `*Page/` | aviso | 29 |
| `paginas-so-pela-api-publica-do-app` | `pages/` importar `app/` fora de `sessao`, `rotas`, `providers` e `demonstracao` (pelo `index.ts`) | aviso | 22 |
| `pagina-nao-importa-pagina` | Uma `*Page/` importar outra | erro | 0 |
| `modulo-nao-importa-modulo` | Um módulo importar outro | erro | 0 |
| `compartilhado-nao-importa-tela` | Nível compartilhado de `pages/` importar uma `*Page/` | erro | 0 |
| `compartilhado-de-pages-nao-importa-modulo` | `pages/{components,hooks,utils,mocks}` importar módulo | erro | 0 |
| `unidade-so-pelo-index-0` a `-6` | De fora de uma unidade, importar algo que não seja o `index.ts` do topo dela (irmão, primo ou neto). Uma regra por profundidade da origem, de 0 a 6 unidades | erro | 0 cada |
| `unidade-ate-6-niveis` | Sétima unidade aninhada | erro | 0 |
| `producao-global-sem-mock` | `ds/`, `lib/` ou `dados/` importar mock | aviso | 1 |
| `mock-global-so-dados` | `src/mocks/` importar `app`, `components`, `dados`, `ds`, `pages`, `testes` ou biblioteca externa que não seja `@cdd/contracts` | aviso | 1 |
| `tela-de-api-sem-mock` | Telas com fonte `api` e o fluxo de entrada inteiro (`transversal/entrada/`, inclusive `constantes.ts` e `components/`) importarem mock | erro | 0 |
| `apoio-de-teste-so-em-teste` | Código de produção importar `apoioDeTeste`, `src/testes` ou `vitest` | erro | 0 |
| `camada-cruzada-por-alias` | Atravessar camada, ou módulo dentro de `pages/`, sem alias `@/`. Passa a erro quando chegar a zero | aviso | 313 |
| `pasta-camel-case` | Pasta de agrupamento em camelCase sob `apps/web/src` (agrupamento é minúsculo; unidade é PascalCase), que escaparia das regras de unidade, pelos imports feitos de dentro dela | erro | 0 |
| `pasta-camel-case-no-destino` | Importar arquivo de pasta camelCase, inclusive pasta só com arquivos-folha | erro | 0 |

São 33 regras: 26 nomeadas acima e as 7 de `unidade-so-pelo-index`. As contagens são as da linha de base (arquivo `.dependency-cruiser-known-violations.web.json`, seção 12.2), regenerada na etapa Mover ds em níveis, em que `AmountDisplay` e `AmountInput` passaram a importar `@/lib/formato` e saíram 2 avisos de alias; os `comment` da configuração apontam para `pnpm fronteiras:web`, que lista os mesmos avisos.

### 12.2 Linha de base

- A linha de base é o arquivo `.dependency-cruiser-known-violations.web.json`, na raiz, ao lado da configuração: 402 avisos e 0 erros, com as contagens por regra da seção 12.1. São 60 avisos de sete regras, 29 do roteador e 313 da regra de alias. Cada entrada é uma regra com a origem e o destino do import. Os imports do apoio de teste já passaram ao alias `@/`.
- Catraca ligada: `pnpm fronteiras:web:catraca` sai com código diferente de 0 para qualquer violação fora do arquivo, de qualquer severidade. É a verificação "sem aviso novo" da seção 13.3 e a primeira metade do passo "fronteiras do web" do CI.
- A catraca roda `.dependency-cruiser.web.catraca.mjs`, que é a configuração do web com toda regra elevada a erro, junto com `--ignore-known`. A elevação é necessária: o código de saída do depcruise conta só violação de severidade erro e `--ignore-known` não muda isso, então um aviso novo passaria com código 0. O teste estrutural confere a elevação, as mesmas opções do depcruise nas duas configurações e o script `fronteiras:web:catraca`.
- `pnpm fronteiras:web` continua informativo: lista os avisos e só falha por regra em erro.
- `pnpm fronteiras:web:linha-de-base` regenera o arquivo em modo `shrink-only`: tira as entradas cuja violação sumiu e nunca acrescenta. Quem corrige um aviso roda o comando no mesmo PR e commita o arquivo menor. A catraca sozinha só imprime as entradas obsoletas (`stale known violations`) e não falha por elas; quem falha é a segunda metade do passo do CI, que roda o `shrink-only` e confere com `git diff --exit-code` que o arquivo não mudou. Assim a linha de base é sempre igual às violações atuais, e um aviso corrigido não volta sem falhar a catraca. Por fim, num pull request, o passo compara o total de entradas com o da base do PR (o primeiro pai do commit de merge que o CI testa) e falha se ele subir. O teto não pega uma entrada nova trocada por uma corrigida na mesma etapa: essa troca aparece no diff do arquivo, que o revisor confere.
- `pnpm fronteiras:web:linha-de-base:regenerar` roda o mesmo comando em modo `full`: reescreve o arquivo com as violações de agora, inclusive as novas. Só entra numa etapa de mover ou de dividir, ou numa alta de versão de dependência (os itens seguintes); fora delas, só o `shrink-only`.
- Etapa de mover ou de dividir: a entrada é a regra mais a origem e o destino, então um arquivo movido, ou um import conhecido que a divisão leva para um arquivo novo da mesma tela, vira aviso novo, a catraca falha e o `shrink-only` não o absorve. Cada etapa de mover ou de dividir que caia nesse caso regenera o arquivo com `pnpm fronteiras:web:linha-de-base:regenerar` e commita o resultado. Antes de commitar, confira no diff do arquivo que só há renomes (a entrada sai e entra de novo com o caminho novo, a mesma regra e o mesmo import) e remoções, e que o total de entradas não sobe. Entrada com import que não existia antes da etapa é violação nova: corrija o import, não a linha de base. O aviso de alias some trocando o import por `@/`.
- Alta de versão de dependência: 5 entradas têm destino em `node_modules/.pnpm/react@<versão>/…` ou `react-dom@<versão>_react@<versão>/…`, porque o depcruise resolve o link do pnpm até o caminho versionado. Uma alta de `react` ou `react-dom` muda esse caminho e a catraca falha sem mudança em `src`. Rode `pnpm fronteiras:web:linha-de-base:regenerar` e confira que o diff só troca o trecho versionado do destino, com o mesmo total. As 5 entradas são de `lib-e-folha` e somem quando `useDensidade`, `useValorComAtraso` e `chaveDeIdempotencia` (com o teste de DOM) saírem de `lib/`, nas etapas de mover.
- A linha de base é a foto de antes da migração. Cada etapa de mover a reduz, e a etapa de fronteiras em erro fecha a conta.

### 12.3 Como cada regra é provada

- No molde de `apps/api/test/estrutural`, mas com duas árvores só: `fixtures/apps/web/src/…` (imports que violam) e `fixtures-negativas/apps/web/src/…` (imports permitidos). Cada árvore tem `tsconfig.json` próprio, para o `@/` resolver dentro dela. São 2 execuções do depcruise em vez de uma por regra.
- `casosDasFronteiras.ts` lista, por regra, a severidade prevista e o conjunto exato de imports `origem -> destino` que a fixture positiva deve acusar e que a negativa deve liberar.
- O teste confere: toda regra da configuração tem caso; nenhum import das fixtures fica sem resolver; cada regra acusa exatamente os imports previstos; a negativa tem 0 violações; e `apps/web/src` não tem violação em erro.
- Toda regex é sem grupo quantificado com quantificador dentro: o depcruise 18.4 recusa regex insegura e aborta a execução inteira.
- O `tsconfig` da configuração usa caminho absoluto (caminho relativo dá TS5083). Regras que precisam valer também nas fixtures usam o prefixo `(?:^|/)` ou a captura `^(.*apps/web/src…)`.
- O teste roda no projeto `estrutural` do vitest, dentro de `pnpm --filter @cdd/web test`. O script `fronteiras:web:catraca` da raiz roda as regras sobre `apps/web/src` contra a linha de base, com passo próprio no CI.

### 12.4 Outros verificadores

- `apps/web/scripts/conferir-movimento.mjs` (criado na etapa Mover ds em níveis, a primeira que precisa dele) prova que uma etapa de mover só troca caminhos. Compara o HEAD com o merge-base da base (padrão `origin/main`), só em `apps/web/src` e só pelo que está commitado: com mudança não commitada em `apps/web/src`, sai com código 1. A leitura é do compilador do TypeScript, com o tsconfig do web lido do próprio commit. Prova:
  - renomeação de `git diff -M` sem diferença fora das linhas de import e de `export … from`, statement a statement. Dentro de cada statement, o módulo alvo de cada `import()`, `typeof import` e `vi.mock` entra na comparação na ordem em que aparece, e trocar dois alvos falha. Arquivo que não é código tem de manter os bytes, então trocar o caminho de um `@import` de css falha. Isso só aconteceu em "Mover fundação do ds": o `styles/global.css` trocou o caminho dos seus `@import` para `ds/fundacao/`, e essa diferença foi conferida à mão no PR;
  - declaração de topo repartida entre arquivos: reaparece uma vez, com o mesmo nome e o mesmo hash de corpo. O `export` e o nome ficam fora do hash; o comentário dentro do corpo e os alvos de módulo entram. Não há declaração nova nem perdida; `describe`, `it` e `test` se identificam pelo título. O que fica no mesmo arquivo mantém a ordem dos statements de topo;
  - arquivo novo só passa se recebeu declarações de uma origem ou se é `index.ts` só com `export … from`;
  - cada ligação de import (nome, alias, `type`, namespace, default, efeito, `import x = require`) e cada referência de módulo (`import()`, `typeof import`, `vi.mock`) continua apontando para a mesma declaração ou módulo, passando pelo mapa de renomeações e repartições. Import pelo barrel e pelo caminho direto da mesma declaração valem igual; pacote externo compara pelo especificador. `import { type X }` conta como import de efeito, porque com `verbatimModuleSyntax` emite `import {} from`, e por isso difere de `import type { X }`;
  - cada arquivo, barrels incluídos, exporta os mesmos nomes apontando para as mesmas declarações. Há duas exceções. A declaração privada que sai do arquivo numa repartição pode passar a ser exportada no destino, se outro arquivo do HEAD a importa. E um barrel que já existia pode ganhar o nome de uma declaração que saiu do seu arquivo na etapa e que a base já exportava, como o `useDensidade` que foi de `lib/` para `ds/fundacao/` e passou a sair por `@/ds`. O `index.ts` novo de unidade só reexporta nomes que a base já exportava, com o mesmo alvo. Arquivo apagado sem destino perde as suas ligações, e isso é acusado.

  Não prova: a ordem das linhas de import e de `export … from` (trocar dois imports com efeito colateral passa); comentário junto dessas linhas ou fora do corpo de declaração repartida; ajudante de teste repetido e idêntico a um da base, em arquivo de teste movido; `export { type X } from` no lugar de `export type { X } from`, sem caso hoje em `src`; `import()` e `vi.mock` com argumento que não é literal, `require()` solto e `import.meta.glob`; o caminho de import de css e de alias não resolvido, comparado como texto; consumidores fora de `apps/web/src`, que o typecheck cobre; e o comportamento em tempo de execução.

  Renomes com troca de nome (seção 2), que a similaridade do git pode não casar, entram por `--pares <arquivo.json>`, com `arquivos: [{ de, para }]` e `declaracoes: [{ de: { arquivo, nome }, para: { arquivo, nome } }]`. O par só vale se a origem some e o destino aparece, e o corpo e as ligações dele continuam provados. A saída é `ok, … ligações conferidas` com código 0, ou uma linha `DIFERENÇA` por ocorrência com código 1; `--ajuda` imprime as regras.
- `apps/web/scripts/conferir-estrutura.mjs` (etapa de fronteiras em erro): toda pasta PascalCase tem `<Nome>.tsx`, `index.ts` e teste (falta de teste é aviso até o fim da migração); todo `*.tsx` PascalCase de produção fora de `<Nome>/<Nome>.tsx` é acusado, exceto `main.tsx` e `router.tsx`; o módulo de cada tela é o prefixo da primeira permissão em `app/shell/telas.ts`; fluxo sem pasta de tipo compartilhada é acusado; toda `RotaId` tem rota, item em `TELAS` e elemento no router.
- `pnpm lint` passa a cobrir `apps/web/src` (etapa de fronteiras em erro). As violações antigas vão em PR separado.
- Captura de telas (seção 13.6), para o efeito visual.

### 12.5 Severidade final

Na etapa de fronteiras em erro, todas as regras viram erro. A etapa só acontece com `camada-cruzada-por-alias` em zero; até lá, a catraca segura o alias junto com as demais regras.

Nessa etapa a linha de base chega a zero e a catraca deixa de ter função. Saem a configuração `.dependency-cruiser.web.catraca.mjs`, o arquivo `.dependency-cruiser-known-violations.web.json` e o caso de teste da catraca, junto com os scripts `fronteiras:web:catraca`, `fronteiras:web:linha-de-base` e `fronteiras:web:linha-de-base:regenerar`. O passo "fronteiras do web" do CI e a ferramenta `fronteiras_web` do `.codefox.yaml` passam a rodar `pnpm fronteiras:web`, que já falha por qualquer regra.

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
- `pnpm fronteiras:web:catraca` sem erro e sem aviso novo, com a linha de base regenerada e o diff conferido (seção 12.2);
- `node apps/web/scripts/conferir-movimento.mjs`, com tudo commitado: renomeação sem diferença fora das linhas de import, declaração repartida com o mesmo hash de corpo, e cada import, referência de módulo e exportação apontando para a mesma declaração (seção 12.4);
- o mesmo número de testes da main.

### 13.4 Verificação padrão de divisão

- Os testes de caracterização da tela passam antes e depois, sem edição;
- a captura nas duas densidades é idêntica entre a main e a branch (`captura` e `captura:comparar`, seção 13.6);
- `typecheck`, `test` e `build`;
- `pnpm fronteiras:web:catraca` sem erro. Se a divisão levar um import já conhecido para um arquivo novo da mesma tela, regenere a linha de base e confira o diff como na seção 12.2: só muda a origem para o arquivo novo, e o total não sobe.

Nenhuma regra, texto ou cálculo muda numa divisão.

### 13.5 Gates

- **Merge do #55**: era o gate da etapa Mover ds em níveis. Cumprido em 09/10/2026.
- **e2e do B0 e ajustes do login mesclados**: antes de qualquer mudança de pasta em `app/`, `dados/`, sistema e transversal. Antes desse gate, só linhas de import dessas pastas mudam (exceção declarada, seção 2).

A cadeia de dependências transmite esses gates: as etapas de divisão de sistema, transversal e app/shell só andam depois dele.

### 13.6 Captura de telas

- O script (`apps/web/captura/`) sobe o Vite em desenvolvimento com a sessão de demonstração, congela o relógio em 2026-09-02 e usa dois viewports: campo (390 × 844, dentro da consulta de 900 px do `useDensidade`) e escritório (1440 × 900).
- Cobre as 26 rotas do `Layout` e a entrada nas duas densidades, mais os passos catalogados em `captura/telas.mjs`: abas e painéis de Acessos, retorno recusado da entrada e os passos do assistente da inscrição pública. O catálogo é a fonte da lista; cada etapa que mexe numa tela com estados abertos por clique ou por resposta da API acrescenta o passo. Cada área com rolagem horizontal ganha fotos extras, uma por largura visível (`<tela>--<densidade>--rolagem-N-P.png`).
- Telas de painel de Acessos (`alturaFixa` em `captura/telas.mjs`) ficam em altura fixa: a janela não cresce e fica no tamanho da densidade (390 × 844 no campo, 1440 × 900 no escritório). O que rola dentro do painel sai paginado em `<tela>--<densidade>--painel-P.png`, uma altura visível por passo. Assim o limite de altura da folha e a rolagem interna aparecem na foto.
- Não precisa de API nem de `.env`: toda requisição `/api` é respondida por fixtures de `captura/fixturesDaApi.mjs`, e uma requisição sem fixture derruba a captura. O proxy do Vite aponta para uma porta sem ninguém.
- Uma tela do catálogo pode trazer `fixtures` próprias, que valem só para ela e vencem as fixtures gerais. Um 5xx que a própria tela declara é esperado (hoje, `acessos.erro`, com a lista de usuários em 500); qualquer outro 5xx derruba a captura.
- Comandos: `pnpm --filter @cdd/web captura --saida <dir>` (opções `--so <telas>`, `--url <servidor>`; `--ajuda` lista tudo) e `pnpm --filter @cdd/web captura:comparar <dirA> <dirB>`, que compara byte a byte e sai com código diferente de 0 se alguma foto mudou ou faltou.
- Antes e depois: gerar a base na main e a captura na branch, na mesma máquina, com o mesmo script; depois comparar.
- Critério: duas execuções seguidas no mesmo código dão fotos idênticas, inclusive com a máquina carregada. Uma mudança visual proposital acusa diferença.
- Por que o relógio é congelado: há 14 usos de `new Date()` e `Date.now()` nas páginas. As fontes do Google ficam em cache local (`~/.cache/cdd-captura/fontes`) e são carregadas antes da foto.
- Limites: só o estado inicial de cada tela e os passos catalogados em `captura/telas.mjs` são fotografados; painéis e modais que abrem por clique entram no catálogo quando uma etapa for mexer neles. Telas com wrapper `min-height: 100%` abaixo de uma faixa de aviso deixam a área vazia final fora da foto, e a captura avisa. A comparação é por pixel: uma mudança só de DOM ou de acessibilidade que não muda a imagem (`aria-label`, `role`, ordem de foco, texto oculto) passa como igual. Essa parte fica com os testes de caracterização, que consultam por papel e rótulo (seção 13.4).
- Estados sem foto, guardados por teste: a soma do `AmountInput`, o nome do botão de remover anexo, o selo da fatura e o `PermissionDenied` não aparecem em nenhuma tela do catálogo. No #72 o texto deles foi conferido pelos testes de página e por uma comparação do DOM antes e depois. O menu de campo do `AppShell` (#67) abre por clique e também está fora do catálogo; a barra de campo aparece nas fotos de campo das telas dentro do `Layout`.
- `ds/BottomSheet` fica fora do catálogo: só a página de registrar lançamento o abre, e nenhuma tela do catálogo abre o seletor. Fotografá-lo exige uma tela do catálogo que o abra.
- Pendência: a pasta `apps/web/captura/` fica fora do lint e do typecheck. `apps/web/tsconfig.json` inclui só `src`, `test`, `vite.config.ts` e `vitest.config.ts`, e o script `lint` da raiz não lista `apps/web/captura`. No typecheck, pôr a pasta exige `allowJs` e `checkJs` (ou um tsconfig próprio) e a correção dos erros que aparecerem, já que `tsconfig.base.json` não liga `allowJs`. No lint, a etapa de fronteiras em erro (seção 12.4) já muda o script `lint` da raiz e pode incluir a pasta.
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
| Mover ds em níveis (concluída) | Fronteiras no depcruise; Caracterizar o restante do ds | — |
| Primitivos para o ds (concluída) | Caracterizar lib/formato e components; Mover ds em níveis | — |
| Mover fundação do ds (concluída) | Primitivos para o ds | — |
| Mover financeiro I (concluída) | Mover fundação do ds | — |
| Mover financeiro II (concluída) | Mover financeiro I | — |
| Mover lancamentos (concluída) | Mover financeiro II | — |
| Mover eventos (concluída) | Mover lancamentos | — |
| Mover inscricao (concluída) | Mover eventos | — |
| Mover pessoas e estoque (concluída) | Mover inscricao | — |
| Mocks transversais (concluída) | Mover pessoas e estoque | — |
| lib/formato por export (concluída) | Mocks transversais | — |
| Caracterizar fluxo lancamentos (concluída, #82) | — | — |
| Caracterizar financeiro I (concluída, #83) | — | — |
| Caracterizar financeiro II (concluída, #84) | — | — |
| Caracterizar eventos (concluída, #85) | — | — |
| Caracterizar inscrição (concluída, #86) | — | — |
| Caracterizar pessoas e estoque (concluída, #87) | — | — |
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
| Catraca de avisos (concluída, seção 12.2) | Fronteiras no depcruise; Caracterizar lib/formato e components; Caracterizar primitivos do ds | — |

Etapas de divisão de telas de demonstração (de Dividir RegistrarLancamento a Dividir Pessoas e Anamnese) podem andar com o gate fechado. As seis caracterizações de telas de demonstração rodaram antes das etapas de mover do grupo, por decisão do dono (seção 15): os testes ficam ao lado das telas, nos caminhos de hoje, e cada etapa de mover os leva junto com a tela (anexo). Com isso, a leitura única de valor e as correções da seção 14 podem correr em paralelo com a cadeia de mover: quem entra depois rebaseia, e a etapa de mover continua provando só troca de caminho contra a `main` do momento. A etapa de leitura única de valor depende das caracterizações das 10 telas que fazem leitura de valor (primitivos do ds, fluxo de lançamentos, financeiro I, eventos, inscrição e pessoas e estoque). Na prática, Primitivos para o ds rodou depois de Mover fundação do ds e de Mover financeiro I, sobre a branch desta última; a tabela guarda a ordem de dependência.

---

## 14. Divergências de comportamento conhecidas

Divergências são registradas como estão pela caracterização e corrigidas em PR próprio, nunca dentro de etapa estrutural. As evidências citam caminhos anteriores à migração. As divergências das seis caracterizações de telas estão na 14.3, e os padrões que atravessam telas, na 14.4.

| Divergência | Evidência | Quando corrigir |
|---|---|---|
| A soma do `AmountInput` não tira o ponto de milhar; a do hook do lançamento tira. Com `1.200+50`, o campo mostra 51,20 e o registro grava 1.250 | `ds/AmountInput.tsx:26`; `pages/lancamento/useFormularioDeLancamento.ts:75-79` | Leitura única de valor, em PR próprio, depois das caracterizações do `ds` e do fluxo de lançamentos |
| `"1.500,00"` vira NaN em Empréstimos e Adiantamentos: o valor é recusado como inválido. Feitio e Ayahuasca leem litros sem tirar o milhar (`1.500,00` vira 0 e 1,5), e Agenda lê os litros do mesmo jeito. Com ponto como decimal, `1.500` vira 1,50 em Empréstimos e Adiantamentos, e `1.5` vira 15 no hook de lançamento, no painel de contas e no painel de revisão (`12.5` vira 125). `1e3` vira 1.000 em todas as leituras, e `12abc` vira 12 onde a leitura usa `parseFloat` (hook de lançamento, painel de contas, painel de revisão, Ayahuasca e Agenda). Litros: `9L` vale 9 na Ayahuasca e 0 no Feitio; `0x10` vale 0 e 16 | `pages/emprestimos/EmprestimosPage.tsx:50` e `:96`; `pages/adiantamentos/AdiantamentosPage.tsx:502` (`Number(valor.replace(",", "."))`); `pages/estoque/FeitioPage.tsx:48` e `:398`; `pages/ayahuasca/AyahuascaPage.tsx:47`; `pages/agenda/AgendaPage.tsx:66`; `pages/contas/GerenciarContasModal.tsx:39-42`; `pages/lancamento/useFormularioDeLancamento.ts:78`; `pages/verificacao/PainelDeRevisao.tsx:36` | Leitura única de valor, depois da caracterização de financeiro I (e das divisões de Faturas e Empréstimos e de Adiantamentos, se já tiverem rodado); Feitio, Ayahuasca e Agenda na mesma etapa; decisão da seção 15 para o ponto, `1e3` e `12abc` |
| O `{...rest}` do `Button` vem depois de `title`, `onMouseEnter` e `onMouseLeave`. Quem passa `title` apaga o `title` do `blockedReason`; quem passa `onMouseEnter` ou `onMouseLeave` perde o hover | `ds/Button.tsx:61-63` define os handlers e o `title`; `ds/Button.tsx:84` espalha `{...rest}` depois | PR próprio, depois de Caracterizar primitivos do ds, que registra o comportamento atual |
| Os totais tratam o estorno de formas diferentes em 3 telas. Lançamentos exclui os estornados de entradas e de saídas; Meus registros e Fechamento excluem só das saídas | `LancamentosPage.tsx:94-96`; `MeusRegistrosPage.tsx:27-30`; `FechamentoPage.tsx:115-116` | PR próprio, depois das caracterizações; antes da composição de totais. Decisão: fora de entradas e de saídas (seção 15) |
| Na inscrição pública, dias e refeições nunca mudam. Os setters chegam ao `Participacao`, que não os chama, e o total usa sempre 1 diária e nenhuma refeição | `InscricaoPublicaPage.tsx:72-73`, `:302-305`, `:690` e `:692` | PR próprio, depois da caracterização de inscrição |
| Na Conciliação, "importado" é sempre `true`: o estado inicial e a única escrita são `true`, então o caminho "Importar extrato" nunca aparece | `ConciliacaoPage.tsx:22`, `:82` e `:233` | PR próprio, depois da caracterização de financeiro II, conferindo o estado inicial no protótipo |
| `disparaAlerta` ignora `MAIOR_QUE` e compara texto com valor numérico ou booleano. `IGUAL` com valor numérico nunca dispara; `DIFERENTE` com valor numérico sempre dispara | `components/Anamnese.tsx:15-23`; `packages/contracts/src/pessoas.ts:60-61` | PR próprio, depois da caracterização de `components` |
| O `GerenciarContasModal` ignora sem avisar o salvar com nome vazio | `GerenciarContasModal.tsx:60-70`: `return` antes de `onSalvarConta` e `onSalvarFundo`, sem mensagem | PR próprio, depois da caracterização de financeiro I |
| O rótulo do valor da transferência diverge: "Quanto transferir" no registro e "Quanto transferiu" na revisão | `useFormularioDeLancamento.ts:193`; `PainelDeRevisao.tsx:162` | No vocabulário único da composição de domínio. Decisão: "Quanto transferiu" (seção 15) |
| O ícone da conta diverge: a tela usa `wallet`, `credit-card` (para `PESSOAL_DE_TERCEIRO`) ou `landmark`; o modal usa `wallet` ou `landmark` | `ContasEFundoPage.tsx:32-33`; `GerenciarContasModal.tsx:176` | PR próprio, depois da caracterização de financeiro I. Decisão: os 3 casos nas duas telas (seção 15) |
| A demonstração tem três "hoje": `2026-09-02` em `mocks/sessao.ts:6`; `11/09/2026` em `DevolucoesPage.tsx:24`, `ContratacoesPage.tsx:39` e `FeitioPage.tsx:30`; e `new Date(2026, 8, 11)` em `DevolucoesPage.tsx:163`. A competência atual também diverge: `2026-09` em `DevolucoesPage.tsx:25` contra `2026-08` em `mocks/sessao.ts:2` | `mocks/sessao.ts:6` (hoje) e `:2` (competência); `pages/eventos/DevolucoesPage.tsx:24`, `:25` e `:163`; `pages/eventos/ContratacoesPage.tsx:39`; `pages/estoque/FeitioPage.tsx:30` | Composição de domínio. Decisão: `2026-09-02`, uma data só, e competência `2026-09` (seção 15) |
| Códigos de tela colidem no `ScreenHeader` e não batem com o Documento 4. Colisões: `F-11` (Meu perfil e Adiantamentos), `F-09` (Pessoas e Faturas) e `F-10` (Empréstimos, que está certo, e Anamnese, que são P-05 e P-07). Fora delas: `F-03` em Lançamentos e `F-05` em Verificação de lote estão trocados (o Documento 4 diz F-05 e F-03); `F-04` em Contas e fundo (é F-07); `F-07` no Fechamento (é F-22); `F-06` em Relatórios (são F-17 a F-20); `E-02` na Ayahuasca (são S-01 a S-03: saldos, lotes e movimentos) | `pages/perfil/MeuPerfilPage.tsx:18`; `pages/adiantamentos/AdiantamentosPage.tsx:143`; `pages/pessoas/PessoasPage.tsx:75`; `pages/faturas/FaturasPage.tsx:74`; `pages/registros/LancamentosPage.tsx:102`; `pages/verificacao/VerificacaoLotePage.tsx:53`; `pages/contas/ContasEFundoPage.tsx:92`; `pages/fechamento/FechamentoPage.tsx:145`; `pages/relatorios/RelatoriosPage.tsx:111`; `pages/pessoas/AnamnesePage.tsx:106`; `pages/emprestimos/EmprestimosPage.tsx:136`; `pages/ayahuasca/AyahuascaPage.tsx:157` | PR de texto, conferindo os códigos no Documento 4. Pode rodar a qualquer momento fora das etapas de mover |
| O total da inscrição não é duplicata: a interna zera a contribuição de `EQUIPE`; a pública não | `InscricaoPage.tsx:115` e `:120` (`isento = tipo === "EQUIPE"`), contra `InscricaoPublicaPage.tsx:126` | Não é bug. Ao fundir em `inscricao/utils/valorDaInscricao.ts`, entra com parâmetro de isenção e teste para os dois casos |
| A paginação de Lançamentos e a de Meus registros não são iguais: só Lançamentos limita a página atual ao total de páginas. Limpar filtros não volta à primeira página | `pages/registros/LancamentosPage.tsx:90-92`, `:199` e `:238`; `pages/registros/MeusRegistrosPage.tsx:22-24` | O limite da página não tem efeito visível e entra com teste ao fundir em `usePaginacao`. O Limpar filtros que não volta à primeira página é visível e entra em PR próprio, depois da caracterização de lançamentos (#82) |
| O `AppShell` mostra as duas primeiras letras do nome (`slice(0, 2)`); `iniciais()` mostra a inicial do primeiro e do último nome. Com "Ana", o shell mostra "AN" e Meu perfil mostra "A" | `ds/AppShell.tsx:325` (`SeloDoUsuario`, no chip da lateral e no Meu perfil do menu de campo); `lib/formato.ts:77-82`; `pages/perfil/MeuPerfilPage.tsx:62` | PR próprio, antes da adoção do `Avatar` no `AppShell` (a adoção muda o texto) |
| "Contribuições sugeridas" da Agenda separa a lista por vírgula, que também é o decimal: `45,50` vira duas contribuições (45 e 50) | `pages/agenda/AgendaPage.tsx:52-53`; placeholder `"40, 60, 90"` em `FormularioDeTrabalho.tsx:165` | PR próprio, depois da caracterização de eventos. Decisão: só inteiros, valor com centavos recusado com mensagem (seção 15) |
| `TextField` sem sufixo nem ação perde o respiro da direita: o atalho `padding` é seguido de `paddingRight: undefined`, o React apaga o lado direito do estilo inline, e vale a folha de estilo. Hoje o reset `padding: 0` do preflight do Tailwind dá `padding-right` 0px nas duas densidades no app real (Chromium, campo CPF); sem esse reset, vale o padrão do navegador, 2px no Chromium | `ds/TextField.tsx:58` e `:63`. Teste (do #61) em `ds/TextField.dom.test.tsx`: "sem sufixo nem ação o respiro da direita fica sem valor declarado, e o atalho padding some do estilo" | PR próprio, depois da caracterização (#61). A etapa "Remover o Tailwind" (seção 15) muda esse valor se o reset de padding não for levado para `base.css` |
| `TextField` com `error=""` e dica: a dica aparece, mas o campo não a aponta (`error ?? hint` fica `""`), então não há `aria-describedby` | `ds/TextField.tsx:48-50` e `:127-135`. Teste (do #61) em `ds/TextField.dom.test.tsx`: "com erro vazio e dica, a dica aparece mas o campo não aponta para ela" | PR próprio, depois da caracterização (#61) |
| `BottomSheet` sem Esc, sem `role="dialog"` nem `aria-modal`, sem mover o foco para dentro, sem tornar o resto da página inerte, sem estado ARIA na opção marcada (a marca é só o check visual) e com um único `value`: é escolha única, mas o único consumidor em produção a usa como múltipla (linha seguinte) | `ds/BottomSheet.tsx:32-33` (raiz só com `onClick`), `:75` (`o.value === value`), `:80` (`onSelect` devolve um só `value`), `:109` (check). Testes (do #61) em `ds/BottomSheet.dom.test.tsx`: "Esc não fecha: a folha não escuta o teclado", "abrir não move o foco para dentro da folha", "não se declara como diálogo: sem papel nem aria-modal", "não torna o resto da página inerte", "a marca é só visual: a opção escolhida não declara estado por atributo ARIA", "marca com check só a opção cujo value bate" e "clicar na opção já marcada chama onSelect de novo com o mesmo value, sem alternar" | PR próprio, depois da caracterização (#61) |
| Em campo, a folha de categoria de Registrar lançamento (tela F-01) diz "pode marcar mais de uma", mas marca só a última categoria escolhida. Com duas ou mais, tocar numa categoria que está no campo, mas aparece desmarcada na folha, a remove da lista | `pages/lancamento/RegistrarLancamentoPage.tsx:64` (título), `:88-92` (`onSelect` alterna e a folha continua aberta), `:99-100` (`value` é o último de `categorias`), `:105` (código F-01); `pages/lancamento/useFormularioDeLancamento.ts:109-115` (alterna). O contrato é multi: `packages/contracts/src/financeiro.ts:106`. Sem teste; comportamento verificado com a página renderizada em densidade de campo | PR próprio, depois do #61 e de uma caracterização da tela de registrar |
| Botões só com ícone usam `title` em `SuggestionChip` (aceitar e descartar) e `AttachmentCapture` (remover); `TextField` (ação) e `PainelDeAcao` (Fechar) usam `aria-label`. É inconsistência sem efeito demonstrado: `title` é nome acessível válido. O `AttachmentCapture` mede o nome acessível desde o #72; o `SuggestionChip` só localiza os botões pelo atributo `title` | `ds/SuggestionChip.tsx:47` e `:57`; `ds/AttachmentCapture.tsx:60`; contra `ds/TextField.tsx:108-109` e `ds/PainelDeAcao.tsx:191`. Testes: `ds/SuggestionChip.dom.test.tsx` (do #61), "os botões não têm texto: o nome vem do title"; `ds/AttachmentCapture.dom.test.tsx` (do #72), "o nome acessível do botão de remover é o removeLabel: sem aria-label que o sobreponha e com ícone decorativo" | Só vira PR se a verificação em leitor de tela mostrar nome ausente ou errado; depois da caracterização (#61) |
| `AmountDisplay` de despesa com valor negativo mostra sinal duplo: o sinal `− ` vem antes do hífen do número | `ds/AmountDisplay.tsx:20-21` (sinais por natureza) e `:58-59`. Teste em `ds/AmountDisplay.dom.test.tsx`: "despesa com valor negativo — soma o sinal de despesa ao hífen do número" | PR próprio, depois da caracterização (#59) |
| `Receipt` usa o rótulo como `key`: rótulos repetidos geram `key` duplicada, e o React avisa e pode omitir ou repetir linhas numa atualização | `ds/Receipt.tsx:80` (`key={l.label}`). Nenhum teste em `ds/Receipt.dom.test.tsx` cobre rótulo repetido | PR próprio, com um teste novo de rótulo repetido antes da correção |
| `formatarDataHora` com data sem hora (`"2026-10-09"`) mostra o dia anterior às 21:00: a data é lida como meia-noite UTC e convertida para São Paulo | `lib/formato.ts:96` (`new Date(iso)`). Teste em `lib/formato.test.ts`: "data sem hora é lida como meia-noite UTC e aparece como 21:00 do dia anterior" | PR próprio, depois da caracterização (#58) |
| `formatarData("")` devolve `"01/01/1900"`: a string vazia vira ano 0, e o `Date` lê o ano 0 como 1900 | `lib/formato.ts:39-42` (`paraData`) e `:51-53`. Teste em `lib/formato.test.ts`, describe "formatarData", "entrada fora do formato %j sai como %s" | PR próprio, depois da caracterização (#58) |
| `formatarCompetencia("")` devolve `"undefined/"`, e `"2026"` devolve `"undefined/2026"` | `lib/formato.ts:59-62`. Teste em `lib/formato.test.ts`, describe "formatarCompetencia", "entrada incompleta %j sai como %s" | PR próprio, depois da caracterização (#58) |
| `pluralizar` escolhe o singular pelo número bruto e mostra o arredondado: `0.5` sai como "1 dias" | `lib/formato.ts:73-74` (`n === 1` contra o número formatado por `formatarInteiro`). Teste em `lib/formato.test.ts`, describe "pluralizar", "fração %s usa o plural com o número arredondado: %s" | PR próprio, depois da caracterização (#58) |
| `BarraDeProporcao` com `parte` NaN mostra "NaN% do total" no rótulo e deixa a largura sem valor | `components/Blocos.tsx:151` (fração), `:155` (rótulo). Teste em `components/Blocos.dom.test.tsx`: "parte que não é número deixa NaN no rótulo e a largura sem valor" | PR próprio, depois da caracterização (#58) |
| `Icon` com nome fora do registro lança no render ("Element type is invalid") e o componente não trata o caso | `ds/Icon.tsx:155-157` (`REGISTRY[name]` sem fallback). Teste em `ds/Icon.dom.test.tsx`: "nome fora do registro — falha ao renderizar, com elemento inválido" | PR próprio, depois da caracterização (#59) |
| O `×` de fechar do `PainelDeAcao` tem alvo mínimo de 44px também em campo; o Documento 5 pede 56px em campo, "inclusive o `×`". Desde o #67 o menu de campo do `AppShell` abre nesse painel e herda os 44px | `ds/PainelDeAcao.tsx:22` (`ALVO_MINIMO_DE_TOQUE = 44`) e `:196-197`; `ds/AppShell.tsx:462` (menu de campo na variante `folha`); Documento 5, `CDD-v2_2-05-sistema-de-design.md:166` | PR próprio do `PainelDeAcao`: alvo pela densidade, com teste de `minWidth` e `minHeight` |
| A reabertura de período não aparece no `PeriodLock`: o único consumidor do `PeriodLock` não passa `canReopen` nem `onReopen`, nenhum consumidor calcula `canReopen` a partir de `financeiro.periodo.reabrir`, e o contrato não tem comando de reabrir período. O Fechamento já tem o botão Reabrir período, sem consultar a permissão que o Documento 4 (F-23) limita ao administrador | `pages/lancamento/RegistrarLancamentoPage.tsx:157-165`; `packages/contracts/src/identidade/permissoes.ts:20` (só a permissão); `pages/fechamento/FechamentoPage.tsx:344-411` | Na ligação do fechamento ao backend, e a permissão do botão no Fechamento em PR próprio, depois da caracterização de financeiro II (#84). O limite de tamanho do motivo fica com o comando; o `PeriodLock` só repassa `reopenReasonMaxLength` ao campo |

### 14.1 Divergências resolvidas

Saem da tabela acima quando o PR que as corrige entra na `main`. Os testes citados fixam o comportamento novo.

| Divergência | Resolvida em | Testes que fixam o comportamento novo |
|---|---|---|
| Barra inferior de campo do `AppShell` limitada aos 4 primeiros itens, sem `aria-current`, sem contagem e sem acesso ao Meu perfil | #67 | `ds/AppShell.dom.test.tsx`: "mostra os três primeiros itens e o botão Menu, sem seções, com a contagem de quem a tem", "o item ativo é marcado pelo tom royal, pela borda de cima e por aria-current=page", "lista os itens que não couberam na barra sob a seção deles, sem repetir os da barra" e "em campo o chip da lateral não existe: o Meu perfil fica no menu" |
| `PendencyCard` não reabre a pergunta (Documento 2, L11) | #68 | `ds/PendencyCard.dom.test.tsx`: "reabrir chama onReopen uma vez, sem argumentos" e "reabrir bloqueia o botão: dois cliques, uma chamada" |
| Texto de negócio dentro do `ds` | #67 (`AppShell`), #68 (`PendencyCard`), #69 (`PeriodLock`), #70 (`ConfirmAction`) e #72 (`StatusBadge`, `Receipt`, `AmountInput`, `AttachmentCapture` e `PermissionDenied`) | Os cinco do #72: casos "textos vazios", que exigem nenhum texto próprio e nenhum `aria-label`, `title`, `placeholder` ou `alt` com texto (`atributosComTexto` em `ds/apoioDeTeste.tsx`; a única exceção é o placeholder `0,00` do `AmountInput`). `ds/PeriodLock.dom.test.tsx`: "PeriodLock: nenhuma palavra de negócio dentro do componente". `ds/PendencyCard.dom.test.tsx`: "%s: o texto visível é exatamente o recebido, na ordem". `ds/ConfirmAction.dom.test.tsx`: "sem bloqueio, escreve só a nota do consumidor e o rótulo do botão". `ds/AppShell.dom.test.tsx`: "as linhas e a legenda da marca são as que o consumidor passa, com quebra só entre as linhas" e "mostra a instituição e a unidade que recebeu" |
| `canAnswer` booleano junta três atores em dois | #68 | `ds/PendencyCard.dom.test.tsx`: "com a pergunta aberta, explica em texto por que a resposta não é sua" |
| Cartão respondido de `PendencyCard` diz "Pendência aberta" | #68 | `ds/PendencyCard.dom.test.tsx`: "para %s, o cabeçalho passa a ser o de pendência respondida" |
| `PeriodLock` não coleta o motivo da reabertura (Documento 2, P3) | #69. A ligação a um comando segue aberta (tabela acima) | `ds/PeriodLock.dom.test.tsx`: "clicar com o motivo escrito chama onReopen uma vez, com o motivo e mais nada" e o describe "PeriodLock: o motivo não passa de um período para o seguinte" |
| `useTermo` lança `TypeError` para regime fora do contrato | #71 | `ds/RegimeVocabulary.dom.test.tsx`, describe "regime fora do contrato" |
| `Responder` de `PendencyCard` sem validar nem aparar, sem esvaziar e com rascunho que não reinicia | #68 | `ds/PendencyCard.dom.test.tsx`: "com a caixa vazia, o botão fica indisponível e o clique não entrega nada", "Responder entrega o texto sem os espaços das pontas", "Responder esvazia a caixa e bloqueia o botão: um segundo clique não entrega de novo" e "o rascunho reinicia quando a pendência é trocada por outra, mesmo com a mesma pergunta" |
| `onConfirm` e `onReopen` recebem o evento de clique | #69 (`onReopen`) e #70 (`onConfirm`) | `ds/ConfirmAction.dom.test.tsx`: "onConfirm é chamado sem argumento algum: o evento de clique não vaza para o consumidor"; `ds/PeriodLock.dom.test.tsx`: "clicar com o motivo escrito chama onReopen uma vez, com o motivo e mais nada" |
| `ConfirmAction` bloqueado usa a mesma orientação para qualquer regra, e regras repetidas geram `key` duplicada | #70. Bloqueado, o aviso continua no lugar da nota de irreversibilidade | `ds/ConfirmAction.dom.test.tsx`: "a orientação do bloqueio é a que o consumidor passou, qualquer que seja a regra", "o aviso é a frase do consumidor, um espaço e a regra, que fica num elemento próprio", "o aviso é o cabeçalho de várias regras do consumidor, sem nomear regra nenhuma" e o describe "regras repetidas" |

### 14.2 Contratos do `ds` que mudaram com as correções

- **Critério do texto (seção 15, sobre texto de negócio no `ds`).** Palavra genérica de interface fica no `ds`: "Menu", "Fechar", "Confirmar", "Tentar de novo", os nomes dos botões do `SuggestionChip` e o título padrão do `TwoAxisGuard`. Nome de papel, nome de tela, instituição e termo do domínio vêm do consumidor por prop. A `FaixaDeDemonstracao` é UI do app (seção 4.3) e sai do `ds` na etapa de app/ em subpastas.
- **`AppShell` (#67).** Props obrigatórias novas: `institution`, `unit`, `brand` (`lines` e `tagline`) e `userLabel`. Opcional: `userActive`, que em campo realça o botão Menu e marca o Meu perfil do menu com `aria-current="page"`, e em escritório marca o chip do usuário. Em campo, a barra mostra 3 itens e o botão Menu; o menu abre como folha do `PainelDeAcao`, lista os demais itens por seção, com contagem e item ativo, e o Meu perfil; fecha com Esc, com o `×`, ao escolher um item e ao mudar de página, e devolve o foco ao botão Menu.
- **`PendencyCard` (#68).** `role` (`'addressee'`, `'reviewer'` ou `'observer'`), `pendencyId` obrigatório e `texts` por papel. `pendencyId` é a `key` do estado local: o consumidor passa um id estável e distinto por pendência. `onAnswer` existe só para o destinatário; `onReopen()`, sem argumentos, só para quem conferiu. Resposta vazia ou só de espaços conta como sem resposta. O barrel do `ds` exporta a união `PendencyCardProps`, `PendencyRole` e os tipos de texto (`PendencyTexts`, `AddresseeTexts` e `ReviewerTexts`), não os tipos de props de cada papel.
- **O que "reabrir" faz no domínio é da B1** (retirar a resposta ou abrir pendência nova, mantendo a antiga respondida). O bloqueio do botão de reabrir é local ao cartão montado: se a B1 abrir pendência nova, o consumidor passa `role="observer"` na pendência já reaberta, e o comando de reabrir no backend é idempotente. Com o lançamento já confirmado (L10), o consumidor passa `role="observer"`.
- **`PeriodLock` (#69).** `title` e `reason` por prop, e `reopenDeniedNote` no período sem reabertura; a prop `period` saiu. Com `canReopen`, ficam obrigatórios `reopenLabel`, `reopenReasonLabel`, `reopenReasonRequiredNote` e `onReopen(motivo: string)`, que recebe o motivo sem os espaços das pontas; sem `canReopen`, essas props não são aceitas (provado pelo typecheck). `reopenReasonMaxLength` é opcional e vai para o `maxLength` do campo. Quem ligar a reabertura monta `<PeriodLock key={competencia}>`: a troca de período zera o motivo (describe "PeriodLock: o motivo não passa de um período para o seguinte"). Hoje nenhum consumidor liga a reabertura (seção 14). O aviso de motivo obrigatório descreve o campo por `aria-describedby`, pelo `blockedReasonId` novo do `Button`.
- **`ConfirmAction` (#70).** Obrigatórias: `irreversibleNote`, `blockedGuidance`, `blockedHeadingForOneRule` e `blockedHeadingForManyRules`. `label` continua opcional, com "Confirmar" como padrão (seção 15). Com uma regra, o componente escreve a frase do consumidor e a regra num elemento próprio; com várias, o cabeçalho do consumidor e a lista. A `key` da lista é a posição; `onConfirm` é chamado sem argumento.
- **`useTermo` (#71).** Regime fora do contrato usa o vocabulário de `CONTRIBUICAO`, sem normalizar: `'comercial'` minúsculo e `' COMERCIAL '` com espaços caem no padrão. `data-regime` mostra o regime aplicado, porque `styles/tokens/spacing.css` só define `--term-*` para os dois regimes do contrato.
- **Demais componentes (#72, PR único).** Passam de opcionais a obrigatórias: `StatusBadge.children` (`ReactNode`; `TONES` guarda só as cores), `Receipt.title`, `AmountInput.label`, `sumLabel` e `sumNote`, `AttachmentCapture.label`, `hint` e `removeLabel`. O `PermissionDenied` recebe `title` e `description` inteiros (`ReactNode`); o `Layout` monta a frase.

### 14.3 Divergências das telas de demonstração

Uma tabela por grupo, na ordem das caracterizações. Os testes citados vêm dos PRs #82 a #87, que entram na `main` antes deste registro; a marca "(entra com o #NN)" diz de qual PR veio cada teste.

**Lançamentos (#82)**

| Divergência | Evidência | Quando corrigir |
|---|---|---|
| Meus registros mostra saídas, entradas, conta e categoria no recibo. O Documento 4 (F-02) pede a lista sem total, conta nem categoria | `pages/registros/MeusRegistrosPage.tsx:72` e `:123`; `lib/recibo.ts:25-45`; teste `pages/registros/MeusRegistrosPage.dom.test.tsx` (entra com o #82) | PR próprio, depois da caracterização de lançamentos (#82); decisão da seção 15: sem total, conta nem categoria (F-02) |
| O registro aceita valor vazio, zero ou negativo, e `R$ 40` vira 0,00. O bloqueio só cobre período fechado, conta igual e valor composto | `pages/lancamento/useFormularioDeLancamento.ts:158-166` e `:240-279`; teste `pages/lancamento/RegistrarLancamentoPage.dom.test.tsx` (entra com o #82) | PR próprio, depois da caracterização de lançamentos (#82); decisão da seção 15: vazio e zero bloqueiam com mensagem no campo; negativo é defeito e é recusado |
| Aprovar selecionados aprova itens que o filtro esconde. Aprovar todos de alta confiança ignora filtro e seleção e consolida itens de julho, de período fechado. Desmarcar a caixa de todos limpa também a seleção escondida | `pages/verificacao/VerificacaoLotePage.tsx:36-47` e `:171`; teste `pages/verificacao/VerificacaoLotePage.dom.test.tsx` (entra com o #82) | PR próprio, depois da caracterização de lançamentos (#82); decisão da seção 15: vale só para o que o filtro mostra, e nunca consolida período fechado (Documento 2, L5) |
| O campo Data do painel de revisão aceita digitação e ignora o valor. A correção feita no painel não chega à fila: só o id volta, e a aprovação leva a data original. O valor digitado no painel aceita negativo: `-5` entrega −500 centavos | `pages/verificacao/PainelDeRevisao.tsx:174` e `:34-37`; `pages/verificacao/VerificacaoLotePage.tsx:229`; teste `pages/verificacao/PainelDeRevisao.dom.test.tsx` (entra com o #82) | PR próprio, depois da caracterização de lançamentos (#82). Ao levar a correção à fila, o negativo é recusado, como no registro (seção 15) |
| A competência não nasce da data. A mensagem diz que a data cai em julho, mas digitar uma data de julho não fecha nem bloqueia nada | `pages/lancamento/RegistrarLancamentoPage.tsx:159-163` e `:198`; `pages/lancamento/useFormularioDeLancamento.ts:153` e `:214`; teste `pages/lancamento/RegistrarLancamentoPage.dom.test.tsx` (entra com o #82) | PR próprio, depois da caracterização de lançamentos (#82) |
| Promessas sem ação no registro. O recibo diz "Desfazer nos próximos 2 minutos", mas em campo não há botão; no escritório, Desfazer só limpa a tela. O aviso do período fechado oferece "salvar como rascunho", e não existe botão de rascunho | `pages/lancamento/RegistrarLancamentoPage.tsx:136-152` e `:161`; `pages/lancamento/useFormularioDeLancamento.ts:138-143` e `:216`; teste `pages/lancamento/RegistrarLancamentoPage.dom.test.tsx` (entra com o #82) | PR próprio, depois da caracterização de lançamentos (#82); decisão da seção 15: o texto sai das telas até haver comando no backend |
| Em campo não há data, fornecedor, unidade nem chave de reembolso. O campo "Reembolso a" só aparece em campo se a chave foi ligada no escritório antes da troca de densidade | `pages/lancamento/RegistrarLancamentoPage.tsx:192-209`, `:454-482` e `:359-366`; `lib/useDensidade.ts:10-21`; teste `pages/lancamento/RegistrarLancamentoPage.dom.test.tsx` (entra com o #82) | PR próprio, depois da caracterização de lançamentos (#82); decisão da seção 15: campos padrão editáveis em campo, por folha (Documento 4, F-01) |
| Sugestões do cupom. Aceitar a categoria já escolhida a remove, em vez de manter. As sugestões aparecem também em Entrada e em Transferência, e aceitar a categoria numa transferência grava em campo escondido | `pages/lancamento/useFormularioDeLancamento.ts:117-121` contra `:125-136` e `:229-238`; teste `pages/lancamento/useFormularioDeLancamento.dom.test.ts` (entra com o #82) | PR próprio, depois da caracterização de lançamentos (#82); decisão da seção 15: "Aceitar as N" mantém a categoria, e as sugestões aparecem só em Saída |
| O recibo do registro não bate com o lançamento. A Entrada não traz comprovante nem categoria, que a tela aceita; a Saída não traz "Tipo" e chama a conta de "Conta", enquanto `lib/recibo.ts` diz "Conta de saída"; o fornecedor não entra em recibo nenhum | `pages/lancamento/useFormularioDeLancamento.ts:242-268` contra `lib/recibo.ts:25-45`; teste `pages/lancamento/RegistrarLancamentoPage.dom.test.tsx` (entra com o #82) | PR próprio, depois da caracterização de lançamentos (#82) |
| Busca de Lançamentos não ignora acento: "assai" não acha "Assaí Atacadista" | `pages/registros/LancamentosPage.tsx:84` (`toLowerCase()` sem normalizar); teste `pages/registros/LancamentosPage.dom.test.tsx` (entra com o #82) | PR próprio, depois da caracterização de lançamentos (#82) |
| A gaveta de detalhe inventa o histórico: "Consolidado por Aurio Neto" às 21:04 para qualquer consolidado, e o estorno em 20/08/2026 09:30. Estornar e Ver comprovante não fazem nada, e Estornar fica habilitado em lançamento a conferir | `pages/registros/LancamentosPage.tsx:405-406` e `:486-496`; teste `pages/registros/LancamentosPage.dom.test.tsx` (entra com o #82) | PR próprio, depois da caracterização de lançamentos (#82) |
| O estado vazio por filtro diz "Tudo que chegou pela captura automática já foi conferido" com itens nas outras origens | `pages/verificacao/VerificacaoLotePage.tsx:203`; teste `pages/verificacao/VerificacaoLotePage.dom.test.tsx` (entra com o #82) | PR próprio, depois da caracterização de lançamentos (#82) |
| Meus registros sem registros: não há estado vazio, o carrossel mostra "1 de 0" e vira "NaN de 0" ao tocar em próximo. O subtítulo diz "últimos 30 dias", e a lista traz lançamento de julho | `pages/registros/MeusRegistrosPage.tsx:32` e `:46`; teste `pages/registros/MeusRegistrosPage.dom.test.tsx` (entra com o #82) | PR próprio, depois da caracterização de lançamentos (#82); o Documento 4 (seção 13) pede cinco estados para F-02 e F-03 |
| A gaveta de detalhe e o painel de revisão não se declaram como diálogo, não têm `aria-modal`, Esc não os fecha e o foco não entra neles | `pages/registros/LancamentosPage.tsx:413`; `pages/verificacao/PainelDeRevisao.tsx:62`; testes `pages/registros/LancamentosPage.dom.test.tsx` e `pages/verificacao/PainelDeRevisao.dom.test.tsx` (entram com o #82) | PR próprio, depois da caracterização de lançamentos (#82); padrão na seção 14.4 |

**Financeiro I (#83)**

| Divergência | Evidência | Quando corrigir |
|---|---|---|
| A reserva acima do fundo próprio deixa o Livre negativo, com a barra em 0% e sem aviso. Valor zero ou negativo também é aceito | `pages/contas/ContasEFundoPage.tsx:66` e `:234`; `pages/contas/GerenciarContasModal.tsx:67`; teste `pages/contas/GerenciarContasModal.dom.test.tsx` (entra com o #83) | PR próprio, depois da caracterização de financeiro I (#83); decisão da seção 15: o painel avisa e bloqueia; zero ou negativo é recusado |
| A cor do fundo depende da tela: na tela ela é contada entre os fundos ativos; no painel, entre todos. Inativar um fundo muda a cor do seguinte só na tela | `pages/contas/ContasEFundoPage.tsx:70-75` contra `pages/contas/GerenciarContasModal.tsx:195-204`; teste `pages/contas/ContasEFundoPage.dom.test.tsx` (entra com o #83) | PR próprio, depois da caracterização de financeiro I (#83) |
| Textos fixos que parecem dado: toda conta conciliada diz "Conciliada ontem", e a posição diz "posição de hoje, 09:12" | `pages/contas/ContasEFundoPage.tsx:36` e `:132`; teste `pages/contas/ContasEFundoPage.dom.test.tsx` (entra com o #83) | PR próprio, depois da caracterização de financeiro I (#83); decisão da seção 15: vêm da data da última conciliação |
| O título do formulário segue o nome digitado: apagar o nome faz o título voltar a "Nova conta" enquanto se edita. O nome salvo não vem aparado | `pages/contas/GerenciarContasModal.tsx:440`, `:492` e `:63-67`; teste `pages/contas/GerenciarContasModal.dom.test.tsx` (entra com o #83) | PR próprio, depois da caracterização de financeiro I (#83) |
| Faturas abre a fatura de um jeito no início e de outro ao trocar de cartão: no início, a primeira fechada; ao voltar a um cartão, a primeira não paga | `pages/faturas/FaturasPage.tsx:34` e `:46`; teste `pages/faturas/FaturasPage.dom.test.tsx` (entra com o #83) | PR próprio, depois da caracterização de financeiro I (#83); decisão da seção 15: a primeira não paga |
| Data apagada aceita: pagamento de fatura, devolução, novo empréstimo, despesa e ressarcimento passam sem validação. A linha mostra 01/01/1900, ou no ressarcimento não diz quando nem por qual conta | `pages/faturas/FaturasPage.tsx:63`; `pages/emprestimos/EmprestimosPage.tsx:64` e `:113`; `pages/adiantamentos/AdiantamentosPage.tsx:102` e `:122`; testes `pages/faturas/FaturasPage.dom.test.tsx` e `pages/emprestimos/EmprestimosPage.dom.test.tsx` (entram com o #83) | PR próprio, depois da caracterização de financeiro I (#83); decisão da seção 15: "Informe a data" no campo, sem registrar |
| Estado de formulário que passa para o seguinte. Data e conta de devolução, ressarcimento e pagamento continuam no formulário seguinte. O valor de um empréstimo reaparece no outro, porque abrir outro empréstimo não limpa `valorDevolucao`. O motivo da recusa é único para todas as linhas | `pages/emprestimos/EmprestimosPage.tsx:36-37`, `:125`, `:243` e `:284`; `pages/adiantamentos/AdiantamentosPage.tsx:45` e `:47-48`; `pages/faturas/FaturasPage.tsx:36-37`; teste `pages/emprestimos/EmprestimosPage.dom.test.tsx` (entra com o #83) | PR próprio, depois da caracterização de financeiro I (#83); decisão da seção 15 para data e conta: a data volta a hoje e a conta fica; valor e motivo sem decisão |
| Botão sem ação e rótulo trocado: "Transferir entre contas" não faz nada ao clicar. O painel de contas chama de "Excluir" o que a nota chama de inativar | `pages/contas/ContasEFundoPage.tsx:168-170`; `pages/contas/GerenciarContasModal.tsx:226` e `:355`; testes `pages/contas/ContasEFundoPage.dom.test.tsx` e `pages/contas/GerenciarContasModal.dom.test.tsx` (entram com o #83) | PR próprio, depois da caracterização de financeiro I (#83) |
| Registrar um empréstimo com o formulário de devolução aberto não fecha a devolução nem limpa o valor digitado, e a devolução passa a gravar no empréstimo novo | `pages/emprestimos/EmprestimosPage.tsx:75`; teste `pages/emprestimos/EmprestimosPage.dom.test.tsx` (entra com o #83) | PR próprio, depois da caracterização de financeiro I (#83); decisão da seção 15: fecha a devolução e limpa o valor |
| O resumo de Adiantamentos diz "nada pendente" ao lado de valor a ressarcir quando o único item é de hoje | `pages/adiantamentos/AdiantamentosPage.tsx:193`; teste `pages/adiantamentos/AdiantamentosPage.dom.test.tsx` (entra com o #83) | PR próprio, depois da caracterização de financeiro I (#83); decisão da seção 15: diz "o mais antigo é de hoje" |

**Financeiro II (#84)**

| Divergência | Evidência | Quando corrigir |
|---|---|---|
| A gaveta "Movimento da conta" soma entradas e saídas como positivos (5.202,22), enquanto a linha da conta mostra o resultado (-28,54) | `pages/relatorios/RelatoriosPage.tsx:106` e `:602`; teste `pages/relatorios/RelatoriosPage.dom.test.tsx` (entra com o #84) | PR próprio, depois da caracterização de financeiro II (#84); decisão da seção 15: total líquido, igual ao número clicado |
| O aviso "Inclui N lançamentos a conferir" soma entradas, saídas e transferências sem sinal | `pages/relatorios/useRelatorio.ts:161`; teste `pages/relatorios/RelatoriosPage.dom.test.tsx` (entra com o #84) | PR próprio, depois da caracterização de financeiro II (#84); decisão da seção 15: o aviso separa entradas de saídas |
| O resumo do recorte mostra o valor interno do filtro ("saida", "a conferir") e não o rótulo do seletor | `pages/relatorios/RelatoriosPage.tsx:58-63`; teste `pages/relatorios/RelatoriosPage.dom.test.tsx` (entra com o #84) | PR próprio, depois da caracterização de financeiro II (#84) |
| O delta mostra "-0%" para queda menor que 0,5%, e saída igual à base aparece em atenção | `pages/relatorios/useRelatorio.ts:208` e `:213`; teste `pages/relatorios/useRelatorio.test.ts` (entra com o #84) | PR próprio, depois da caracterização de financeiro II (#84) |
| Período personalizado: "03/25" é lido como o ano 25 e cai em zero lançamentos. De depois de Até zera tudo, sem aviso | `pages/relatorios/useRelatorio.ts:40-46` e `:75`; teste `pages/relatorios/useRelatorio.dom.test.tsx` (entra com o #84) | PR próprio, depois da caracterização de financeiro II (#84); decisão da seção 15: "03/26" é março de 2026, e De depois de Até avisa e não soma |
| O Fechamento só trava pela fila de verificação. Lançamentos a conferir na competência não bloqueiam, e não há checagem de competência anterior aberta nem hash do conjunto | `pages/fechamento/FechamentoPage.tsx:51` e `:66`; teste `pages/fechamento/FechamentoPage.dom.test.tsx` (entra com o #84) | PR próprio, depois da caracterização de financeiro II (#84); decisão da seção 15: bloqueios P1 e P4 já no protótipo; o hash (P2) na ligação ao backend |
| Textos fixos no Fechamento: "agosto de 2026 fechado." em minúscula e "Agosto reaberto" fixo; ata, "31/08", "31/07" e "01/09/2026, 09:20" fixos; o item de comprovantes resolvido ainda diz "0 lançamentos sem anexo — não impede"; três contas pendentes saem "A e B e C" | `pages/fechamento/FechamentoPage.tsx:77`, `:78`, `:88`, `:96`, `:130`, `:138`, `:203` e `:340`; teste `pages/fechamento/FechamentoPage.dom.test.tsx` (entra com o #84) | PR próprio, depois da caracterização de financeiro II (#84) |
| Conciliação: "Sem par" soma linhas e sugestões e ignora os lançamentos sem linha, embora a nota diga "linhas e lançamentos a resolver" | `pages/conciliacao/ConciliacaoPage.tsx:55` e `:104`; teste `pages/conciliacao/ConciliacaoPage.dom.test.tsx` (entra com o #84) | PR próprio, depois da caracterização de financeiro II (#84); decisão da seção 15: linhas do banco e lançamentos sem par; sugestões ficam fora |
| Conciliação: ações sem efeito na demonstração. O seletor de Conta não muda arquivo nem colunas; "Registrar lançamento" não faz nada; Casar não mexe na coluna de lançamentos, que não esvazia pela interface | `pages/conciliacao/ConciliacaoPage.tsx:23`, `:166-168`, `:206-211` e `:350-352`; teste `pages/conciliacao/ConciliacaoPage.dom.test.tsx` (entra com o #84) | PR próprio, depois da caracterização de financeiro II (#84) |
| Conciliação: o motivo de ignorar é um estado único da tela, e não de cada linha. Voltar não o descarta | `pages/conciliacao/ConciliacaoPage.tsx:28` e `:137`; teste `pages/conciliacao/ConciliacaoPage.dom.test.tsx` (entra com o #84) | PR próprio, depois da caracterização de financeiro II (#84); decisão da seção 15: o motivo recomeça a cada linha, e Voltar descarta |
| Prestação: o histórico mostra a chave da unidade ("MUNAY", "LOJINHA") e o seed mostra o rótulo. Trocar a unidade só muda o nome no documento; os números seguem o consolidado | `pages/prestacao/PrestacaoDeContasPage.tsx:32`, `:48` e `:137-144`; `mocks/prestacao.ts:170`; teste `pages/prestacao/PrestacaoDeContasPage.dom.test.tsx` (entra com o #84) | PR próprio, depois da caracterização de financeiro II (#84) |
| Prestação: o recado diz "Agosto de 2026" com maiúscula no meio da frase, e o documento diz "agosto de 2026" | `pages/prestacao/PrestacaoDeContasPage.tsx:58` e `:259`; teste `pages/prestacao/PrestacaoDeContasPage.dom.test.tsx` (entra com o #84) | PR próprio, depois da caracterização de financeiro II (#84) |
| "Escolher linha" abre com "Receita de contribuição" também para categoria de despesa, e lista as 15 linhas sem filtrar por natureza | `pages/parametros/ParametrosPage.tsx:31`, `:114` e `:291`; teste `pages/parametros/ParametrosPage.dom.test.tsx` (entra com o #84) | PR próprio, depois da caracterização de financeiro II (#84); decisão da seção 15: respeita a natureza e abre sem linha escolhida |
| Parâmetros: texto e rótulo errados. O recado de trocar a linha diz que os lançamentos "estavam fora do relatório"; o tipo MANUTENCAO sai "Manutencao"; a Lojinha tem faturamento e não tem teto, e o bloco não aparece; "Editar" não faz nada | `pages/parametros/ParametrosPage.tsx:43`, `:264`, `:388` e `:429`; teste `pages/parametros/ParametrosPage.dom.test.tsx` (entra com o #84) | PR próprio, depois da caracterização de financeiro II (#84) |
| Relatórios: "Fundo próprio contra as metas" fixa meta de 6.000 e 12.000 e não muda com o período nem com os filtros; em Contas e fundo, os dois fundos têm meta null | `mocks/relatorios.ts:122-144` (`metasDeFundo`) contra `mocks/financeiro.ts:89` e `:99`; teste `pages/relatorios/RelatoriosPage.dom.test.tsx` (entra com o #84) | PR próprio (dado de demonstração), depois da caracterização de financeiro II (#84) |

**Eventos (#85)**

| Divergência | Evidência | Quando corrigir |
|---|---|---|
| Contratações: registrar o recebimento com a data apagada mostra o aviso de sucesso e nada muda; o cartão segue "a receber". O mesmo vale para a data da saída em Devoluções, que grava vazia em Já devolvidas | `pages/eventos/ContratacoesPage.tsx:60` (`recebidoEm: data`), `:51` e `:410`; `pages/eventos/DevolucoesPage.tsx:63`; teste `pages/eventos/ContratacoesPage.dom.test.tsx` (entra com o #85) | PR próprio, depois da caracterização de eventos (#85); decisão da seção 15: data vazia é recusada com mensagem no campo |
| Contratações: o valor recebido sai do faturamento do ano e da barra do teto do MEI. Com R$ 3.200, a barra cai de 58% para 54% | `pages/eventos/ContratacoesPage.tsx:115`, `:180` e `:191`; teste `pages/eventos/ContratacoesPage.dom.test.tsx` (entra com o #85) | PR próprio, depois da caracterização de eventos (#85); decisão da seção 15: o valor recebido soma nos dois |
| Devolução entra como estorno ("nenhuma despesa nova"), e não como lançamento de saída vinculado ao evento (Documento 2, DV4). O comentário do arquivo admite a divergência | `pages/eventos/DevolucoesPage.tsx:71` e `:377-379`; teste `pages/eventos/DevolucoesPage.dom.test.tsx` (entra com o #85) | PR próprio, depois da caracterização de eventos (#85); decisão da seção 15: lançamento de saída, como manda o DV4; o texto da tela muda |
| Devolução de competência fechada vai para o mês corrente da tela (09/2026), sem motivo registrado | `pages/eventos/DevolucoesPage.tsx:55` e `:322`; teste `pages/eventos/DevolucoesPage.dom.test.tsx` (entra com o #85) | PR próprio, depois da caracterização de eventos (#85); decisão da seção 15: segue o Documento 2, L9 |
| Agenda: editar o dirigente muda o cabeçalho, mas "Quem conduz" segue com o dirigente antigo | `pages/agenda/AgendaPage.tsx:74-76` e `:84`; teste `pages/agenda/AgendaPage.dom.test.tsx` (entra com o #85) | PR próprio, depois da caracterização de eventos (#85) |
| Agenda: o "pronto" da tarefa fica na posição da lista, não na tarefa; reordenar na edição passa a marcação para outra tarefa | `pages/agenda/AgendaPage.tsx:177`; `pages/agenda/DetalheDoTrabalho.tsx:76` e `:203`; teste `pages/agenda/AgendaPage.dom.test.tsx` (entra com o #85) | PR próprio, depois da caracterização de eventos (#85) |
| Agenda: com uma só contribuição (40), a nota diz "sem contribuição" | `pages/agenda/DetalheDoTrabalho.tsx:182`; teste `pages/agenda/DetalheDoTrabalho.dom.test.tsx` (entra com o #85) | PR próprio, depois da caracterização de eventos (#85) |
| Agenda: litros com ponto ("9.5 L previstos"), enquanto o Estoque usa vírgula com uma casa | `pages/agenda/DetalheDoTrabalho.tsx:146` e `:178`; `pages/agenda/AgendaPage.tsx:279` (lista da agenda); `lib/formato.ts:19` (`formatarLitros`); teste `pages/agenda/DetalheDoTrabalho.dom.test.tsx` (entra com o #85) | PR próprio, depois da caracterização de eventos (#85) |
| Agenda: a data da cerimônia não é validada. 31/02 vira um mês com uma cerimônia que o calendário não mostra, e texto sem barras vira dia 1 | `pages/agenda/AgendaPage.tsx:50` e `:59-61`; teste `pages/agenda/AgendaPage.dom.test.tsx` (entra com o #85) | PR próprio, depois da caracterização de eventos (#85); decisão da seção 15: dd/mm/aaaa, e data vazia ou impossível é recusada com mensagem no campo |
| Agenda: a key da tarefa é o título; títulos iguais geram key repetida, e o React avisa | `pages/agenda/DetalheDoTrabalho.tsx:206`; teste `pages/agenda/DetalheDoTrabalho.dom.test.tsx` (entra com o #85) | PR próprio, depois da caracterização de eventos (#85); mesma classe da linha do `Receipt` |
| A rota da Agenda abre com `eventos.evento.editar` ou `eventos.inscricao.ler` (acesso por `.some`), e a de Leitos só com `eventos.operacao.ler`. As ações de escrita das duas telas não consultam permissão. O Documento 4 pede `evento.criar` e `.editar` (E-02), `operacao.gerenciar` e `.ler` (E-10) e `operacao.gerenciar` (E-15) | `app/telas.ts:29` e `:31`; `pages/agenda/AgendaPage.tsx:133` e `:187-189`; `pages/eventos/LeitosPage.tsx` (sem `useSessao`); testes `pages/agenda/AgendaPage.dom.test.tsx` e `pages/eventos/LeitosPage.dom.test.tsx` (entram com o #85) | PR próprio, depois da caracterização de eventos (#85); decisão da seção 15: ações de escrita escondidas para quem só lê (padrão na seção 14.4) |
| Leitos: o aviso diz "alocada" no feminino para qualquer nome | `pages/eventos/LeitosPage.tsx:88-89`; teste `pages/eventos/LeitosPage.dom.test.tsx` (entra com o #85) | PR próprio, depois da caracterização de eventos (#85) |
| Leitos: o aviso do cadastro diz "Já aparece no mapa do próximo evento", mas o leito entra no mapa deste evento e na conta de vagas | `pages/eventos/LeitosPage.tsx:710`; teste `pages/eventos/LeitosPage.dom.test.tsx` (entra com o #85) | PR próprio, depois da caracterização de eventos (#85) |
| Leitos: "Acrescentar" com identificação vazia ou só de espaços não faz nada e não avisa; o tipo escolhido continua no leito seguinte, enquanto a identificação é zerada | `pages/eventos/LeitosPage.tsx:684`, `:698` e `:708-709`; teste `pages/eventos/LeitosPage.dom.test.tsx` (entra com o #85) | PR próprio, depois da caracterização de eventos (#85) |
| Leitos: "Dormem na casa e não ocupam leito" lista quem vai embora depois do trabalho e os colchonetes; "Dormem na igreja" conta só os 2 colchonetes | `pages/eventos/LeitosPage.tsx:163` e `:635-660`; `mocks/leitos.ts:149-151`; teste `pages/eventos/LeitosPage.dom.test.tsx` (entra com o #85) | PR próprio, depois da caracterização de eventos (#85) |
| A conta padrão do recebimento (Contratações) e da devolução (Devoluções) é a primeira da lista de `mocks/financeiro.ts` (`contas[0]`, hoje Cora PJ), sem filtrar as ativas, enquanto as opções filtram; não há como trocar o padrão | `pages/eventos/ContratacoesPage.tsx:47` e `:545`; `pages/eventos/DevolucoesPage.tsx:46` e `:343`; teste `pages/eventos/ContratacoesPage.dom.test.tsx` (entra com o #85) | PR próprio, depois da caracterização de eventos (#85). Contratações tem decisão na seção 15: conta padrão personalizável, começa com Cora PJ, e tem de ser uma conta ativa. Devoluções ainda não tem decisão |
| A conta escolhida continua depois de confirmar uma devolução ou um recebimento. Editar a data de uma cerimônia para outro mês não leva o calendário a esse mês (criar leva) | `pages/eventos/DevolucoesPage.tsx:46` e `:53-73`; `pages/eventos/ContratacoesPage.tsx:47` e `:55-68`; `pages/agenda/AgendaPage.tsx:74-76` contra `:90-91`; testes `pages/eventos/DevolucoesPage.dom.test.tsx` e `pages/agenda/AgendaPage.dom.test.tsx` (entram com o #85) | PR próprio, depois da caracterização de eventos (#85); decisão da seção 15: a conta continua, e editar leva ao mês novo |

**Inscrição (#86)**

| Divergência | Evidência | Quando corrigir |
|---|---|---|
| Com a contribuição em branco, acomodação e refeição marcadas somem do total, do resumo e do recado: o total mostra só "A combinar" | `pages/eventos/InscricaoPage.tsx:128`, `:211` e `:946-953`; `pages/publico/InscricaoPublicaPage.tsx:133` e `:863-865`; teste `pages/eventos/InscricaoPage.dom.test.tsx` (entra com o #86) | PR próprio, depois da caracterização de inscrição (#86); decisão da seção 15: mostra o custo conhecido mais o que falta, por exemplo "R$ 90,00 + a combinar" |
| Valor que não é número vira "R$ 0,00 devidos", e valor negativo é aceito: o total sai negativo | `pages/eventos/InscricaoPage.tsx:120` e `:703`; `pages/publico/InscricaoPublicaPage.tsx:126` e `:708`; teste `pages/eventos/InscricaoPage.dom.test.tsx` (entra com o #86) | PR próprio, depois da caracterização de inscrição (#86) |
| Equipe com acomodação paga: o bloco mostra "R$ 90,00 de acomodação", mas o fechamento diz "Isento / não há valor devido" e o recado diz "Isenta de contribuição" | `pages/eventos/InscricaoPage.tsx:115`, `:360-372`, `:941-945` e `:211`; teste `pages/eventos/InscricaoPage.dom.test.tsx` (entra com o #86) | PR próprio, depois da caracterização de inscrição (#86); decisão da seção 15: a isenção é só da contribuição, e o fechamento mostra o valor devido |
| Trocar de evento mantém o nível marcado e o valor digitado, além do tipo, da modalidade, da conversa, do termo da busca, do recado anterior e do link Copiado. Só refeições e leito recomeçam | `pages/eventos/InscricaoPage.tsx:73-74`, `:238-244` e `:702`; teste `pages/eventos/InscricaoPage.dom.test.tsx` (entra com o #86) | PR próprio, depois da caracterização de inscrição (#86); decisão da seção 15: nível e valor recomeçam ao trocar de evento; o restante sem decisão |
| Autorização do responsável não olha o evento nem a modalidade. Qualquer adulto serve de responsável, inclusive a própria pessoa, e um adulto marcado como Criança estelar passa pela regra de criança com a própria autorização. `responsavelDe` não é lido | `pages/eventos/InscricaoPage.tsx:142` e `:278-280`; `mocks/inscricao.ts:147` e `:166`; teste `pages/eventos/InscricaoPage.dom.test.tsx` (entra com o #86) | PR próprio, depois da caracterização de inscrição (#86); decisão da seção 15: a autorização vale por evento; o responsável vem de `responsavelDe`; "Criança estelar" só para menor de idade |
| Recado de confirmar fala sempre no feminino e com artigo fixo: "Sérgio Bittencourt está confirmada no Jornada de três dias" | `pages/eventos/InscricaoPage.tsx:211`; teste `pages/eventos/InscricaoPage.dom.test.tsx` (entra com o #86) | PR próprio, depois da caracterização de inscrição (#86) |
| Salvar como pendente sem pendência alguma diz "com 0 pendências" | `pages/eventos/InscricaoPage.tsx:212`; teste `pages/eventos/InscricaoPage.dom.test.tsx` (entra com o #86) | PR próprio, depois da caracterização de inscrição (#86) |
| Pública promete "guardado neste aparelho", mas o estado é só `useState`: fechar a tela volta ao CPF sem nada | `pages/publico/InscricaoPublicaPage.tsx:64` e `:536`; teste `pages/publico/InscricaoPublicaPage.dom.test.tsx` (entra com o #86) | PR de texto, depois da caracterização de inscrição (#86); o Documento 5, `CDD-v2_2-05-sistema-de-design.md:168`, pede estado em memória, então a correção é de texto |
| Pública pede o contato de emergência duas vezes, na anamnese e na participação. O digitado na anamnese não preenche o segundo campo | `pages/publico/InscricaoPublicaPage.tsx:74`; `mocks/inscricaoPublica.ts:114`; teste `pages/publico/InscricaoPublicaPage.dom.test.tsx` (entra com o #86) | PR próprio, depois da caracterização de inscrição (#86) |
| Pública: pontos de atenção saem só das perguntas respondidas agora. A medicação contínua herdada da Clarice (v2) não gera o ponto que a mesma resposta geraria hoje | `pages/publico/InscricaoPublicaPage.tsx:117-123`; `mocks/inscricaoPublica.ts:191`; teste `pages/publico/InscricaoPublicaPage.dom.test.tsx` (entra com o #86) | PR próprio, depois da caracterização de inscrição (#86); decisão da seção 15: entra junto com os das respostas novas |
| Custo da hospedagem escrito de dois jeitos: "R$ 50,00 por dia" na interna e "R$ 50,00 / dia" na pública | `pages/eventos/InscricaoPage.tsx:350`; `pages/publico/InscricaoPublicaPage.tsx:823`; teste `pages/eventos/InscricaoPage.dom.test.tsx` (entra com o #86) | PR próprio, depois da caracterização de inscrição (#86) |
| Escolha de diárias passa de uma pessoa para a próxima, de um evento para outro, e também depois de salvar como pendente e de confirmar. Beliche abre em 3 diárias para a pessoa seguinte | `pages/eventos/InscricaoPage.tsx:76`, `:85`, `:207-215` (`gravar` só faz `setPessoa(null)`) e `:238-244`; teste `pages/eventos/InscricaoPage.dom.test.tsx` (entra com o #86) | PR próprio, depois da caracterização de inscrição (#86); decisão da seção 15: as diárias recomeçam em 1 em cada um desses casos |
| Botões e seletores da inscrição ficam com alvo de escritório também em campo: "Trocar", "Copiar", a ação da pendência e "Não tem nenhuma" (sem `density`, caem em `office`); os seletores de responsável e de diárias usam `var(--target-office)` fixo | `pages/eventos/InscricaoPage.tsx:425`, `:530`, `:624` e `:903`; `pages/publico/InscricaoPublicaPage.tsx:855`; `components/Campo.tsx:42`; `ds/Button.tsx:43`; teste `pages/eventos/InscricaoPage.dom.test.tsx` (entra com o #86) | PR próprio, depois da caracterização de inscrição (#86); decisão da seção 15: 56 px em campo, como pede o Documento 5, `CDD-v2_2-05-sistema-de-design.md:166` |
| O cartão do link da cerimônia não segue o evento marcado: com a Jornada escolhida, mostra o endereço e os números da Lua Cheia (96 aberturas, 34 inscrições). "Copiado" continua depois de trocar de evento, de pessoa e de salvar | `pages/eventos/InscricaoPage.tsx:248` e `:506`; `mocks/inscricaoPublica.ts:40-48`; teste `pages/eventos/InscricaoPage.dom.test.tsx` (entra com o #86) | PR próprio, depois da caracterização de inscrição (#86); decisão da seção 15: o cartão segue o evento marcado, e o link é um por evento |
| A pública aceita inscrição de criança e não valida CPF nem data de nascimento: o CPF só confere 11 números, e a data de nascimento é texto livre | `pages/publico/InscricaoPublicaPage.tsx:47`, `:53` e `:90-91`; teste `pages/publico/InscricaoPublicaPage.dom.test.tsx` (entra com o #86) | PR próprio, depois da caracterização de inscrição (#86); decisão da seção 15: só adultos (IN2); CPF com dígito verificador; data com formato |

**Pessoas e estoque (#87)**

| Divergência | Evidência | Quando corrigir |
|---|---|---|
| Busca de Pessoas não ignora acento: "sergio" não acha Sérgio. Sem resultado, a lista fica em branco, sem texto de vazio | `pages/pessoas/PessoasPage.tsx:55`, `:61` e `:173`; teste `pages/pessoas/PessoasPage.dom.test.tsx` (entra com o #87) | PR próprio, depois da caracterização de pessoas e estoque (#87); o Documento 4 (seção 13) pede o estado Vazio |
| E-mail do convite sai do primeiro nome em minúsculas, com acento quando há ("sérgio@cdd.org"), sem sobrenome. Os demais seguem nome.sobrenome | `pages/pessoas/PessoasPage.tsx:236`; `mocks/pessoas.ts:156`; teste `pages/pessoas/PessoasPage.dom.test.tsx` (entra com o #87) | PR próprio, depois da caracterização de pessoas e estoque (#87) |
| Anamnese: o aviso manda "descartar" o rascunho, mas não há essa ação. A descrição de rascunho continua depois de publicar, e publicar é um clique, sem tela de impacto | `pages/pessoas/AnamnesePage.tsx:82`, `:94`, `:54-79` e `:206`; teste `pages/pessoas/AnamnesePage.dom.test.tsx` (entra com o #87) | PR próprio, depois da caracterização de pessoas e estoque (#87); decisão da seção 15: "descartar rascunho" entra já; a tela de impacto vem com a B4 |
| Anamnese: o formulário de nova pergunta com texto digitado passa para o rascunho seguinte depois de publicar | `pages/pessoas/AnamnesePage.tsx:54` e `:80`; teste `pages/pessoas/AnamnesePage.dom.test.tsx` (entra com o #87) | PR próprio, depois da caracterização de pessoas e estoque (#87); decisão da seção 15: o formulário fecha ao publicar |
| Ayahuasca: o saldo do lote guarda uma casa. Saída de 0,25 L baixa 0,2 L, e o movimento mostra 0,3 L. Saída que deixa menos de 0,05 L marca o lote como esgotado | `pages/ayahuasca/AyahuascaPage.tsx:125`; teste `pages/ayahuasca/AyahuascaPage.dom.test.tsx` (entra com o #87) | PR próprio, depois da caracterização de pessoas e estoque (#87); decisão da seção 15: duas casas, e 0,25 é aceito |
| Ayahuasca: sair da quarentena devolve o lote como Em uso, e o lacrado perde o estado. "N lotes com daime" conta o lote em quarentena, que "Em estoque" exclui; a faixa de falta esconde o aviso da quarentena | `pages/ayahuasca/AyahuascaPage.tsx:514`, `:248` e `:265-283`; teste `pages/ayahuasca/AyahuascaPage.dom.test.tsx` (entra com o #87) | PR próprio, depois da caracterização de pessoas e estoque (#87); decisão da seção 15: o lote volta ao estado de antes |
| Modal de movimento e ficha do lote da Ayahuasca não se declaram como diálogo, Esc não os fecha e o foco não entra neles | `pages/ayahuasca/AyahuascaPage.tsx:585` e `:703`; teste `pages/ayahuasca/AyahuascaPage.dom.test.tsx` (entra com o #87) | PR próprio, depois da caracterização de pessoas e estoque (#87); padrão na seção 14.4 |
| Feitio: a comparação com o preço de fora diz "Fazer saiu R$ -1.126,00 mais barato" quando o feitio sai mais caro | `pages/estoque/FeitioPage.tsx:494` e `:519`; teste `pages/estoque/FeitioPage.dom.test.tsx` (entra com o #87) | PR próprio, depois da caracterização de pessoas e estoque (#87); decisão da seção 15: "Fazer saiu R$ 1.126,00 mais caro" |
| Feitio: o lote é sempre "Lote 09/2026", e a data de encerramento é texto livre. Concluir não cria lote na Ayahuasca, e o "Lote 03/2026" do Feitio contradiz o da Ayahuasca | `pages/estoque/FeitioPage.tsx:51` e `:422`; `mocks/feitio.ts:115`; `mocks/ayahuasca.ts:42`; teste `pages/estoque/FeitioPage.dom.test.tsx` (entra com o #87) | PR próprio, depois da caracterização de pessoas e estoque (#87); decisão da seção 15: o código do lote é único por instituição |
| Inativar uma pessoa com acesso não suspende o acesso. A nota do indicador diz "1 tem cadastro inativo" | `pages/pessoas/PessoasPage.tsx:132`; teste `pages/pessoas/PessoasPage.dom.test.tsx` (entra com o #87) | Na ligação de Pessoas ao backend (B4); decisão da seção 15: suspende o acesso, com aviso na confirmação |

### 14.4 Padrões que atravessam telas

Cada padrão aparece uma vez, com os lugares conferidos na `main`. Os detalhes de cada tela estão na 14.3 e nas linhas acima.

| Padrão | Lugares | Quando corrigir |
|---|---|---|
| Aviso local sem `role="status"` | `pages/agenda/AgendaPage.tsx:163`, `pages/ayahuasca/AyahuascaPage.tsx:232`, `pages/fechamento/FechamentoPage.tsx:174`, `pages/pessoas/AnamnesePage.tsx:140`, `pages/pessoas/PessoasPage.tsx:109`, `pages/relatorios/RelatoriosPage.tsx:156` e `pages/verificacao/VerificacaoLotePage.tsx:88` (botão "fechar aviso"). Contraste: `components/Blocos.tsx:82` (Recado, com `role="status"`) | PR próprio, depois das caracterizações de lançamentos, financeiro II, eventos e pessoas e estoque (#82, #84, #85, #87). Candidato a componente único de aviso |
| Valores sem "R$" | `formatarDinheiro`, sem "R$", em 16 arquivos de `pages/`. `formatarBRL`, com "R$", em 5: `pages/estoque/FeitioPage.tsx`, `pages/eventos/ContratacoesPage.tsx`, `pages/eventos/DevolucoesPage.tsx`, `pages/eventos/InscricaoPage.tsx` e `pages/publico/InscricaoPublicaPage.tsx`. `formatarValor`, sem "R$", em 5, entre elas `pages/agenda/DetalheDoTrabalho.tsx` | Sem decisão do dono sobre o formato. PR próprio, depois das caracterizações de eventos e inscrição (#85, #86) |
| Permissão por ação ausente | As telas de demonstração, exceto Registrar lançamento, não consultam permissão nas ações de escrita. Exemplos: Agenda (`pages/agenda/AgendaPage.tsx:133` e `:187-189`), Leitos (`pages/eventos/LeitosPage.tsx`, sem `useSessao`) e Fechamento (`pages/fechamento/FechamentoPage.tsx:344-411`). Rotas: `app/telas.ts:29` e `:31` | PR próprio, depois da caracterização de eventos (#85); decisão da seção 15 para Agenda e Leitos. O mesmo encaminhamento vale para as demais telas de demonstração |
| Alvo de toque fixo em `var(--target-office)` | `components/Campo.tsx:42` e `:90` (importado por 24 páginas); `pages/conciliacao/ConciliacaoPage.tsx:223`, `pages/pessoas/PessoasPage.tsx:146`, `pages/registros/LancamentosPage.tsx:188` e `pages/relatorios/RelatoriosPage.tsx:731`; `ds/Button.tsx:43` (sem `density`, cai em `office`); ↑ ↓ × da Anamnese em 32 px (`pages/pessoas/AnamnesePage.tsx:490`). O Feitio passa `density` (`pages/estoque/FeitioPage.tsx:148` e `:458`) | PR próprio por tela, depois da caracterização de cada uma (#82 a #87); decisão da seção 15 para a inscrição: 56 px em campo (Documento 5, `CDD-v2_2-05-sistema-de-design.md:166`) |
| Leitura de valor copiada | Além dos pontos da linha de "1.500,00" na tabela principal, a inscrição repete a leitura em mais 4: `pages/eventos/InscricaoPage.tsx:120` e `:703`; `pages/publico/InscricaoPublicaPage.tsx:126` e `:708` | Leitura única de valor (linha de "1.500,00"); decisão da seção 15 para o ponto. Cada ponto ganha teste com dois pontos de milhar |
| Data digitada sem validação | `pages/faturas/FaturasPage.tsx:63`; `pages/emprestimos/EmprestimosPage.tsx:64` e `:113`; `pages/adiantamentos/AdiantamentosPage.tsx:102` e `:122`; `pages/eventos/ContratacoesPage.tsx:60`; `pages/eventos/DevolucoesPage.tsx:63`; `pages/agenda/AgendaPage.tsx:50` e `:59-61`; `pages/estoque/FeitioPage.tsx:422` (encerramento em texto livre); data de nascimento da inscrição pública (`pages/publico/InscricaoPublicaPage.tsx:109` e `:164-166`) | PR próprio, depois das caracterizações de financeiro I e eventos (#83, #85); decisão da seção 15: "Informe a data" no campo (financeiro I); dd/mm/aaaa, com data vazia ou impossível recusada (eventos) |
| Troca de densidade em execução sem teste | `useDensidade` em 31 arquivos de `pages/`. Na `main`, 5 arquivos de teste stubam `matchMedia` com ouvinte no-op. Só o teste de registro de lançamento exercita a troca (`pages/lancamento/RegistrarLancamentoPage.dom.test.tsx`, entra com o #82) | Sem defeito conhecido. Reconferir os ramos "só em campo" e "só no escritório" de cada peça; ao consolidar o stub em `src/testes/configurarDom.ts` (seção 8.2), usar a versão com ouvintes |
| Atalho e longhand no mesmo estilo | `components/Campo.tsx:233-234` (`font` junto de `fontWeight`; caso novo, só o aviso do React na troca de densidade, sem efeito visual observado). `ds/TextField.tsx:58` e `:63` (já na tabela principal) | PR próprio, depois da caracterização de lançamentos (#82) |
| `Date.now()` como id | `pages/ayahuasca/AyahuascaPage.tsx:96`, `:112` e `:133` (lote e movimento: dois salvamentos no mesmo milissegundo repetem a `key`); `pages/contas/GerenciarContasModal.tsx:171` e `:193`; `pages/adiantamentos/AdiantamentosPage.tsx:116` e `:126`; `pages/emprestimos/EmprestimosPage.tsx:59`; `pages/eventos/ContratacoesPage.tsx:60`; `pages/eventos/LeitosPage.tsx:700`; `pages/agenda/AgendaPage.tsx:79` e `:101`; `pages/prestacao/PrestacaoDeContasPage.tsx:45` | PR próprio por tela, depois da caracterização de cada uma (#83, #84, #85 e #87). Nenhuma tela lê o relógio para regra |
| "Hoje" escrito na tela | Literal `'02/09/2026'`: `pages/pessoas/AnamnesePage.tsx:61`, `:62`, `:69`, `:90` e `:96`; `pages/ayahuasca/AyahuascaPage.tsx:99`, `:113` e `:134`. Literal `'11/09/2026'`: `pages/eventos/DevolucoesPage.tsx:24`, `pages/eventos/ContratacoesPage.tsx:39` e `pages/estoque/FeitioPage.tsx:30`. Ver a linha de "hoje" na tabela principal | Composição de domínio: uma data só, em `pages/mocks/relogio.ts` (seção 15) |
| Ícones sem teste | 180 usos de `iconName=` e `<Icon name=` em 35 arquivos de `pages/`. Só `ds/` tem teste de ícone pela classe `lucide-<nome>` | Cobertura, não defeito: fixar o ícone pela classe ao dividir cada grupo (a inscrição já faz) |
| Estado que passa para o formulário seguinte | Inscrição: `pages/eventos/InscricaoPage.tsx:76`, `:85` e `:207-215`. Devoluções e Contratações: `pages/eventos/DevolucoesPage.tsx:46` e `pages/eventos/ContratacoesPage.tsx:47`. Empréstimos e Adiantamentos: `pages/emprestimos/EmprestimosPage.tsx:36-37` e `:243`; `pages/adiantamentos/AdiantamentosPage.tsx:45` e `:47-48`. Faturas: `pages/faturas/FaturasPage.tsx:36-37`. Anamnese: `pages/pessoas/AnamnesePage.tsx:54` e `:80` | PR próprio por tela, depois da caracterização de cada grupo (#83, #85, #86, #87). Antes de dividir a inscrição (anexo, seção 9.2, divisão da `InscricaoPage` com reducer), varrer os handlers que zeram estado |
| Sobreposição sem papel de diálogo, Esc nem foco | `pages/registros/LancamentosPage.tsx:413` (gaveta); `pages/verificacao/PainelDeRevisao.tsx:62`; `pages/ayahuasca/AyahuascaPage.tsx:585` e `:703`; `ds/BottomSheet.tsx` (seção 14). Contraste: `ds/PainelDeAcao.tsx:143` (`role="dialog"`) | PR próprio por tela, depois das caracterizações de lançamentos e pessoas e estoque (#82, #87). O anexo troca gavetas e o modal de movimento pelo `PainelDeAcao` (anexo, linhas 206 e 226) |
| Texto ou botão que promete o que a tela não faz | `pages/lancamento/RegistrarLancamentoPage.tsx:136-152` (Desfazer, em campo); `pages/contas/ContasEFundoPage.tsx:168-170` ("Transferir entre contas"); `pages/conciliacao/ConciliacaoPage.tsx:350-352` ("Registrar lançamento"); `pages/parametros/ParametrosPage.tsx:429` ("Editar"); `pages/pessoas/AnamnesePage.tsx:82` ("descartar") | PR próprio por tela, depois das caracterizações (#82, #83, #84, #87). Para o Desfazer e o rascunho do registro vale a decisão da seção 15: o texto sai até haver comando no backend |

---

## 15. Decisões do dono sobre comportamento e texto

Respondidas pelo dono em 09/10/2026 e em 10/10/2026. Cada uma vira correção em PR próprio, depois da caracterização da tela, nunca dentro de etapa estrutural (seção 14).

| Pergunta | Decisão | Onde entra |
|---|---|---|
| A barra inferior de campo do `AppShell` mostra só 4 itens, sem acesso aos demais nem ao Meu perfil. É desenho? (10/10/2026) | Não: é resquício do design inicial, e no celular todos os itens têm de estar acessíveis. A barra mostra 3 itens e um botão de menu; o menu lista os demais, inclusive o Meu perfil | Entregue no #67 |
| Quem conferiu pode reabrir a pergunta de uma pendência (Documento 2, L11)? (10/10/2026) | Sim. O `PendencyCard` oferece a quem conferiu a ação de reabrir a pergunta respondida, sem responder por quem foi perguntado | Entregue no #68. O efeito no domínio é da B1 (seção 14.2) |
| Até onde vale a regra "nenhum componente do `ds` tem palavra de negócio escrita dentro" (Documento 5 §4.3)? (10/10/2026) | Vale sempre, inclusive para os textos que o próprio Documento 5 pede ao `PendencyCard` e ao `ConfirmAction`: o componente recebe o texto do consumidor por prop. O `RegimeVocabulary` continua sendo o único lugar com vocabulário de negócio no `ds`. O design system vai mudar depois da refatoração | Entregue no #67, #68, #69, #70 e #72; os componentes restantes foram num PR único, o #72. Critério na seção 14.2 |
| O `PeriodLock` coleta o motivo da reabertura (Documento 2, P3)? (10/10/2026) | Sim. A reabertura pede o motivo em texto, e o motivo é entregue a quem reabre | Entregue no #69. A ligação a um comando segue aberta (seção 14) |
| O botão do `ConfirmAction` tem de receber sempre o rótulo do consumidor? (10/10/2026) | Não. "Confirmar" fica como padrão, por ser palavra genérica de interface; o consumidor troca por `label` quando precisar | Entregue no #70 |
| O que o `useTermo` faz com um regime fora do contrato? (10/10/2026) | Usa o vocabulário padrão, o de `CONTRIBUICAO` (o mesmo padrão do provider), em vez de derrubar a tela | Entregue no #71 |
| Como o lançamento estornado conta nos totais de Lançamentos, Meus registros e Fechamento? | Fica fora de entradas e de saídas, como em Lançamentos hoje: o estorno anula o lançamento (Documento 2, L2). Meus registros e Fechamento mudam de total | PR próprio, depois das caracterizações do fluxo de lançamentos e de financeiro II; antes da composição de totais |
| Qual rótulo do valor da transferência vale no registro e na revisão? | "Quanto transferiu", no mesmo tempo verbal de "Quanto entrou" e "Quanto foi". O formulário de registro muda | Vocabulário único da composição de domínio |
| Que ícone a conta mostra na tela e no modal de contas? | Os 3 casos nas duas: `wallet` (caixa), `credit-card` (conta pessoal de terceiro) e `landmark` (banco). O modal muda | PR próprio, depois da caracterização de financeiro I |
| Que data a demonstração usa como "hoje"? | `2026-09-02`, uma data só, em `pages/mocks/relogio.ts`. Devoluções, Contratações e Feitio passam a usá-la: prazos e "dias esperando" mudam nelas. É a mesma data do relógio da captura de telas | Composição de domínio |
| O que fazer com o Tailwind? | Remover em etapa própria: as regras do preflight de que as telas dependem vão para `ds/fundacao/tokens/base.css`, o plugin e o `@theme` saem, e a captura nas duas densidades prova que nada mudou | Etapa "Remover o Tailwind", depois do harness de captura |
| O cartão "Acesso ao sistema" da ficha de Pessoas (`PessoasPage.tsx:398-444`) repete a gestão de acesso da tela Acessos. O que fazer? | Fica como demonstração até Pessoas ligar no backend (B4); então vira link para Acessos, para não haver dois lugares que concedem acesso. A decisão sobre dados de saúde (08/10) não cobre este cartão | Na ligação de Pessoas ao backend |
| Ligar a catraca de avisos das fronteiras no CI? | Sim: os avisos conhecidos ficam numa linha de base versionada e aviso novo falha o PR. A linha de base só cai; cada etapa de mover a regenera | Feito em PR próprio, depois do merge do #57, do #58 e do #59, com os imports do apoio de teste já pelo alias `@/`; o mecanismo está na seção 12.2 |
| Como a Agenda lê "Contribuições sugeridas"? | Só valores inteiros em reais, separados por vírgula, como o placeholder ("40, 60, 90"). Valor com centavos é recusado com mensagem no campo; hoje `45,50` vira 45 e 50 | PR próprio, depois da caracterização de eventos |
| As caracterizações das telas de demonstração esperam as etapas de mover de cada grupo (seção 13.7)? (10/10/2026) | Não: rodam já, em paralelo, com os testes ao lado das telas nos caminhos de hoje. Cada etapa de mover leva os testes junto com a tela | Feito no #82 a #87; dependências na seção 13.7 e destinos no anexo |
| Registro de lançamento com valor vazio ou zero: bloqueia ou grava a conferir (Documento 2, L1, contra Documento 4, F-01)? (10/10/2026) | Bloqueia o envio, com mensagem no campo (L1: valor maior que zero). Valor negativo é defeito: o Documento 4 já o veta e a tela hoje o aceita | PR próprio, depois da caracterização do fluxo de lançamentos (#82) |
| Meus registros mostra totais, conta e categoria? (10/10/2026) | Não: segue o Documento 4, F-02, sem agregação, sem conta e sem categoria. É o que separa `ler_proprios` de `ler` | PR próprio, depois da caracterização do fluxo de lançamentos (#82) |
| O "Desfazer nos próximos 2 minutos" do recibo e o "salvar como rascunho" do período fechado existem? (10/10/2026) | Não por enquanto: o texto sai das telas até haver comando no backend; fica o "registrar outro" do Documento 4, F-01 | PR próprio, depois da caracterização do fluxo de lançamentos (#82) |
| Em campo, o registro edita data, fornecedor, unidade e a chave de reembolso? (10/10/2026) | Sim, por folha, como pede o Documento 4, F-01 ("padrões todos editáveis") | PR próprio, depois da caracterização do fluxo de lançamentos (#82) |
| Aprovar selecionados e Aprovar todos de alta confiança valem para a fila inteira ou para o que o filtro mostra? Consolidam item de período fechado? (10/10/2026) | Valem só para o que o filtro mostra, e nunca consolidam item de período fechado (Documento 2, L5) | PR próprio, depois da caracterização do fluxo de lançamentos (#82) |
| Aceitar a sugestão do cupom para uma categoria já escolhida mantém ou desmarca? As sugestões aparecem em Entrada e Transferência? (10/10/2026) | Mantém, como o "Aceitar as N". As sugestões do cupom aparecem só em Saída | PR próprio, depois da caracterização do fluxo de lançamentos (#82) |
| Qual código de tela vale: o da tabela do Documento 4 ou o que as telas mostram hoje? (10/10/2026) | O da tabela do Documento 4 (seção 14, códigos de tela) | PR de texto que confere os códigos no Documento 4 |
| A reserva do fundo pode passar do fundo próprio? Valor zero ou negativo é aceito? (10/10/2026) | Não: o painel avisa e bloqueia, e o Livre não fica negativo. Valor zero ou negativo é recusado | PR próprio, depois da caracterização de financeiro I (#83) |
| As datas de pagamento, de devolução, de novo empréstimo, de despesa e de ressarcimento podem ficar vazias? (10/10/2026) | Não: a tela mostra "Informe a data" no campo e não registra | PR próprio, depois da caracterização de financeiro I (#83) |
| "Conciliada ontem" e "posição de hoje, 09:12" em Contas e fundo são texto fixo? (10/10/2026) | Não: vêm da data da última conciliação (do mock agora, do backend depois) | PR próprio, depois da caracterização de financeiro I (#83) |
| Ao voltar a um cartão em Faturas, abre a fatura a pagar ou a primeira não paga? (10/10/2026) | A primeira não paga, a mesma regra de quando troca de cartão | PR próprio, depois da caracterização de financeiro I (#83) |
| Na leitura de valor, "1.500" sem vírgula vale mil e quinhentos ou um e meio? "1e3" e "12abc" são aceitos? (10/10/2026) | Vírgula é decimal e ponto é milhar: "1.500" vale mil e quinhentos. "1e3" e "12abc" são recusados | Leitura única de valor |
| Depois de registrar uma devolução, um ressarcimento ou um pagamento, a data e a conta escolhidas continuam no formulário seguinte? (10/10/2026) | A data volta a hoje; a conta escolhida fica | PR próprio, depois da caracterização de financeiro I (#83) |
| Registrar um empréstimo com o formulário de devolução aberto fecha a devolução? (10/10/2026) | Sim: fecha a devolução e limpa o valor digitado nela | PR próprio, depois da caracterização de financeiro I (#83) |
| Com valor a ressarcir só de hoje, o resumo de Adiantamentos diz "nada pendente"? (10/10/2026) | Não: diz "o mais antigo é de hoje" | PR próprio, depois da caracterização de financeiro I (#83) |
| A gaveta "Movimento da conta" de Relatórios mostra o total líquido ou a soma bruta? O aviso "a conferir" separa entradas de saídas? (10/10/2026) | O total líquido, igual ao número clicado. O aviso separa entradas de saídas | PR próprio, depois da caracterização de financeiro II (#84) |
| O contador "Sem par" da Conciliação conta o quê? (10/10/2026) | As linhas do banco e os lançamentos sem par. As sugestões ficam fora, porque já têm par proposto | PR próprio, depois da caracterização de financeiro II (#84) |
| Ao dar linha de relatório a uma categoria, a lista respeita a natureza da categoria? (10/10/2026) | Sim, e abre sem linha escolhida, em vez de "Receita de contribuição" | PR próprio, depois da caracterização de financeiro II (#84) |
| O Fechamento bloqueia por lançamento a conferir na competência (Documento 2, P1) e por competência anterior aberta (P4), e mostra o hash (P2)? (10/10/2026) | P1 e P4 já no protótipo. O hash (P2) fica para a ligação ao backend | PR próprio, depois da caracterização de financeiro II (#84); o hash na ligação do fechamento ao backend |
| No período personalizado de Relatórios, "03/26" vale março de 2026? Um intervalo com De depois de Até avisa? (10/10/2026) | Sim aos dois: "03/26" é março de 2026, e De depois de Até mostra aviso e não soma nada | PR próprio, depois da caracterização de financeiro II (#84) |
| Na Conciliação, o motivo de ignorar escolhido numa linha vale para a próxima linha aberta, mesmo depois de Voltar? (10/10/2026) | Não: o motivo recomeça a cada linha, e Voltar descarta o escolhido | PR próprio, depois da caracterização de financeiro II (#84) |
| Devolução: o efeito no financeiro é estorno do lançamento original ou lançamento de saída (Documento 2, DV4)? (10/10/2026) | Lançamento de saída, como manda o DV4; o texto da tela muda | PR próprio, depois da caracterização de eventos (#85) |
| Estorno de competência já fechada entra no mês corrente ou segue o Documento 2, L9? Qual é a competência atual da demonstração? (10/10/2026) | Segue o L9. A competência atual da demonstração é 2026-09 | PR próprio, depois da caracterização de eventos (#85) |
| Em Contratações, o valor recebido soma no faturamento do ano e na barra do teto do MEI? (10/10/2026) | Sim, nos dois | PR próprio, depois da caracterização de eventos (#85) |
| Em Contratações, qual é a conta padrão do recebimento? (10/10/2026) | A conta padrão é personalizável e começa com Cora PJ | PR próprio, depois da caracterização de eventos (#85) |
| Na Agenda e em Leitos, quem só lê (GOV, TES) vê as ações de escrita? (10/10/2026) | Não: as ações de escrita ficam escondidas, como no padrão de permissão por ação (seção 14, padrões que atravessam telas) | PR próprio, depois da caracterização de eventos (#85) |
| As datas digitadas na Agenda, em Devoluções e em Contratações são validadas? (10/10/2026) | Sim: formato dd/mm/aaaa; data vazia ou impossível é recusada com mensagem no campo | PR próprio, depois da caracterização de eventos (#85) |
| Depois de confirmar uma devolução ou um recebimento, a conta escolhida continua? Editar a data de uma cerimônia para outro mês leva o calendário a esse mês? (10/10/2026) | Sim aos dois: a conta continua, e editar leva ao mês novo, como criar já faz | PR próprio, depois da caracterização de eventos (#85) |
| Na inscrição, quem é da equipe e dorme em quarto pago ou come na Jornada paga acomodação e refeição? (10/10/2026) | Sim: a isenção é só da contribuição, e o fechamento mostra o valor devido | PR próprio, depois da caracterização da inscrição (#86) |
| Com a contribuição em branco e acomodação ou refeição marcadas, o total mostra só "A combinar"? (10/10/2026) | Não: mostra o custo já conhecido mais o que falta, por exemplo "R$ 90,00 + a combinar" | PR próprio, depois da caracterização da inscrição (#86) |
| Na inscrição pública, o ponto de atenção de uma resposta herdada vai para o acolhimento? (10/10/2026) | Sim, junto com os das respostas novas | PR próprio, depois da caracterização da inscrição (#86) |
| O link público de inscrição atende criança? (10/10/2026) | Não: só adultos; a criança é inscrita pela casa, com responsável (Documento 2, IN2). O CPF passa a ser validado com dígito verificador, e a data de nascimento ganha formato | PR próprio, depois da caracterização da inscrição (#86) |
| A autorização do responsável vale por evento? Quem pode ser responsável? "Criança estelar" vale para qualquer idade? (10/10/2026) | A autorização vale por evento; o responsável vem de `responsavelDe`; "Criança estelar" é só para menor de idade | PR próprio, depois da caracterização da inscrição (#86) |
| As diárias, o nível e o valor passam de uma pessoa para a próxima e de um evento para o outro? (10/10/2026) | Não: as diárias recomeçam em 1 depois de trocar a pessoa, trocar o evento, salvar como pendente e confirmar; nível e valor recomeçam ao trocar de evento | PR próprio, depois da caracterização da inscrição (#86) |
| Os botões e seletores da inscrição com alvo de 44px também em campo passam a 56px? (10/10/2026) | Sim, como pede o Documento 5 (`CDD-v2_2-05-sistema-de-design.md:166`) | PR próprio, depois da caracterização da inscrição (#86) |
| O cartão do link da cerimônia segue o evento marcado? O link é um por evento? (10/10/2026) | Sim aos dois | PR próprio, depois da caracterização da inscrição (#86) |
| Inativar uma pessoa que tem acesso suspende o acesso? (10/10/2026) | Sim, pelo comando de suspensão da identidade, com aviso na confirmação | Na ligação de Pessoas ao backend (B4) |
| Quantas casas decimais tem o saldo do lote de ayahuasca? Litros com 2 casas são aceitos? (10/10/2026) | Duas casas; 0,25 é aceito | PR próprio, depois da caracterização de pessoas e estoque (#87) |
| O lote que sai da quarentena volta ao estado de antes? Dois lotes podem ter o mesmo código? (10/10/2026) | Volta ao estado de antes; o código é único por instituição | PR próprio, depois da caracterização de pessoas e estoque (#87) |
| A Anamnese terá "descartar rascunho" e a tela de impacto antes de publicar (Documento 4, P-07)? (10/10/2026) | "Descartar rascunho" entra já; a tela de impacto vem junto da B4 | PR próprio, depois da caracterização de pessoas e estoque (#87); a tela de impacto na B4 |
| Qual é o texto da comparação quando o feitio sai mais caro que comprar? (10/10/2026) | "Fazer saiu R$ 1.126,00 mais caro" (com o valor do feitio) | PR próprio, depois da caracterização de pessoas e estoque (#87) |
| Na Anamnese, o formulário de nova pergunta com texto digitado passa para o rascunho seguinte depois de publicar? (10/10/2026) | Não: o formulário fecha ao publicar | PR próprio, depois da caracterização de pessoas e estoque (#87) |

Pendência de redação no Documento 4 (`project/uploads/CDD - System/CDD-v2_2-04-mapa-de-telas.md`, não alterado): o F-01 (:242, "nenhuma validação impede o envio") tem de refletir a decisão de bloquear valor vazio ou zero, e a lista de telas que não existem (:570, "Autoinscrição em cerimônia") não conta a inscrição pública pelo link, que existe. Entra em PR próprio.

Pendência de redação: o Documento 5 ainda não lista os primitivos admitidos em pt-BR (tabela da seção 4.3, coluna "Catálogo" = não). Ele está em `project/uploads/CDD - System/CDD-v2_2-05-sistema-de-design.md` e não foi alterado; o apêndice com os primitivos em pt-BR entra em PR próprio.
