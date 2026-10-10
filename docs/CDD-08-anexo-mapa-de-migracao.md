# Sistema de Gestão — Céu do Despertar (CDD)

## Anexo do Documento 8 — Mapa de migração

> **Temporário.** Este anexo sai do repositório quando a migração terminar. Ele não é convenção: a convenção está em [CDD-08-frontend-estrutura.md](CDD-08-frontend-estrutura.md), e o anexo só descreve, arquivo a arquivo, como chegar a ela.

**Como ler**

- **Origem**: caminho antes da migração. `novo` indica criação; o texto entre parênteses diz de onde o conteúdo vem.
- **Destino**: caminho depois da migração. Quando uma origem se reparte, há uma linha por destino.
- **Ação**:
  - `mover`: `git mv` e troca de caminho de import;
  - `repartir por export`: a declaração exportada muda de arquivo, com corpo idêntico (conferido por hash);
  - `dividir`: código não exportado vira unidade, hook ou util (exige caracterização antes e captura se mexe em JSX);
  - `fundir`: duplicatas viram uma composição, uma só;
  - `manter`; `criar`.
- **Etapa**: título da etapa, na seção 13.7 do Documento 8.
- **(do #55)**: o arquivo veio do PR #55 ou foi alterado por ele. O #55 foi mesclado em 09/10/2026 (`1812df6`), e as linhas foram conferidas no head mesclado (`25722ea`).
- **(entra com o #58)** / **(entra com o #59)**: o arquivo é criado por um PR de caracterização que ainda não está na main. A linha vale depois que o PR entrar.

Os destinos são agrupados por área: `app/`, `dados/`, `lib/`, `ds/`, `testes/`, raiz de `src/`, `pages/` compartilhado e, depois, cada módulo de `pages/`.

---

## 1. `app/`

| Origem | Destino | Ação | Etapa |
|---|---|---|---|
| `app/acesso.ts` | `app/shell/acesso.ts` | mover | app/ em subpastas |
| `app/acesso.test.ts` | `app/shell/acesso.test.ts` | mover | app/ em subpastas |
| `app/clienteHttp.tsx` | `app/providers/ClienteHttpProvider/ClienteHttpProvider.tsx` (+ `index.ts` da unidade e `app/providers/index.ts`) | mover (renome, seção 2 do Documento 8) | app/ em subpastas |
| `app/demonstracao.ts` | `app/demonstracao/demonstracao.ts` | mover | app/ em subpastas |
| `app/demonstracao.test.ts` | `app/demonstracao/demonstracao.test.ts` | mover | app/ em subpastas |
| `app/destino.ts` | `app/rotas/destino.ts` | mover | app/ em subpastas |
| `app/destino.dom.test.ts` | `app/rotas/destino.dom.test.ts` | mover | app/ em subpastas |
| `app/estadoDaSessao.ts` | `app/sessao/estadoDaSessao.ts` | mover | app/ em subpastas |
| `app/estadoDaSessao.test.ts` | `app/sessao/estadoDaSessao.test.ts` | mover | app/ em subpastas |
| `app/Layout.tsx` | `app/shell/Layout/Layout.tsx` (+ `index.ts`; composição de app, fora da escala atômica) | mover | app/ em subpastas |
| `app/Layout.dom.test.tsx` | `app/shell/Layout/Layout.dom.test.tsx` | mover | app/ em subpastas |
| `app/navegacao.ts`: `Rota`, `ROTAS`, `RotaId`, `ROTAS_PUBLICAS`, `ROTAS_ANTIGAS_DA_ENTRADA` | `app/rotas/rotas.ts` | repartir por export | app/ em subpastas |
| `app/navegacao.ts`: `construirNav` | `app/shell/menu.ts` | repartir por export | app/ em subpastas |
| `app/navegacao.ts`: `POR_CAMINHO`, `rotaAtiva` | `app/shell/rotaAtiva.ts` | repartir por export | app/ em subpastas |
| `app/navegacao.test.ts` (testa só `rotaAtiva`) | `app/shell/rotaAtiva.test.ts` | mover | app/ em subpastas |
| `app/rotasAntigasDaEntrada.tsx` | `app/rotas/rotasAntigasDaEntrada.tsx` | mover | app/ em subpastas |
| `app/router.tsx` | `app/router.tsx` | manter (só linhas de import mudam a cada etapa que move uma página, e em app/ em subpastas; ao fim importa só o `index.ts` de cada página) | app/ em subpastas |
| `app/router.dom.test.tsx` | `app/router.dom.test.tsx` | manter | app/ em subpastas |
| `app/sessao.tsx`: `CHAVE_DO_EU`, `Sessao`, `SessaoProviderProps`, `Contexto`, `SessaoProvider`, `useSessao` (`useSessao` fica com o contexto privado) | `app/sessao/SessaoProvider/SessaoProvider.tsx` (+ `index.ts`) | repartir por export | app/ em subpastas |
| `app/sessao.tsx`: `ExigeSessao` | `app/sessao/ExigeSessao/ExigeSessao.tsx` (+ `index.ts`) | repartir por export | app/ em subpastas |
| `app/sessao.tsx`: `derivarEstado` (sai na divisão) | `app/sessao/utils/derivarEstado.ts` (+ teste) | dividir | Dividir app/shell, sessão e ds |
| `app/sessao.tsx`: `useExisteUsuarioOidc` (sai na divisão) | `app/sessao/hooks/useExisteUsuarioOidc.ts` | dividir | Dividir app/shell, sessão e ds |
| `app/sessao.test.tsx` (describe da linha 44) | `app/sessao/SessaoProvider/SessaoProvider.dom.test.tsx` | repartir por export (por describe) | app/ em subpastas |
| `app/sessao.test.tsx` (linha 220) | `app/sessao/ExigeSessao/ExigeSessao.dom.test.tsx` | repartir por export (por describe) | app/ em subpastas |
| `app/sessao.test.tsx` (linha 393) | `app/rotas/rotasAntigasDaEntrada.dom.test.tsx` | repartir por export (por describe) | app/ em subpastas |
| `app/sessao.test.tsx` (linha 276, testes de entrada) | `pages/transversal/entrada/EntrarPage/EntrarPage.dom.test.tsx` | repartir por export (por describe) | Mover transversal |
| `app/sessao.test.tsx` (linha 366, testes de entrada) | `pages/transversal/entrada/RetornoPage/RetornoPage.dom.test.tsx` | repartir por export (por describe) | Mover transversal |
| `app/sessao.test.tsx` (`Sonda`, linha 30; privada, só os testes do `SessaoProvider` a usam) | `app/sessao/SessaoProvider/SessaoProvider.dom.test.tsx` | mover | app/ em subpastas |
| `app/sessao.test.tsx` (`ler`, linha 42; privado) | `testes/sessaoDeTeste.tsx` (os testes que o usam se repartem entre `app/sessao` e `pages/transversal/entrada`; ancestral comum: `src/`). `ler` passa a receber a tela por parâmetro, porque hoje lê a variável `tela` do arquivo | repartir por export (`ler` muda de assinatura, só em apoio de teste) | testes/ global e setupFiles |
| `app/sessaoDeDemonstracao.ts` | `app/demonstracao/sessaoDeDemonstracao.ts` | mover | app/ em subpastas |
| `app/telas.ts` | `app/shell/telas.ts` | mover | app/ em subpastas |
| `app/telas.test.ts` | `app/shell/telas.test.ts` | mover | app/ em subpastas |
| `app/Layout.tsx` (estado sem acesso) | `app/shell/components/TelaSemAcesso/` | dividir | Dividir app/shell, sessão e ds |
| `app/Layout.tsx` (nome da tela) | `app/shell/utils/nomeDaTela.ts` (+ teste) | dividir | Dividir app/shell, sessão e ds |
| `app/Layout.tsx` (contagem da fila de demonstração) | `app/shell/hooks/useContagemDoLote.ts` | dividir | Dividir app/shell, sessão e ds |
| `ds/FaixaDeDemonstracao.tsx` (fica em `ds/`, sem nivelar, em Mover ds em níveis; sai do barrel do `ds` aqui) | `app/demonstracao/FaixaDeDemonstracao/FaixaDeDemonstracao.tsx` (+ `index.ts`) | mover | app/ em subpastas |
| `ds/FaixaDeDemonstracao.dom.test.tsx` (entra com o #59) | `app/demonstracao/FaixaDeDemonstracao/FaixaDeDemonstracao.dom.test.tsx` | mover | app/ em subpastas |

---

## 2. `dados/`

| Origem | Destino | Ação | Etapa |
|---|---|---|---|
| `dados/index.ts` (barrel sem efeito colateral) | `dados/index.ts` | repartir por export | dados/ sem efeito e sem ciclo |
| `dados/index.ts`: `gerenciadorOidc`, `credencial`, `servicoDeEntrada`, `clienteHttp`, `consulta`, `comando` | `dados/instancias.ts` (importado só por `main.tsx`) | repartir por export | dados/ sem efeito e sem ciclo |
| `dados/clienteDeConsultas.ts`: `JANELA_DE_FRESCOR_EM_MS` (o #55 a importa do arquivo, fora do barrel; o barrel passa a reexportá-la, na mesma etapa que cria `testes/sessaoDeTeste.tsx`) | `dados/index.ts` | manter | testes/ global e setupFiles |
| `dados/oidc.ts`: `CAMINHO_DA_ENTRADA`, `CAMINHO_DE_RETORNO`, `CAMINHO_DA_RENOVACAO_SILENCIOSA`, `ESPERA_DA_RENOVACAO_SILENCIOSA_EM_SEGUNDOS`, `ESCOPO_OIDC` (quebra o ciclo `oidc.ts` ↔ `credencialOidc.ts`) | `dados/caminhosOidc.ts` | repartir por export | dados/ sem efeito e sem ciclo |
| `dados/oidc.ts` (restante) | `dados/oidc.ts` | manter | dados/ sem efeito e sem ciclo |
| `dados/oidc.dom.test.ts` | `dados/oidc.dom.test.ts` | manter | dados/ sem efeito e sem ciclo |
| `dados/credencialOidc.ts` (passa a importar `ESPERA_DA_RENOVACAO_SILENCIOSA_EM_SEGUNDOS` de `caminhosOidc.ts`) | `dados/credencialOidc.ts` | manter | dados/ sem efeito e sem ciclo |
| `dados/credencialOidc.test.ts` | `dados/credencialOidc.test.ts` | manter | dados/ sem efeito e sem ciclo |
| `dados/credencial.ts` | `dados/credencial.ts` | manter | dados/ sem efeito e sem ciclo |
| `dados/clienteHttp.ts` | `dados/clienteHttp.ts` | manter | dados/ sem efeito e sem ciclo |
| `dados/clienteHttp.test.ts` | `dados/clienteHttp.test.ts` | manter | dados/ sem efeito e sem ciclo |
| `dados/clienteDeConsultas.ts` | `dados/clienteDeConsultas.ts` | manter | dados/ sem efeito e sem ciclo |
| `dados/clienteDeConsultas.test.ts` (fábrica `erroDaApi` passa a vir de `testes/fabricas.ts`) | `dados/clienteDeConsultas.test.ts` | manter | testes/ global e setupFiles |
| `dados/consultaEComando.ts` | `dados/consultaEComando.ts` | manter | dados/ sem efeito e sem ciclo |
| `dados/consultaEComando.test.ts` | `dados/consultaEComando.test.ts` | manter | dados/ sem efeito e sem ciclo |
| `dados/erros.ts` | `dados/erros.ts` | manter | dados/ sem efeito e sem ciclo |
| `dados/erros.test.ts` (novo, para `erroDaResposta`) | `dados/erros.test.ts` | criar | dados/ sem efeito e sem ciclo |
| `dados/apoioDeTeste.ts` (consumidores: `clienteHttp.test.ts`, `consultaEComando.test.ts` e `credencialOidc.test.ts`) | `dados/apoioDeTeste.ts` | manter | dados/ sem efeito e sem ciclo |

---

## 3. `lib/`

| Origem | Destino | Ação | Etapa |
|---|---|---|---|
| `lib/formato.ts`: `BRL`, `formatarValor`, `iniciais` | `lib/formato.ts` | manter (repartir por export) | lib/formato por export |
| `lib/formato.ts`: `formatarDataHora` (com `FUSO_DA_CASA` e `DATA_E_HORA`) | permanece em `lib/formato.ts` até a etapa de mover sistema; depois, ver seção 12 | manter | lib/formato por export |
| `lib/formato.test.ts`: describes de `formatarValor`, `paraData`, `diaDaSemana` e o fuso, exceto o `it` de `formatarData` (seção 4.4) | `lib/formato.test.ts` | manter | lib/formato por export |
| `lib/formato.ts`: `nomeDoMes` | ver seção 9 (`AgendaPage/utils/nomeDoMes.ts`) | repartir por export | lib/formato por export |
| `PainelDeRevisao.tsx#paraNumero`, `GerenciarContasModal.tsx#paraNumero` | `lib/numero.ts` (`lerValorDigitado`) | fundir | Leitura única de valor |
| `AyahuascaPage.tsx#paraNumero` (mudança de comportamento: passa a tirar o milhar; divergência 2) | `lib/numero.ts` (`lerValorDigitado`) | fundir | Leitura única de valor |
| `useFormularioDeLancamento.ts#somar` (mudança de comportamento: tira o milhar igual nos dois lugares) | `lib/numero.ts` (`lerSoma`) | fundir | Leitura única de valor |
| novo (testes de milhar, vírgula, soma e vazio) | `lib/numero.test.ts` | criar | Leitura única de valor |

### 3.1 Arquivos com parse de valor (Leitura única de valor)

| Arquivo (linhas) | Parse hoje | Seção 14 do Documento 8 | Destino |
|---|---|---|---|
| `ds/AmountInput.tsx:26` | soma sem tirar o milhar | corrige a divergência 1 | `lerSoma` |
| `pages/lancamento/useFormularioDeLancamento.ts:78` | soma com o milhar tirado (referência) | lado correto da divergência 1 | `lerSoma` |
| `pages/verificacao/PainelDeRevisao.tsx:36` | tira o milhar | recusa `1e3` e `12abc` (decisão da seção 15) | `lerValorDigitado` |
| `pages/ayahuasca/AyahuascaPage.tsx:47` | não tira o milhar: `1.500,00` vira 1,5 | corrige a divergência 2 (mesma causa) | `lerValorDigitado` |
| `pages/contas/GerenciarContasModal.tsx:40` | tira o milhar | recusa `1e3` e `12abc` (decisão da seção 15) | `lerValorDigitado` |
| `pages/emprestimos/EmprestimosPage.tsx:50` e `:96` | `Number` sem tirar o milhar: NaN | corrige a divergência 2 | `lerValorDigitado` |
| `pages/adiantamentos/AdiantamentosPage.tsx:502` | `Number` sem tirar o milhar: NaN | corrige a divergência 2 | `lerValorDigitado` |
| `pages/eventos/InscricaoPage.tsx:120` e `:703` | tira o milhar | recusa `1e3` e `12abc` (decisão da seção 15) | `lerValorDigitado` |
| `pages/publico/InscricaoPublicaPage.tsx:126` e `:708` | tira o milhar | recusa `1e3` e `12abc` (decisão da seção 15) | `lerValorDigitado` |
| `pages/estoque/FeitioPage.tsx:48` e `:398` | `Number` sem tirar o milhar: vira 0 | corrige a divergência 2 (mesma causa) | `lerValorDigitado` |
| `pages/agenda/AgendaPage.tsx:66` (litros) e `:53` (contribuições) | `:66` não tira o milhar: vira 1,5; `:53` separa a lista por vírgula | `:66` corrige a divergência 2 (mesma causa); `:53` fora da divergência | `:66` `lerValorDigitado`; `:53` fora desta etapa (Documento 8, seção 15: só inteiros) |

- Os cinco que já tiram o milhar mantêm o valor das entradas válidas e passam a recusar notação científica e texto depois do número (`1e3`, `12abc`), pela decisão da seção 15 do Documento 8 (`fundir`).
- `AgendaPage.tsx:53` separa a lista de contribuições por vírgula, que também é o separador decimal. `lerValorDigitado` não serve a esse campo. Decisão do dono: só valores inteiros, com o valor com centavos recusado (Documento 8, seções 14 e 15), em PR próprio depois da caracterização de eventos.

---

## 4. `ds/`

### 4.1 Fundação, provedores e moves do design system

| Origem | Destino | Ação | Etapa |
|---|---|---|---|
| `ds/ActionBar.tsx` | `ds/molecules/ActionBar/ActionBar.tsx` | mover | Mover ds em níveis |
| `ds/AmountDisplay.tsx` | `ds/atoms/AmountDisplay/AmountDisplay.tsx` | mover | Mover ds em níveis |
| `ds/AmountInput.tsx` | `ds/molecules/AmountInput/AmountInput.tsx` | mover | Mover ds em níveis |
| `ds/AttachmentCapture.tsx` | `ds/molecules/AttachmentCapture/AttachmentCapture.tsx` | mover | Mover ds em níveis |
| `ds/ConfirmAction.tsx` | `ds/molecules/ConfirmAction/ConfirmAction.tsx` | mover | Mover ds em níveis |
| `ds/DataTable.tsx` | `ds/organisms/DataTable/DataTable.tsx` | mover | Mover ds em níveis |
| `ds/DefaultField.tsx` | `ds/molecules/DefaultField/DefaultField.tsx` | mover | Mover ds em níveis |
| `ds/Icon.tsx` | `ds/atoms/Icon/Icon.tsx` | mover | Mover ds em níveis |
| `ds/PendencyCard.tsx` | `ds/organisms/PendencyCard/PendencyCard.tsx` | mover | Mover ds em níveis |
| `ds/PeriodLock.tsx` | `ds/molecules/PeriodLock/PeriodLock.tsx` | mover | Mover ds em níveis |
| `ds/Receipt.tsx` | `ds/organisms/Receipt/Receipt.tsx` | mover | Mover ds em níveis |
| `ds/RecordRow.tsx` | `ds/molecules/RecordRow/RecordRow.tsx` | mover | Mover ds em níveis |
| `ds/ScreenHeader.tsx` | `ds/molecules/ScreenHeader/ScreenHeader.tsx` (o #55 alterou o arquivo) | mover (do #55) | Mover ds em níveis |
| `ds/StatusBadge.tsx` | `ds/atoms/StatusBadge/StatusBadge.tsx` | mover | Mover ds em níveis |
| `ds/SuggestionChip.tsx` | `ds/molecules/SuggestionChip/SuggestionChip.tsx` | mover | Mover ds em níveis |
| `ds/TextField.tsx` | `ds/molecules/TextField/TextField.tsx` (o #55 alterou o arquivo) | mover (do #55) | Mover ds em níveis |
| `ds/TwoAxisGuard.tsx` | `ds/molecules/TwoAxisGuard/TwoAxisGuard.tsx` | mover | Mover ds em níveis |
| `ds/AppShell.tsx` (`NavItem` e as regiões viram `components/` na divisão) | `ds/templates/AppShell/AppShell.tsx` | mover | Mover ds em níveis |
| `ds/BottomSheet.tsx`: `BottomSheet` (o #55 alterou o arquivo) | `ds/organisms/BottomSheet/BottomSheet.tsx` | repartir por export (do #55) | Mover ds em níveis |
| `ds/BottomSheet.tsx`: `SheetOption` (molécula não importa organismo) | `ds/fundacao/opcao.ts` | repartir por export | Mover ds em níveis |
| `ds/Button.tsx`: `Button` | `ds/atoms/Button/Button.tsx` | repartir por export | Mover ds em níveis |
| `ds/Button.tsx`: `Density` (base de todos os níveis e de `useDensidade`) | `ds/fundacao/densidade.ts` | repartir por export | Mover ds em níveis |
| `ds/estados.tsx`: `DomainError` | `ds/molecules/DomainError/` | repartir por export | Mover ds em níveis |
| `ds/estados.tsx`: `FlowerOfLife` | `ds/atoms/FlowerOfLife/` | repartir por export | Mover ds em níveis |
| `ds/estados.tsx`: `EmptyState`, `EmptyStateProps` | `ds/molecules/EmptyState/` | repartir por export | Mover ds em níveis |
| `ds/estados.tsx`: `InfraError` | `ds/molecules/InfraError/` | repartir por export | Mover ds em níveis |
| `ds/estados.tsx`: `PermissionDenied` | `ds/molecules/PermissionDenied/` | repartir por export | Mover ds em níveis |
| `ds/estados.tsx`: `SkeletonList` com `Bar`, `LARGURAS`, `LARGURAS_META` e o `<style>` do keyframe (o keyframe fica dentro do `SkeletonList`) | `ds/molecules/SkeletonList/` | repartir por export | Mover ds em níveis |
| `ds/RegimeVocabulary.tsx` (catálogo sem consumidor, mantido) | `ds/providers/RegimeVocabulary/RegimeVocabulary.tsx` | mover | Mover ds em níveis |
| `ds/index.ts` (mesma API pública; reexporta os caminhos novos) (do #55) | `ds/index.ts` | manter | Mover ds em níveis |
| `ds/index.ts` (ganha `useDensidade`) | `ds/index.ts` | manter | Mover fundação do ds |
| `ds/index.ts` (ganha os primitivos promovidos) | `ds/index.ts` | manter | Primitivos para o ds |
| `ds/index.ts` (ganha `Portao`) | `ds/index.ts` | manter | Portao no ds |
| `ds/index.ts` (perde `FaixaDeDemonstracao`) | `ds/index.ts` | manter | app/ em subpastas |
| `ds/PainelDeAcao.tsx` (PR #55) | `ds/organisms/PainelDeAcao/PainelDeAcao.tsx` | mover (do #55) | Mover ds em níveis |
| `ds/PainelDeAcao.dom.test.tsx` (PR #55) | `ds/organisms/PainelDeAcao/PainelDeAcao.dom.test.tsx` | mover (do #55) | Mover ds em níveis |
| `ds/TextField.dom.test.tsx` (do #55) | `ds/molecules/TextField/TextField.dom.test.tsx` | mover (do #55) | Mover ds em níveis |
| `lib/useDensidade.ts` | `ds/fundacao/useDensidade.ts` | mover | Mover fundação do ds |
| novo (teste do hook; `lib/` não tem teste dele hoje) | `ds/fundacao/useDensidade.dom.test.ts` | não criado: etapa de mover não ganha teste; a troca de densidade já é exercitada pelo teste do registro de lançamento | Mover fundação do ds |
| `styles/marca.css` | `ds/fundacao/marca.css` | mover | Mover fundação do ds |
| `styles/tokens/base.css` | `ds/fundacao/tokens/base.css` | mover | Mover fundação do ds |
| `styles/tokens/colors.css` (o #55 alterou o arquivo) | `ds/fundacao/tokens/colors.css` | mover (do #55) | Mover fundação do ds |
| `styles/tokens/fonts.css` | `ds/fundacao/tokens/fonts.css` | mover | Mover fundação do ds |
| `styles/tokens/spacing.css` | `ds/fundacao/tokens/spacing.css` | mover | Mover fundação do ds |
| `styles/tokens/typography.css` | `ds/fundacao/tokens/typography.css` | mover | Mover fundação do ds |
| `pages/entrada/Portao.tsx` (sem a prop `volta`, que sai antes) | `ds/templates/Portao/Portao.tsx` | mover | Portao no ds |

### 4.2 Primitivos promovidos e divisões de primitivos

| Origem | Destino | Ação | Etapa |
|---|---|---|---|
| `components/Avatar.tsx` | `ds/atoms/Avatar/Avatar.tsx` | mover | Primitivos para o ds |
| `components/Blocos.tsx`: `rotuloCaixaAlta` | `ds/fundacao/estilos.ts` | repartir por export | Primitivos para o ds |
| `components/Blocos.tsx`: `Rotulo` | `ds/atoms/Rotulo/` | repartir por export | Primitivos para o ds |
| `components/Blocos.tsx`: `Cartao` | `ds/atoms/Cartao/` | repartir por export | Primitivos para o ds |
| `components/Blocos.tsx`: `BarraDeProporcao` | `ds/atoms/BarraDeProporcao/` | repartir por export | Primitivos para o ds |
| `components/Blocos.tsx`: `Th`, `Td` (átomos até a adoção do `DataTable`) | `ds/atoms/Th/`, `ds/atoms/Td/` | repartir por export | Primitivos para o ds |
| `components/Blocos.tsx`: `Numero`, `NumeroProps` | `ds/molecules/Numero/` | repartir por export | Primitivos para o ds |
| `components/Blocos.tsx`: `Recado` (absorvido por `Aviso` na etapa de primitivos novos) | `ds/molecules/Recado/` | repartir por export | Primitivos para o ds |
| `components/Campo.tsx`: `rotulo`, `RotuloDeCampo` (exportado pelo barrel: o `CampoDeTags` o usa) | `ds/atoms/RotuloDeCampo/` | repartir por export | Primitivos para o ds |
| `components/Campo.tsx`: `Interruptor` | `ds/atoms/Interruptor/` | repartir por export | Primitivos para o ds |
| `components/Campo.tsx`: `Select`, `SelectProps` | `ds/molecules/Select/` | repartir por export | Primitivos para o ds |
| `components/Campo.tsx`: `SeletorDeTipo`, `SeletorDeTipoProps` | `ds/molecules/SeletorDeTipo/` | repartir por export | Primitivos para o ds |
| `components/Campo.tsx`: `CampoDeTags`, `CampoDeTagsProps` (ficam no arquivo até a etapa de mover lancamentos) | ver seção 8 (`RegistrarLancamentoPage/components/CampoDeTags/`) | repartir por export | Primitivos para o ds |
| `lib/formato.ts`: `iniciais` (fica em `lib/formato` até o `MeuPerfilPage` usar o `Avatar`) | `ds/atoms/Avatar/utils/iniciais.ts` (+ teste) | mover | Primitivos novos e adoção do catálogo |
| `pages/lancamento/RegistrarLancamentoPage.tsx#rotuloLabel`; 12 constantes `rotuloLabel` das páginas; cópias inline do estilo de rótulo | `ds/atoms/Rotulo/` e `ds/fundacao/estilos.ts` (`rotuloCaixaAlta`) | fundir | Rotulo e CorpoDaTela |
| `components/Blocos.tsx#Th`, `Td` (internos do `DataTable` na adoção) | `ds/organisms/DataTable/` | fundir | Primitivos novos e adoção do catálogo |
| novo (`Marca` do `Portao`, wordmark do `AppShell`, moldura da inscrição pública) | `ds/atoms/Marca/` | fundir | Primitivos novos e adoção do catálogo |
| novo (`Recado` de `Blocos`, `entrada/Aviso`, `AvisoDeAtencao` do #55 (do #55), callouts das telas) | `ds/molecules/Aviso/` | fundir | Primitivos novos e adoção do catálogo |
| novo (`Leitura` de Meu perfil, Ayahuasca, Pessoas, Contratações e Devoluções) | `ds/molecules/Leitura/` | fundir | Primitivos novos e adoção do catálogo |
| novo (listas com divisória em Devoluções, Leitos e Feitio) | `ds/molecules/ListaDividida/` | criar | Primitivos novos e adoção do catálogo |
| novo (botões só de ícone em formulários, revisão, contas, registros, paginação, captura de anexo, sugestões e `TextField`) | `ds/atoms/BotaoDeIcone/` | criar | Primitivos novos e adoção do catálogo |
| novo (`GerenciarContasModal`, modal da Ayahuasca, `FormularioDeTrabalho`) | variante central do `PainelDeAcao`; `ds/organisms/Modal/` só se o protótipo não couber | criar | Primitivos novos e adoção do catálogo |
| novo (padding por densidade repetido nas telas) | `ds/templates/CorpoDaTela/` | criar | Rotulo e CorpoDaTela |
| `ds/AppShell.tsx`: `NavLink`, `NavSection`, `NavEntry`, `isSection` | `ds/templates/AppShell/navegacao.ts` | repartir por export | Dividir app/shell, sessão e ds |
| `ds/AppShell.tsx`: `NavItem`, rail, chip do usuário, barra de contexto, navegação inferior (`ItemDaBarra`, `BotaoDoMenu`), menu de campo (`MenuDeCampo`, `GrupoNoMenu`, `PerfilNoMenu`), `SeloDoUsuario`, `SeloDeContagem` e `RotuloDeSecao` (do #67) | `ds/templates/AppShell/components/{NavItem, RailDeNavegacao, ChipDoUsuario, BarraDeContexto, NavInferior, MenuDeCampo, SeloDoUsuario, SeloDeContagem, RotuloDeSecao}/`; `SeloDoUsuario` some na adoção do `Avatar` | dividir | Dividir app/shell, sessão e ds |
| `ds/AppShell.tsx`: `useMenuDeCampo`, `useDestinoDoFocoDeReserva` e `agruparForaDaBarra` (do #67) | `ds/templates/AppShell/hooks/` e `ds/templates/AppShell/utils/agruparForaDaBarra.ts` | dividir | Dividir app/shell, sessão e ds |
| `ds/Button.tsx`: `VARIANTS`, `HOVER` | `ds/atoms/Button/constantes.ts` | dividir | Dividir app/shell, sessão e ds |
| `ds/Icon.tsx`: `REGISTRY` | `ds/atoms/Icon/registro.ts` | dividir | Dividir app/shell, sessão e ds |
| `ds/StatusBadge.tsx`: `TONES` (só as cores `bg` e `fg` desde o #72) | `ds/atoms/StatusBadge/constantes.ts` | dividir | Dividir app/shell, sessão e ds |
| `ds/RegimeVocabulary.tsx`: `VOCAB`, `useTermo` | `ds/providers/RegimeVocabulary/{constantes.ts, useTermo.ts}` | dividir | Dividir app/shell, sessão e ds |
| `ds/estados.tsx`: `Bar` | `ds/molecules/SkeletonList/components/BarraDeEsqueleto/` | dividir | Dividir app/shell, sessão e ds |
| novo (`CorpoDaTela` aplicado nas 29 telas e em `TelaSemAcesso`) | `ds/templates/CorpoDaTela/` | criar | Rotulo e CorpoDaTela |

### 4.3 Adoções do catálogo

Cada adoção que muda o JSX passa pela captura de telas (seção 13.6 do Documento 8). A adoção do `Avatar` no `AppShell` depende da divergência de iniciais (seção 14 do Documento 8).

| Origem | Destino | Ação | Etapa |
|---|---|---|---|
| `pages/fechamento/FechamentoPage.tsx`: bloqueio do período e confirmação de reabertura (`confirmarReabertura`), re-implementados. Na adoção, o placeholder do motivo (`:386`) não tem prop no `PeriodLock`, e o `PeriodLock` não tem estado de envio | `ds/molecules/PeriodLock/` e `ds/molecules/ConfirmAction/` | fundir | Primitivos novos e adoção do catálogo |
| valores em centavos exibidos nas telas (`formatarBRL` e `formatarDinheiro` no JSX; nenhuma página usa `AmountDisplay` hoje) | `ds/atoms/AmountDisplay/` | fundir | Primitivos novos e adoção do catálogo |
| gavetas de detalhe: `GavetaDeDetalhe` (`LancamentosPage`), `PainelDeRevisao` (`VerificacaoLotePage`), `PainelDeQuebra` (`RelatoriosPage`), `ModalDeMovimento` (`AyahuascaPage`) | `ds/organisms/PainelDeAcao/` (do #55) | fundir | Primitivos novos e adoção do catálogo |
| avatar com iniciais: `pages/perfil/MeuPerfilPage.tsx` (`iniciais`) e `ds/AppShell.tsx` (`slice(0, 2)`) | `ds/atoms/Avatar/` | fundir | Primitivos novos e adoção do catálogo |
| `Cartao` locais: `pages/relatorios/RelatoriosPage.tsx`, `pages/pessoas/PessoasPage.tsx`, `pages/pessoas/AnamnesePage.tsx`, `pages/perfil/MeuPerfilPage.tsx` | `ds/atoms/Cartao/` | fundir | Primitivos novos e adoção do catálogo |
| `Numero` locais: `pages/relatorios/RelatoriosPage.tsx` e `pages/agenda/DetalheDoTrabalho.tsx` | `ds/molecules/Numero/` | fundir | Primitivos novos e adoção do catálogo |
| tabelas com `Th` e `Td`: `pages/emprestimos/EmprestimosPage.tsx`, `pages/faturas/FaturasPage.tsx`, `pages/parametros/ParametrosPage.tsx` | `ds/organisms/DataTable/` | fundir | Primitivos novos e adoção do catálogo |

### 4.4 Testes que entram com os PRs de caracterização

Os testes do #58, do #59, do #61 e do #62 se repartem por describe entre as unidades de destino. O arquivo de origem some quando o último describe sai.

| Origem | Destino | Ação | Etapa |
|---|---|---|---|
| `components/Avatar.dom.test.tsx` (entra com o #58) | `ds/atoms/Avatar/Avatar.dom.test.tsx` | mover | Primitivos para o ds |
| `components/Blocos.dom.test.tsx` (entra com o #58), describe `rotuloCaixaAlta` (teste puro) | `ds/fundacao/estilos.test.ts` | repartir por describe | Primitivos para o ds |
| `components/Blocos.dom.test.tsx`, describe `Rotulo` | `ds/atoms/Rotulo/Rotulo.dom.test.tsx` | repartir por describe | Primitivos para o ds |
| `components/Blocos.dom.test.tsx`, describe `Numero` | `ds/molecules/Numero/Numero.dom.test.tsx` | repartir por describe | Primitivos para o ds |
| `components/Blocos.dom.test.tsx`, describes `Th` e `Td` | `ds/atoms/Th/Th.dom.test.tsx` e `ds/atoms/Td/Td.dom.test.tsx` | repartir por describe | Primitivos para o ds |
| `components/Blocos.dom.test.tsx`, describes `Recado`, `Cartao` e `BarraDeProporcao` | `ds/molecules/Recado/`, `ds/atoms/Cartao/` e `ds/atoms/BarraDeProporcao/` (`.dom.test.tsx`) | repartir por describe | Primitivos para o ds |
| `components/Campo.dom.test.tsx` (entra com o #58), describes `RotuloDeCampo`, `Select`, `SeletorDeTipo` e `Interruptor` | `ds/atoms/RotuloDeCampo/`, `ds/molecules/Select/`, `ds/molecules/SeletorDeTipo/` e `ds/atoms/Interruptor/` (`.dom.test.tsx`) | repartir por describe | Primitivos para o ds |
| `components/Campo.dom.test.tsx`, describe `CampoDeTags` | `pages/financeiro/lancamentos/RegistrarLancamentoPage/components/CampoDeTags/CampoDeTags.dom.test.tsx` | mover (o arquivo só tinha esse describe desde Primitivos para o ds) | Mover lancamentos |
| `lib/recibo.test.ts` (entra com o #58) | `pages/financeiro/lancamentos/utils/recibo.test.ts` | mover | Mover lancamentos |
| `lib/formato.test.ts` (entra com o #58), describe `iniciais` | `ds/atoms/Avatar/utils/iniciais.test.ts` | repartir por describe | Primitivos novos e adoção do catálogo |
| `lib/formato.test.ts`, describes `formatarDinheiro`, `formatarBRL`, `formatarInteiro`, `formatarLitros`, `formatarDiaMes`, `formatarCompetencia`, `competenciaPorExtenso`, `pluralizar` e o `it` de `formatarData` no describe de fuso | `pages/utils/formato.test.ts` | repartir por describe (e por `it`, no fuso) | lib/formato por export |
| `lib/formato.test.ts`, describes `formatarData` e `nomeDoMes` | `pages/utils/formato.test.ts` (`formatarData`) e `pages/eventos/AgendaPage/utils/nomeDoMes.test.ts` | repartir por describe | lib/formato por export |
| `ds/AmountDisplay.dom.test.tsx` (entra com o #59) | `ds/atoms/AmountDisplay/AmountDisplay.dom.test.tsx` | mover | Mover ds em níveis |
| `ds/AmountInput.dom.test.tsx` (entra com o #59); a describe de soma caracteriza a divergência 1 | `ds/molecules/AmountInput/AmountInput.dom.test.tsx` | mover | Mover ds em níveis |
| `ds/Button.dom.test.tsx` (entra com o #59); a describe `{...rest}` caracteriza a divergência da seção 14 do Documento 8 | `ds/atoms/Button/Button.dom.test.tsx` | mover | Mover ds em níveis |
| `ds/Icon.dom.test.tsx` (entra com o #59) | `ds/atoms/Icon/Icon.dom.test.tsx` | mover | Mover ds em níveis |
| `ds/Receipt.dom.test.tsx` (entra com o #59) | `ds/organisms/Receipt/Receipt.dom.test.tsx` | mover | Mover ds em níveis |
| `ds/RecordRow.dom.test.tsx` (entra com o #59) | `ds/molecules/RecordRow/RecordRow.dom.test.tsx` | mover | Mover ds em níveis |
| `ds/StatusBadge.dom.test.tsx` (entra com o #59) | `ds/atoms/StatusBadge/StatusBadge.dom.test.tsx` | mover | Mover ds em níveis |
| `ds/estados.dom.test.tsx` (entra com o #59), describes `DomainError`, `EmptyState`, `InfraError`, `PermissionDenied` e `SkeletonList` | `ds/molecules/<Nome>/<Nome>.dom.test.tsx` | repartir por describe | Mover ds em níveis |
| `ds/estados.dom.test.tsx`, describe `FlowerOfLife` | `ds/atoms/FlowerOfLife/FlowerOfLife.dom.test.tsx` | repartir por describe | Mover ds em níveis |
| `ds/ActionBar.dom.test.tsx` (entra com o #61) | `ds/molecules/ActionBar/ActionBar.dom.test.tsx` | mover | Mover ds em níveis |
| `ds/AttachmentCapture.dom.test.tsx` (entra com o #61) | `ds/molecules/AttachmentCapture/AttachmentCapture.dom.test.tsx` | mover | Mover ds em níveis |
| `ds/BottomSheet.dom.test.tsx` (entra com o #61) | `ds/organisms/BottomSheet/BottomSheet.dom.test.tsx` | mover | Mover ds em níveis |
| `ds/DataTable.dom.test.tsx` (entra com o #61) | `ds/organisms/DataTable/DataTable.dom.test.tsx` | mover | Mover ds em níveis |
| `ds/DefaultField.dom.test.tsx` (entra com o #61) | `ds/molecules/DefaultField/DefaultField.dom.test.tsx` | mover | Mover ds em níveis |
| `ds/ScreenHeader.dom.test.tsx` (entra com o #61) | `ds/molecules/ScreenHeader/ScreenHeader.dom.test.tsx` | mover | Mover ds em níveis |
| `ds/SuggestionChip.dom.test.tsx` (entra com o #61) | `ds/molecules/SuggestionChip/SuggestionChip.dom.test.tsx` | mover | Mover ds em níveis |
| `ds/AppShell.dom.test.tsx` (entra com o #61) | `ds/templates/AppShell/AppShell.dom.test.tsx` | mover | Mover ds em níveis |
| `ds/ConfirmAction.dom.test.tsx` (entra com o #62) | `ds/molecules/ConfirmAction/ConfirmAction.dom.test.tsx` | mover | Mover ds em níveis |
| `ds/PendencyCard.dom.test.tsx` (entra com o #62) | `ds/organisms/PendencyCard/PendencyCard.dom.test.tsx` | mover | Mover ds em níveis |
| `ds/PeriodLock.dom.test.tsx` (entra com o #62) | `ds/molecules/PeriodLock/PeriodLock.dom.test.tsx` | mover | Mover ds em níveis |
| `ds/RegimeVocabulary.dom.test.tsx` (entra com o #62) | `ds/providers/RegimeVocabulary/RegimeVocabulary.dom.test.tsx` | mover | Mover ds em níveis |
| `ds/TwoAxisGuard.dom.test.tsx` (entra com o #62) | `ds/molecules/TwoAxisGuard/TwoAxisGuard.dom.test.tsx` | mover | Mover ds em níveis |
| `ds/apoioDeTeste.tsx` (ancestral comum dos testes em `atoms`, `molecules`, `organisms` e `templates`) | `ds/apoioDeTeste.tsx` | manter | Mover ds em níveis |

---

## 5. `testes/` (apoio de teste global)

| Origem | Destino | Ação | Etapa |
|---|---|---|---|
| `app/apoioDeTeste.tsx`: `IS_REACT_ACT_ENVIRONMENT` e stub de `matchMedia` | `testes/configurarDom.ts` (`setupFiles` do projeto dom) | repartir por export (do #55, que alterou o arquivo de origem) | testes/ global e setupFiles |
| `app/apoioDeTeste.tsx`: `PERMISSAO_QUE_O_EU_TEM`, `PERMISSAO_QUE_O_EU_NAO_TEM`, `criarEu`, `EntradaFalsa`, `criarEntradaFalsa`, `AvisoDeEncerramentoFalso`, `criarAvisoDeEncerramentoFalso`, `CenarioDeSessao`, `TelaMontada`, `VOLTAS_PARA_ASSENTAR`, `proximoCiclo`, `assentar`, `montarComSessao` (os `PERMISSAO_*` ficam com `criarEu`; `ler` vem de `app/sessao.test.tsx`, seção 1) | `testes/sessaoDeTeste.tsx` | repartir por export (do #55, que alterou `montarComSessao`) | testes/ global e setupFiles |
| `app/apoioDeTeste.tsx`: `erroDoEu`, unificado como `erroDaApi` (também usado por `dados/clienteDeConsultas.test.ts` e `app/estadoDaSessao.test.ts`) | `testes/fabricas.ts` | repartir por export (do #55, que alterou o arquivo de origem) | testes/ global e setupFiles |
| novo (`montagem.tsx`, render global sem provider; entra com o #58 e o #59 traz o mesmo arquivo) | `testes/montagem.tsx` | criar | Caracterizar lib/formato e components |

---

## 6. Raiz de `src/`: `mocks/`, `main.tsx`, `silencioso.ts`, `env.d.ts`, `styles/`

| Origem | Destino | Ação | Etapa |
|---|---|---|---|
| `mocks/ids.ts` (fica na raiz da demonstração, por decisão do dono) | `mocks/ids.ts` | manter | Mocks transversais |
| `mocks/verificacao.ts`: `filaDeVerificacaoInicial` (lida pelo shell, Fechamento, Painel e Verificação) | `mocks/verificacao.ts` | repartir por export | Mover lancamentos |
| `mocks/verificacao.ts`: `ORIGENS`, `CONFIANCA` (só Verificação e seu `PainelDeRevisao`) | `pages/financeiro/lancamentos/VerificacaoLotePage/constantes.ts` | repartir por export | Mover lancamentos |
| `main.tsx` (passa a importar as instâncias de `dados/instancias.ts`; `fontesReais` fica aqui) | `main.tsx` | manter | dados/ sem efeito e sem ciclo |
| `main.tsx`: `fontesReais`, `escolherFontesDaSessao` (opcional: fábrica que recebe as instâncias) | `app/sessao/fontesDaSessao.ts` (+ teste) | dividir | Dividir app/shell, sessão e ds |
| `silencioso.ts` (usa `criarGerenciadorOidc` do barrel de dados) | `silencioso.ts` | manter | dados/ sem efeito e sem ciclo |
| `env.d.ts` | `env.d.ts` | manter | Fronteiras no depcruise |
| `styles/global.css` (só a entrada; `@import` apontam para `../ds/fundacao/`, na mesma ordem; Tailwind mantido até a etapa "Remover o Tailwind") | `styles/global.css` | manter | Mover fundação do ds |

---

## 7. `pages/` compartilhado: `components/`, `hooks/`, `utils/`, `mocks/`

| Origem | Destino | Ação | Etapa |
|---|---|---|---|
| `components/CartazSlot.tsx` (usado por eventos/Agenda e transversal/Painel) | `pages/components/CartazSlot/CartazSlot.tsx` | mover | Mocks transversais |
| `components/PermissoesPorModulo.tsx` (usado pela `AbaDeGrupos` e pelo `MeuPerfilPage`) | `pages/components/PermissoesPorModulo/PermissoesPorModulo.tsx` | mover | Mocks transversais |
| `lib/permissoesAgrupadas.ts` (único consumidor: `PermissoesPorModulo`) | `pages/components/PermissoesPorModulo/utils/permissoesAgrupadas.ts` | mover | Mocks transversais |
| `lib/permissoesAgrupadas.test.ts` | `pages/components/PermissoesPorModulo/utils/permissoesAgrupadas.test.ts` | mover | Mocks transversais |
| `lib/formato.ts`: `formatarDinheiro` (corpo muda: chama `formatarValor(centavos / 100)`, exceção declarada), `formatarBRL`, `INTEIRO`, `formatarInteiro`, `UM_DECIMAL`, `formatarLitros`, `MESES` (passa a exportado, porque `nomeDoMes` o importa), `formatarDiaMes`, `formatarData`, `formatarCompetencia`, `competenciaPorExtenso`, `pluralizar` | `pages/utils/formato.ts` (+ teste) | repartir por export | lib/formato por export |
| `lib/formato.ts`: `paraData`, `DIAS`, `diaDaSemana` (`diaDaSemana` não tem consumidor de produção: sai no PR de remoção, seção 6.4 do Documento 8; `paraData` e `DIAS` ficam com ele, porque ele os usa; na Limpeza, `paraData` desce para `pages/utils/formato.ts`) | `lib/formato.ts` | manter | Limpeza |
| `lib/formato.test.ts` (describes que descem, seção 4.4) | `pages/utils/formato.test.ts` | repartir por describe | lib/formato por export |
| `mocks/sessao.ts`: `hoje`, `competenciaAtual` | `pages/mocks/relogio.ts` | repartir por export | Mocks transversais |
| `mocks/financeiro.ts`: `contas` (usado por financeiro e eventos) e `fundoProprio` (usado por `ContasEFundoPage` e `PainelPage`) | `pages/mocks/contas.ts` | repartir por export | Mocks transversais |
| `pages/agenda/DetalheDoTrabalho.tsx`: `TOM_DA_ANAMNESE`, `TEXTO_DA_ANAMNESE`; `pages/pessoas/PessoasPage.tsx`: idem | `pages/components/SeloDaAnamnese/constantes.ts` | fundir | Composições de domínio |
| `EstadoDaAnamnese` (tipo copiado em `mocks/agenda.ts` e `mocks/pessoas.ts`) | `pages/components/SeloDaAnamnese/tipos.ts` (os mocks importam pelo `index.ts` da unidade) | fundir | Composições de domínio |
| blocos de Pessoas, Painel e `DetalheDoTrabalho` (pontos de atenção) | `pages/components/PontosDeAtencao/` | fundir | Composições de domínio |
| `pages/registros/MeusRegistrosPage.tsx#irPara` + `pages/painel/PainelPage.tsx#irPara` | `pages/hooks/useCarrossel.ts` (+ `.dom.test.ts`) | fundir | Composições de domínio |
| `pages/eventos/DevolucoesPage.tsx`: `HOJE`, `COMPETENCIA_ATUAL`; `pages/eventos/ContratacoesPage.tsx`: `HOJE`; `pages/estoque/FeitioPage.tsx`: `HOJE` (passam a usar `2026-09-02`, decisão do dono; prazos e "dias esperando" mudam nessas telas) | `pages/mocks/relogio.ts` | fundir | Composições de domínio |

---

## 8. `pages/financeiro/`

### 8.1 Telas e mocks

| Origem | Destino | Ação | Etapa |
|---|---|---|---|
| `pages/adiantamentos/AdiantamentosPage.tsx` | `pages/financeiro/AdiantamentosPage/AdiantamentosPage.tsx` | mover | Mover financeiro I |
| `pages/adiantamentos/AdiantamentosPage.dom.test.tsx` (entra com o #83) | `pages/financeiro/AdiantamentosPage/AdiantamentosPage.dom.test.tsx` | mover | Mover financeiro I |
| `mocks/adiantamentos.ts` | `pages/financeiro/AdiantamentosPage/mocks/adiantamentos.ts` | mover | Mover financeiro I |
| `pages/contas/ContasEFundoPage.tsx` | `pages/financeiro/ContasEFundoPage/ContasEFundoPage.tsx` | mover | Mover financeiro I |
| `pages/contas/ContasEFundoPage.dom.test.tsx` (entra com o #83) | `pages/financeiro/ContasEFundoPage/ContasEFundoPage.dom.test.tsx` | mover | Mover financeiro I |
| `pages/contas/ContasEFundoPage.tsx`: `ehCaixa` (usado pela tela e pelo modal) | `pages/financeiro/ContasEFundoPage/utils/conta.ts` | repartir por export | Mover financeiro I |
| `pages/contas/ContasEFundoPage.tsx`: `CORES_DE_RESERVA`, `corDaReserva` | `pages/financeiro/ContasEFundoPage/utils/reservas.ts` | repartir por export | Mover financeiro I |
| `pages/contas/ContasEFundoPage.tsx`: `contaVazia`, `fundoVazio` (só o modal) | `pages/financeiro/ContasEFundoPage/components/GerenciarContasModal/utils/novos.ts` | repartir por export | Mover financeiro I |
| `pages/contas/GerenciarContasModal.tsx` | `pages/financeiro/ContasEFundoPage/components/GerenciarContasModal/GerenciarContasModal.tsx` | mover | Mover financeiro I |
| `pages/contas/GerenciarContasModal.dom.test.tsx` (entra com o #83) | `pages/financeiro/ContasEFundoPage/components/GerenciarContasModal/GerenciarContasModal.dom.test.tsx` | mover | Mover financeiro I |
| `pages/contas/apoioDeTeste.tsx` (entra com o #83; usado pelos testes de Contas e fundo e do modal) | `pages/financeiro/ContasEFundoPage/apoioDeTeste.tsx` | mover | Mover financeiro I |
| `mocks/financeiro.ts`: `fundos` | `pages/financeiro/ContasEFundoPage/mocks/fundos.ts` | repartir por export | Mocks transversais |
| `pages/emprestimos/EmprestimosPage.tsx` | `pages/financeiro/EmprestimosPage/EmprestimosPage.tsx` | mover | Mover financeiro I |
| `pages/emprestimos/EmprestimosPage.dom.test.tsx` (entra com o #83) | `pages/financeiro/EmprestimosPage/EmprestimosPage.dom.test.tsx` | mover | Mover financeiro I |
| `mocks/emprestimos.ts` | `pages/financeiro/EmprestimosPage/mocks/emprestimos.ts` | mover | Mover financeiro I |
| `pages/faturas/FaturasPage.tsx` | `pages/financeiro/FaturasPage/FaturasPage.tsx` | mover | Mover financeiro I |
| `pages/faturas/FaturasPage.dom.test.tsx` (entra com o #83; amplia o teste que já existe na main) | `pages/financeiro/FaturasPage/FaturasPage.dom.test.tsx` | mover | Mover financeiro I |
| `mocks/faturas.ts` | `pages/financeiro/FaturasPage/mocks/faturas.ts` | mover | Mover financeiro I |
| `pages/relatorios/RelatoriosPage.tsx` | `pages/financeiro/RelatoriosPage/RelatoriosPage.tsx` | mover | Mover financeiro II |
| `pages/relatorios/RelatoriosPage.dom.test.tsx` (entra com o #84) | `pages/financeiro/RelatoriosPage/RelatoriosPage.dom.test.tsx` | mover | Mover financeiro II |
| `pages/relatorios/GraficoSerie.tsx` | `pages/financeiro/RelatoriosPage/components/GraficoSerie/GraficoSerie.tsx` | mover | Mover financeiro II |
| `pages/relatorios/GraficoSerie.dom.test.tsx` (entra com o #84) | `pages/financeiro/RelatoriosPage/components/GraficoSerie/GraficoSerie.dom.test.tsx` | mover | Mover financeiro II |
| `pages/relatorios/PainelDeQuebra.tsx` | `pages/financeiro/RelatoriosPage/components/PainelDeQuebra/PainelDeQuebra.tsx` | mover | Mover financeiro II |
| `pages/relatorios/PainelDeQuebra.dom.test.tsx` (entra com o #84) | `pages/financeiro/RelatoriosPage/components/PainelDeQuebra/PainelDeQuebra.dom.test.tsx` | mover | Mover financeiro II |
| `pages/relatorios/useRelatorio.ts` | `pages/financeiro/RelatoriosPage/hooks/useRelatorio.ts` | mover | Mover financeiro II |
| `pages/relatorios/useRelatorio.dom.test.tsx` (entra com o #84) | `pages/financeiro/RelatoriosPage/hooks/useRelatorio.dom.test.tsx` | mover | Mover financeiro II |
| `mocks/relatorios.ts` | `pages/financeiro/RelatoriosPage/mocks/relatorios.ts` | mover | Mover financeiro II |
| `pages/fechamento/FechamentoPage.tsx` | `pages/financeiro/FechamentoPage/FechamentoPage.tsx` | mover | Mover financeiro II |
| `pages/fechamento/FechamentoPage.dom.test.tsx` (entra com o #84) | `pages/financeiro/FechamentoPage/FechamentoPage.dom.test.tsx` | mover (`vi.mock('@/mocks/financeiro')`, export `contas`: na etapa Mocks transversais, alvo `@/pages/mocks/contas`; `vi.mock('@/mocks/lancamentos')`, export `lancamentos`: na etapa Mover lancamentos, alvo `@/pages/financeiro/mocks/lancamentos`) | Mover financeiro II |
| `pages/conciliacao/ConciliacaoPage.tsx` | `pages/financeiro/ConciliacaoPage/ConciliacaoPage.tsx` | mover | Mover financeiro II |
| `pages/conciliacao/ConciliacaoPage.dom.test.tsx` (entra com o #84) | `pages/financeiro/ConciliacaoPage/ConciliacaoPage.dom.test.tsx` | mover | Mover financeiro II |
| `mocks/conciliacao.ts` | `pages/financeiro/ConciliacaoPage/mocks/conciliacao.ts` | mover | Mover financeiro II |
| `pages/prestacao/PrestacaoDeContasPage.tsx` | `pages/financeiro/PrestacaoDeContasPage/PrestacaoDeContasPage.tsx` | mover | Mover financeiro II |
| `pages/prestacao/PrestacaoDeContasPage.dom.test.tsx` (entra com o #84) | `pages/financeiro/PrestacaoDeContasPage/PrestacaoDeContasPage.dom.test.tsx` | mover | Mover financeiro II |
| `mocks/prestacao.ts` | `pages/financeiro/PrestacaoDeContasPage/mocks/prestacao.ts` | mover | Mover financeiro II |
| `pages/parametros/ParametrosPage.tsx` (1ª permissão `financeiro.plano_contas.gerenciar`) | `pages/financeiro/ParametrosPage/ParametrosPage.tsx` | mover | Mover financeiro II |
| `pages/parametros/ParametrosPage.dom.test.tsx` (entra com o #84) | `pages/financeiro/ParametrosPage/ParametrosPage.dom.test.tsx` | mover | Mover financeiro II |
| `mocks/parametros.ts` | `pages/financeiro/ParametrosPage/mocks/parametros.ts` | mover | Mover financeiro II |
| `pages/lancamento/RegistrarLancamentoPage.tsx` | `pages/financeiro/lancamentos/RegistrarLancamentoPage/RegistrarLancamentoPage.tsx` | mover | Mover lancamentos |
| `pages/lancamento/RegistrarLancamentoPage.dom.test.tsx` (entra com o #82; o #82 troca o `vi.mock('../../app/sessao')` da main por `@/app/sessao`) | `pages/financeiro/lancamentos/RegistrarLancamentoPage/RegistrarLancamentoPage.dom.test.tsx` | mover (na etapa app/ em subpastas, `useSessao` sai de `app/sessao.tsx`; o `vi.mock` passa a `@/app/sessao/SessaoProvider`) | Mover lancamentos |
| `pages/lancamento/useFormularioDeLancamento.ts` | `pages/financeiro/lancamentos/RegistrarLancamentoPage/hooks/useFormularioDeLancamento.ts` | mover | Mover lancamentos |
| `pages/lancamento/useFormularioDeLancamento.dom.test.ts` (entra com o #82) | `pages/financeiro/lancamentos/RegistrarLancamentoPage/hooks/useFormularioDeLancamento.dom.test.ts` | mover | Mover lancamentos |
| `mocks/opcoes.ts` | `pages/financeiro/lancamentos/RegistrarLancamentoPage/mocks/opcoes.ts` | mover | Mover lancamentos |
| `components/Campo.tsx`: `CampoDeTags`, `CampoDeTagsProps` | `pages/financeiro/lancamentos/RegistrarLancamentoPage/components/CampoDeTags/CampoDeTags.tsx` (+ `index.ts`, só com `CampoDeTags`) | mover (o arquivo só tinha essas duas declarações desde Primitivos para o ds) | Mover lancamentos |
| `pages/registros/LancamentosPage.tsx` | `pages/financeiro/lancamentos/LancamentosPage/LancamentosPage.tsx` | mover | Mover lancamentos |
| `pages/registros/LancamentosPage.dom.test.tsx` (entra com o #82) | `pages/financeiro/lancamentos/LancamentosPage/LancamentosPage.dom.test.tsx` | mover | Mover lancamentos |
| `mocks/lancamentos.ts`: `corDoTipo` (só Lançamentos) | `pages/financeiro/lancamentos/LancamentosPage/utils/corDoTipo.ts` | repartir por export | Mover lancamentos |
| `pages/registros/MeusRegistrosPage.tsx` | `pages/financeiro/lancamentos/MeusRegistrosPage/MeusRegistrosPage.tsx` | mover | Mover lancamentos |
| `pages/registros/MeusRegistrosPage.dom.test.tsx` (entra com o #82) | `pages/financeiro/lancamentos/MeusRegistrosPage/MeusRegistrosPage.dom.test.tsx` | mover | Mover lancamentos |
| `pages/registros/apoioDeTeste.tsx` (entra com o #82; usado pelos testes de Lançamentos e Meus registros) | `pages/financeiro/lancamentos/apoioDeTeste.tsx` | mover | Mover lancamentos |
| `mocks/lancamentos.ts`: `meusLancamentos` | `pages/financeiro/mocks/lancamentos.ts`, junto de `lancamentos`. Destino final: `pages/financeiro/lancamentos/MeusRegistrosPage/mocks/meusLancamentos.ts`. Descer troca o módulo do `vi.mock` de `MeusRegistrosPage.dom.test.tsx`, e o conferir-movimento acusa essa troca; desce na etapa que declarar a diferença | repartir por export (fica no arquivo de `lancamentos`) | Mover lancamentos |
| `mocks/sessao.ts`: `NOME_DO_REGISTRADOR_DE_EXEMPLO` (só `meusLancamentos`) | `mocks/sessao.ts`. Destino final: `pages/financeiro/lancamentos/MeusRegistrosPage/mocks/meusLancamentos.ts`, junto de `meusLancamentos` | manter (desce com `meusLancamentos`) | Mover lancamentos |
| `pages/verificacao/VerificacaoLotePage.tsx` | `pages/financeiro/lancamentos/VerificacaoLotePage/VerificacaoLotePage.tsx` | mover | Mover lancamentos |
| `pages/verificacao/VerificacaoLotePage.dom.test.tsx` (entra com o #82) | `pages/financeiro/lancamentos/VerificacaoLotePage/VerificacaoLotePage.dom.test.tsx` | mover | Mover lancamentos |
| `pages/verificacao/PainelDeRevisao.tsx` | `pages/financeiro/lancamentos/VerificacaoLotePage/components/PainelDeRevisao/PainelDeRevisao.tsx` | mover | Mover lancamentos |
| `pages/verificacao/PainelDeRevisao.dom.test.tsx` (entra com o #82) | `pages/financeiro/lancamentos/VerificacaoLotePage/components/PainelDeRevisao/PainelDeRevisao.dom.test.tsx` | mover | Mover lancamentos |
| `pages/verificacao/apoioDeTeste.tsx` (entra com o #82; usado pelos testes da Verificação de lote e do Painel de revisão) | `pages/financeiro/lancamentos/VerificacaoLotePage/apoioDeTeste.tsx` | mover | Mover lancamentos |
| `components/Paginacao.tsx` (usado por Lançamentos e Meus registros) | `pages/financeiro/lancamentos/components/Paginacao/Paginacao.tsx` | mover | Mover lancamentos |
| `lib/recibo.ts` (inteiro: os 5 exports têm os mesmos 2 consumidores) | `pages/financeiro/lancamentos/utils/recibo.ts` | mover | Mover lancamentos |
| `mocks/lancamentos.ts`: `lancamentos` (Lançamentos, Meus registros e Fechamento) | `pages/financeiro/mocks/lancamentos.ts` | repartir por export | Mover lancamentos |
| `mocks/lancamentos.ts`: `rotuloDoTipo`, `rotuloDaSituacao` | `pages/financeiro/lancamentos/utils/rotulosDoLancamento.ts` | repartir por export | Mover lancamentos |

### 8.2 Divisões

| Origem | Destino | Ação | Etapa |
|---|---|---|---|
| `RegistrarLancamentoPage.tsx`: `LISTAS`, `TIPOS`, `TOM_DO_RECIBO` (`TIPOS` e `TOM_DO_RECIBO` viram vocabulário único do fluxo na etapa de composições) | `RegistrarLancamentoPage/constantes.ts` | dividir | Dividir RegistrarLancamento |
| `RegistrarLancamentoPage.tsx`: escolha e valor do picker | `RegistrarLancamentoPage/hooks/usePickerDeOpcao.ts` | dividir | Dividir RegistrarLancamento |
| `RegistrarLancamentoPage.tsx`: blocos de recibo, comprovante, sugestões do cupom, classificação em campo, classificação no escritório com reembolso, avisos | `RegistrarLancamentoPage/components/{ReciboDoRegistro, ComprovanteDoLancamento, SugestoesDoCupom, ClassificacaoEmCampo, ClassificacaoNoEscritorio (+ components/Reembolso), AvisosDoRegistro}/` | dividir | Dividir RegistrarLancamento |
| `useFormularioDeLancamento.ts`: useMemo derivado; `INICIAL`, `SUGESTOES_DO_CUPOM`, `ChaveSugerida` | `RegistrarLancamentoPage/utils/regrasDoLancamento.ts` e `utils/textosPorTipo.ts` (+ testes); `mocks/formularioInicial.ts` e `mocks/sugestoesDoCupom.ts` | dividir | Dividir RegistrarLancamento |
| `mocks/opcoes.ts`: `rotuloDaOpcao`, `metaDaOpcao` | `RegistrarLancamentoPage/utils/opcao.ts` (+ teste) | repartir por export | Dividir RegistrarLancamento |
| `LancamentosPage.tsx`: `GRUPOS`, `POR_PAGINA`, `FILTRO_INICIAL`, `OPCOES_PERIODO`, `OPCOES_TIPO`, `OPCOES_STATUS`, `OPCOES_GRUPO`, `CHIPS_TIPO` | `LancamentosPage/constantes.ts` | dividir | Dividir Lançamentos e Meus registros |
| `LancamentosPage.tsx`: filtragem e lista; totais; `Total`, `valorTabular`; filtros, resumo, lista, tabela | `LancamentosPage/hooks/useFiltrosDoLivro.ts` e `utils/filtrarLancamentos.ts` (+ testes); `utils/totaisDoPeriodo.ts` (+ teste); `components/{FiltrosDoLivro, ResumoDoPeriodo, ListaDoLivro, TabelaDoLivro (+ components/LinhaDoLivro)}/` | dividir | Dividir Lançamentos e Meus registros |
| `LancamentosPage.tsx`: `GavetaDeDetalhe` | `LancamentosPage/components/GavetaDeDetalhe/` (+ `utils/historicoDoLancamento.ts`, `components/HistoricoDoLancamento/`) | dividir | Dividir Lançamentos e Meus registros |
| `MeusRegistrosPage.tsx`: `Visao`, `POR_PAGINA`, `LARGURA_CARTAO`, `GAP_CARTAO`; `SetaRedonda`, `BotaoLargo`, carrossel; lista simplificada; totais | `MeusRegistrosPage/constantes.ts`; `components/CarrosselDeRecibos/` (+ `components/{SetaRedonda, BotaoLargo, PontosDoCarrossel}`); `components/ListaSimplificada/`; `utils/totaisDosRegistros.ts` (+ teste) | dividir | Dividir Lançamentos e Meus registros |
| `VerificacaoLotePage.tsx`: `FiltroOrigem`, `FILTROS`; estado e aprovações; `LinhaDaFila`; barra de seleção; filtros de origem | `VerificacaoLotePage/constantes.ts`; `hooks/useFilaDeVerificacao.ts` (+ `.dom.test.ts`); `components/{LinhaDaFila, BarraDeSelecao, FiltrosDeOrigem}/` | dividir | Dividir Verificação de lote |
| `PainelDeRevisao.tsx`: `CampoDeTexto`, entrada, devolução; rascunho e alteração | `VerificacaoLotePage/components/PainelDeRevisao/components/{CampoDeTexto, FormularioDeDevolucao}/`; `hooks/useRascunhoDeRevisao.ts` | dividir | Dividir Verificação de lote |
| `ContasEFundoPage.tsx`: `iconeDaConta`, `textoDaConciliacao`, `tomDaConciliacao`; `rotuloLabel`, `valorGrande`, `valorMedio`; resumo do saldo; handlers do modal; `BlocoDoResumo`, `ColunaDoFundo`, `CartaoDeConta` | `ContasEFundoPage/utils/conta.ts` (+ teste); `constantes.ts`; `utils/resumoDoSaldo.ts` (+ teste); `hooks/useContasEFundos.ts`; `components/{ResumoDoSaldo (+ components/BlocoDoResumo), FundoProprio (+ components/ColunaDoFundo), CartaoDeConta}/` | dividir | Dividir Contas e fundo |
| `GerenciarContasModal.tsx`: `BotaoNovo`, `LinhaGerenciavel`, `CampoDoModal`, `AcoesDoFormulario`, `FormularioDeConta`, `FormularioDeFundo`; `Aba`, `Formulario`, `rotuloLabel`, entrada | `ContasEFundoPage/components/GerenciarContasModal/components/`; `constantes.ts`; `tipos.ts` | dividir | Dividir Contas e fundo |
| `FaturasPage.tsx#dividaDoCartao` + `mocks/faturas.ts#totalDaFatura` (regra de domínio sai do mock) | `FaturasPage/utils/fatura.ts` (+ teste) | dividir | Dividir Faturas e Empréstimos |
| `FaturasPage.tsx`: `TOM`, `ROTULO`; estado e ações; `CartaoDoTopo`, `LinhaDaFatura`, `DetalheDaFatura`, `DetalheProps`, `TabelaDeCompras`, `AcoesDaFatura`, `FormularioDePagamento` | `FaturasPage/constantes.ts`; `hooks/useFaturas.ts` (+ `.dom.test.ts`); `components/{CartaoDoTopo, LinhaDaFatura, DetalheDaFatura (+ components/{TabelaDeCompras, AcoesDaFatura, FormularioDePagamento})}/` | dividir | Dividir Faturas e Empréstimos |
| `EmprestimosPage.tsx`: `Filtro`, `DIRECAO`; `ValoresDoNovo`; estado, criação e devolução; `FormularioDeEmprestimo`, `LinhaDoEmprestimo`, `Detalhe`, `TabelaDeDevolucoes`, `FormularioDeDevolucao` | `EmprestimosPage/constantes.ts`; `hooks/useEmprestimos.ts` e `utils/montarEmprestimo.ts` (+ testes); `components/` | dividir | Dividir Faturas e Empréstimos |
| `mocks/emprestimos.ts`: `devolvido`, `saldoDevedor`, `quitado` (regra de domínio sai do mock) | `EmprestimosPage/utils/saldo.ts` (+ teste) | repartir por export | Dividir Faturas e Empréstimos |
| `AdiantamentosPage.tsx`: `TOM`, `ROTULO`; estado e transições; `SeletorDePerspectiva`, `BlocoAusente`, `Linha`, `FormularioDeAdiantamento`; recusa; ressarcimento | `AdiantamentosPage/constantes.ts`; `hooks/useAdiantamentos.ts`; `utils/montarAdiantamento.ts` e `utils/particionarPorStatus.ts` (+ testes); `components/{SeletorDePerspectiva, BlocoAusente, Linha, FormularioDeAdiantamento, FormularioDeRecusa, FormularioDeRessarcimento}/` | dividir | Dividir Adiantamentos |
| `mocks/adiantamentos.ts#diasDesde` | `AdiantamentosPage/utils/diasDesde.ts` (+ teste) | repartir por export | Dividir Adiantamentos |
| `RelatoriosPage.tsx`: `Drill`, `PERIODOS`, `comOpcaoTodos`; recorte, KPIs, linhas do drill; `Cartao`, `Numero`, `Chip`, `CampoDeMes`; seções | `RelatoriosPage/constantes.ts`; `utils/recorte.ts` (+ teste); `components/{Cartao, PainelDeFiltros (+ components/{Chip, CampoDeMes}), CartoesDeKpi, MovimentoPorConta (+ components/Numero), MetasDoFundo, CustoPorCerimonia, GavetaDeRecorte}/` | dividir | Dividir Relatórios |
| `useRelatorio.ts`: `indice`, `doIndice`, `analisar`, `intervaloDe`, `deslocar`, `rotuloDoPonto`; `somar`, `agrupar`; `textoDoDelta`, `corDoDelta`; `Periodo`, `Comparacao`, `Unidade`, `Filtros`, `FILTROS_LIMPOS`, `Ponto` | `RelatoriosPage/utils/periodo.ts`, `utils/agregacao.ts`, `utils/delta.ts` (+ testes); `tipos.ts`; `constantes.ts` | dividir | Dividir Relatórios |
| `pages/relatorios/useRelatorio.test.ts` (entra com o #84) | `pages/financeiro/RelatoriosPage/hooks/useRelatorio.test.ts` | mover, ao lado do sujeito | Mover financeiro II |
| `RelatoriosPage/hooks/useRelatorio.test.ts` | `pages/financeiro/RelatoriosPage/utils/delta.test.ts` | mover (os dois describes são de `textoDoDelta` e `corDoDelta`, que vão para `utils/delta.ts`; não se reparte) | Dividir Relatórios |
| `mocks/relatorios.ts#PALETA` (mapa de apresentação sai do mock; só `PainelDeQuebra` usa) | `RelatoriosPage/components/PainelDeQuebra/constantes.ts` | repartir por export | Dividir Relatórios |
| `GraficoSerie.tsx`: `ItemDaLegenda`; pontos da linha | `GraficoSerie/components/ItemDaLegenda/` e `GraficoSerie/utils/pontosDaLinha.ts` (+ teste) | dividir | Dividir Relatórios |
| `PainelDeQuebra.tsx`: fatias; vistas | `PainelDeQuebra/utils/fatias.ts` (+ teste) e `components/{VistaEmBarras, VistaEmRosca}/` | dividir | Dividir Relatórios |
| `FechamentoPage.tsx`: `HISTORICO`; checklist P1 e totais; `ItemDoChecklist`, `ColunaDeResumo`, `rotuloLabel`, `valorGrande`; seções | `FechamentoPage/mocks/historico.ts`; `utils/checklist.ts` (+ teste); `components/{FaixaDoPeriodo (+ components/ColunaDeResumo), ItemDoChecklist, SaldosDoFechamento, AcaoDeFechamento, HistoricoDeFechamentos}/`; `constantes.ts` | dividir | Dividir Fechamento e Conciliação |
| `ConciliacaoPage.tsx`: estado e ações; `PainelDeImportacao`, `Coluna`, `LinhaDoExtrato`, `Sugestao`, `Lado`, `LancamentoSozinho` | `ConciliacaoPage/hooks/useConciliacao.ts` (+ `.dom.test.ts`); `components/{PainelDeImportacao, Coluna, LinhaDoExtrato, Sugestao (+ components/Lado), LancamentoSozinho}/` | dividir | Dividir Fechamento e Conciliação |
| `PrestacaoDeContasPage.tsx`: estado e gerar; `ExplicacaoDoNivel`, `Documento`, `DocumentoProps`, `Secao`, `Linha`, `Total`; histórico | `PrestacaoDeContasPage/hooks/usePrestacao.ts`; `components/{ExplicacaoDoNivel, Documento (+ components/{Secao, Linha, Total}), HistoricoDePrestacoes}/` | dividir | Dividir Prestação e Parâmetros |
| `mocks/prestacao.ts#soma` (regra de domínio sai do mock) | `PrestacaoDeContasPage/utils/totais.ts` (+ teste) | repartir por export | Dividir Prestação e Parâmetros |
| `ParametrosPage.tsx`: `Aba`, `REGIME_ROTULO`; corrigir; `BuracoDoRelatorio`, `TabelaDeCategorias`, `ListaDeUnidades`, `UnidadeCartao`, `ParametrosDaCasa` | `ParametrosPage/constantes.ts`; `hooks/useCorrecaoDeLinha.ts`; `components/{BuracoDoRelatorio, TabelaDeCategorias, ListaDeUnidades (+ components/UnidadeCartao), ParametrosDaCasa}/` | dividir | Dividir Prestação e Parâmetros |

### 8.3 Composições de domínio

| Origem | Destino | Ação | Etapa |
|---|---|---|---|
| `EmprestimosPage.tsx` (container de formulário), `AdiantamentosPage.tsx` (idem), `FaturasPage.tsx` (idem) | `pages/financeiro/components/CartaoDeFormulario/` | fundir | Composições de domínio |
| `LancamentosPage.tsx` (chips de tipo) + `VerificacaoLotePage.tsx` (filtros de origem) | `pages/financeiro/lancamentos/components/ChipDeFiltro/` | fundir | Composições de domínio |
| `LancamentosPage.tsx` (paginação) + `MeusRegistrosPage.tsx` (paginação); os dois casos têm teste, porque só Lançamentos limita a página atual | `pages/financeiro/lancamentos/hooks/usePaginacao.ts` (+ `.dom.test.ts`) | fundir | Composições de domínio |
| totais das duas telas, após as divisões (o estorno fica como está até o PR de correção; decisão: fora de entradas e de saídas, seção 15 do Documento 8) | `pages/financeiro/lancamentos/utils/totais.ts` | fundir | Composições de domínio |
---

## 9. `pages/eventos/`

### 9.1 Telas, mocks e fluxo de inscrição

| Origem | Destino | Ação | Etapa |
|---|---|---|---|
| `pages/agenda/AgendaPage.tsx` | `pages/eventos/AgendaPage/AgendaPage.tsx` | mover | Mover eventos |
| `pages/agenda/AgendaPage.dom.test.tsx` (entra com o #85) | `pages/eventos/AgendaPage/AgendaPage.dom.test.tsx` | mover | Mover eventos |
| `pages/agenda/CalendarioMensal.tsx` | `pages/eventos/AgendaPage/components/CalendarioMensal/CalendarioMensal.tsx` | mover | Mover eventos |
| `pages/agenda/CalendarioMensal.dom.test.tsx` (entra com o #85) | `pages/eventos/AgendaPage/components/CalendarioMensal/CalendarioMensal.dom.test.tsx` | mover | Mover eventos |
| `pages/agenda/DetalheDoTrabalho.tsx` | `pages/eventos/AgendaPage/components/DetalheDoTrabalho/DetalheDoTrabalho.tsx` (+ `index.ts` com `export * from`, que leva os dois exports do arquivo: `DetalheDoTrabalho`, para a `AgendaPage`, e `DetalheDoTrabalhoProps`, para o `apoioDeTeste.tsx`; o conferir-movimento acusa `export type { DetalheDoTrabalhoProps }` como exportação nova) | mover | Mover eventos |
| `pages/agenda/DetalheDoTrabalho.dom.test.tsx` (entra com o #85) | `pages/eventos/AgendaPage/components/DetalheDoTrabalho/DetalheDoTrabalho.dom.test.tsx` | mover | Mover eventos |
| `pages/agenda/FormularioDeTrabalho.tsx` (componente) | `pages/eventos/AgendaPage/components/FormularioDeTrabalho/FormularioDeTrabalho.tsx` | repartir por export | Mover eventos |
| `pages/agenda/FormularioDeTrabalho.tsx`: `rascunhoVazio`, `rascunhoDe`, `RascunhoDeTrabalho` (a `AgendaPage` também os usa) | `pages/eventos/AgendaPage/utils/rascunhoDeTrabalho.ts` | repartir por export | Mover eventos |
| `pages/agenda/FormularioDeTrabalho.dom.test.tsx` (entra com o #85) | `pages/eventos/AgendaPage/components/FormularioDeTrabalho/FormularioDeTrabalho.dom.test.tsx` | mover inteiro (o import de `rascunhoVazio` e `rascunhoDe` passa a `utils/rascunhoDeTrabalho.ts`) | Mover eventos |
| `FormularioDeTrabalho.dom.test.tsx`, describes `rascunhoVazio` e `rascunhoDe` | `pages/eventos/AgendaPage/utils/rascunhoDeTrabalho.test.ts` | repartir por describe; levam a constante `TRABALHO_EXISTENTE` e uma fábrica de trabalho sem DOM, porque o `.test.ts` roda no projeto `logica` | Dividir Agenda |
| `pages/agenda/apoioDeTeste.tsx` (entra com o #85; usado pelos testes de Agenda, Calendário, Detalhe e Formulário) | `pages/eventos/AgendaPage/apoioDeTeste.tsx` | mover (o `import type` de `./DetalheDoTrabalho` segue o componente, na mesma etapa) | Mover eventos |
| `lib/formato.ts`: `nomeDoMes` | `pages/eventos/AgendaPage/utils/nomeDoMes.ts` | repartir por export | lib/formato por export |
| `mocks/agenda.ts` | `pages/eventos/AgendaPage/mocks/agenda.ts` | mover | Mover eventos |
| `pages/eventos/ContratacoesPage.tsx` | `pages/eventos/ContratacoesPage/ContratacoesPage.tsx` | mover | Mover eventos |
| `pages/eventos/ContratacoesPage.dom.test.tsx` (entra com o #85) | `pages/eventos/ContratacoesPage/ContratacoesPage.dom.test.tsx` | mover (`vi.mock('@/mocks/contratacoes')` e o `import type` do mesmo módulo seguem o mock na mesma etapa; `vi.mock('@/mocks/financeiro')`, export `contas`: na etapa Mocks transversais, alvo `@/pages/mocks/contas`) | Mover eventos |
| `mocks/contratacoes.ts` | `pages/eventos/ContratacoesPage/mocks/contratacoes.ts` | mover | Mover eventos |
| `mocks/contratacoes.ts`: `STATUS_ROTULO`, `FORMA_ROTULO`, `FORMA_EXPLICACAO` (mapas de apresentação; só `ContratacoesPage` usa) | `pages/eventos/ContratacoesPage/constantes.ts` | repartir por export | Mover eventos |
| `pages/eventos/DevolucoesPage.tsx` (1ª permissão `eventos.devolucao.efetivar`; o menu continua em Financeiro) | `pages/eventos/DevolucoesPage/DevolucoesPage.tsx` | mover | Mover eventos |
| `pages/eventos/DevolucoesPage.dom.test.tsx` (entra com o #85) | `pages/eventos/DevolucoesPage/DevolucoesPage.dom.test.tsx` | mover (`vi.mock('@/mocks/financeiro')`, export `contas`: na etapa Mocks transversais, alvo `@/pages/mocks/contas`) | Mover eventos |
| `mocks/devolucoes.ts` | `pages/eventos/DevolucoesPage/mocks/devolucoes.ts` | mover | Mover eventos |
| `pages/eventos/LeitosPage.tsx` | `pages/eventos/LeitosPage/LeitosPage.tsx` | mover | Mover eventos |
| `pages/eventos/LeitosPage.dom.test.tsx` (entra com o #85) | `pages/eventos/LeitosPage/LeitosPage.dom.test.tsx` | mover | Mover eventos |
| `pages/eventos/apoioDeTeste.tsx` (entra com o #85; usado pelos testes de Contratações, Devoluções e Leitos) | `pages/eventos/apoioDeTeste.tsx` | manter | Mover eventos |
| `mocks/leitos.ts` | `pages/eventos/LeitosPage/mocks/leitos.ts` | mover | Mover eventos |
| `mocks/leitos.ts`: `TIPO_LEITO_ROTULO` (mapa de apresentação; só `LeitosPage` usa) | `pages/eventos/LeitosPage/constantes.ts` | repartir por export | Mover eventos |
| `pages/eventos/InscricaoPage.tsx` | `pages/eventos/inscricao/InscricaoPage/InscricaoPage.tsx` | mover | Mover inscricao |
| `pages/eventos/InscricaoPage.dom.test.tsx` (entra com o #86) | `pages/eventos/inscricao/InscricaoPage/InscricaoPage.dom.test.tsx` | mover | Mover inscricao |
| `pages/publico/InscricaoPublicaPage.tsx` (tela pública, no módulo do recurso que cria) | `pages/eventos/inscricao/InscricaoPublicaPage/InscricaoPublicaPage.tsx` | mover | Mover inscricao |
| `pages/publico/InscricaoPublicaPage.dom.test.tsx` (entra com o #86; amplia o teste que já existe na main) | `pages/eventos/inscricao/InscricaoPublicaPage/InscricaoPublicaPage.dom.test.tsx` | mover (os imports relativos `../../ds` e `../../app/apoioDeTeste` trocam de caminho nesta etapa; o segundo é só de efeito e sai em `testes/ global` (seção 5)) | Mover inscricao |
| `components/Anamnese.tsx`: `BlocoDePergunta`, `Opcao`, `Resposta`, `MotivoDaPergunta` (só a pública consome) | `pages/eventos/inscricao/InscricaoPublicaPage/components/BlocoDePergunta/BlocoDePergunta.tsx` | repartir por export | Mover inscricao |
| `components/Anamnese.tsx`: `respondida`, `disparaAlerta` | `pages/eventos/inscricao/InscricaoPublicaPage/utils/regraDeAlerta.ts` | repartir por export | Mover inscricao |
| `mocks/inscricao.ts`: `EventoParaInscricao`, `eventos` (usados pela `InscricaoPage` e pelo mock da pública) | `pages/eventos/inscricao/mocks/eventos.ts` | repartir por export | Mover inscricao |
| `mocks/inscricao.ts`: `PessoaDoDiretorio`, `diretorio` (dados de demonstração) | `pages/eventos/inscricao/InscricaoPage/mocks/inscricao.ts` | repartir por export | Mover inscricao |
| `mocks/inscricao.ts`: `TIPO_ROTULO`, `TIPO_EXPLICACAO`, `CONSAGRA_POR_PADRAO`, `ANAMNESE_ROTULO` (mapas fixos; só `InscricaoPage` usa) | `pages/eventos/inscricao/InscricaoPage/constantes.ts` | repartir por export | Mover inscricao |
| `mocks/inscricaoPublica.ts`: `eventoDoLink`, `linkDaCerimonia` (`eventoDoLink` vai junto com `linkDaCerimonia`; o mock da pública importa do ancestral) | `pages/eventos/inscricao/mocks/linkDaCerimonia.ts` | repartir por export | Mover inscricao |
| `mocks/inscricaoPublica.ts`: `VERSAO_VIGENTE`, `FORMULARIO_VIGENTE`, `PERGUNTAS_V3`, `CadastroEncontrado`, `formularioInteiro`, `cadastros`, `MODO_RECADO`, `CPFS_DE_EXEMPLO`, `TEXTO_DA_DECLARACAO` | `pages/eventos/inscricao/InscricaoPublicaPage/mocks/inscricaoPublica.ts` | repartir por export | Mover inscricao |

### 9.2 Divisões

| Origem | Destino | Ação | Etapa |
|---|---|---|---|
| `AgendaPage.tsx`: `TOM_DA_SITUACAO`, `rotuloDaSituacao`; estado e ações; salvar; navegar mês; `setaDoMes`; lista | `AgendaPage/constantes.ts`; `hooks/useAgenda.ts`; `utils/trabalhoDoRascunho.ts` e `utils/mes.ts` (+ testes); `components/{NavegacaoDoMes, ListaDeTrabalhos}/` | dividir | Dividir Agenda |
| `mocks/agenda.ts`: `TipoDeTrabalho`, `SituacaoDoTrabalho`, `TarefaDePreparo`, `Trabalho`, `ParticipanteDoTrabalho`; `CORES_POR_TIPO` | `AgendaPage/tipos.ts` e `constantes.ts` | repartir por export | Dividir Agenda |
| `mocks/agenda.ts`: `VERSAO_DO_FORMULARIO` (dado da demonstração; único consumidor: `DetalheDoTrabalho`) | `AgendaPage/components/DetalheDoTrabalho/mocks/formulario.ts` | repartir por export | Dividir Agenda |
| `CalendarioMensal.tsx`: `DIAS_DA_SEMANA`, células do mês | `CalendarioMensal/constantes.ts`; `utils/celulasDoMes.ts` (+ teste) | dividir | Dividir Agenda |
| `CalendarioMensal.tsx`: `LegendaDeTipos` (só `AgendaPage` usa; `CalendarioMensal` só o define; usa `CORES_POR_TIPO`, que desce para `AgendaPage/constantes.ts` na mesma etapa) | `AgendaPage/components/LegendaDeTipos/LegendaDeTipos.tsx` | repartir por export | Dividir Agenda |
| `DetalheDoTrabalho.tsx`: `Bloco`, `Numero`, `Meta`, `MESES_CURTOS`, `ORIGENS_DE_MARCACAO`; contagens de participantes | `DetalheDoTrabalho/components/{Bloco, Numero, Meta}/`; `constantes.ts`; `utils/resumoDosParticipantes.ts` (+ teste) | dividir | Dividir Agenda |
| `FormularioDeTrabalho.tsx`: `entradaDaTarefa`, `BotaoDaTarefa`; mover tarefa | `FormularioDeTrabalho/components/BotaoDaTarefa/`; `utils/moverTarefa.ts` (+ teste) | dividir | Dividir Agenda |
| `InscricaoPage.tsx`: `TOM_DA_ANAMNESE`, `Pendencia`; 19 `useState` e handlers; pendências; `Bloco`, `EscolhaDoEvento`, `LinkDaCerimonia`, `BuscaDePessoa`, `PessoaEscolhida`, `EstadoDaAnamnese`, `Contribuicao`, `LinhaDeInterruptor`, `Pendencias`, `Fechamento` | `InscricaoPage/constantes.ts` e `tipos.ts`; `hooks/useInscricao.ts` (+ `.dom.test.ts`, reducer); `utils/pendenciasDaInscricao.ts` (+ teste); `components/` | dividir | Dividir Inscrição |
| `InscricaoPublicaPage.tsx`: `soDigitos`, `mascararCpf`; `Passo`, `Novo`, `NOVO_VAZIO`, `ORDEM`; estado, identificação e derivados; `Moldura`, `Passos`, `Identificacao`, `Declaracao`, `PortaDeRefazer`, `Participacao`, `Pronto`; passo de cadastro e passo de anamnese; `Herdadas`, `Guardado` | `InscricaoPublicaPage/utils/cpf.ts` (+ teste); `constantes.ts` e `tipos.ts`; `hooks/useInscricaoPublica.ts` (+ `.dom.test.ts`); `components/{Moldura, Passos, Identificacao, PassoCadastro, Participacao, Pronto, Declaracao (+ components/PortaDeRefazer), PassoAnamnese (+ components/{Herdadas, Guardado, BlocoDePergunta})}/` | dividir | Dividir Inscrição |
| `LeitosPage.tsx`: `Aba`, `Alocacao`, `Pendencia`; estado e alocação; `rotuloDaNoite`, `identificacaoDe`; `AvisoDeConflito`, `Grade`, `LinhaDeLeito`, `Celula`, `EscolhaDeHospede`, `SemLeito`, `ForaDoMapa`, `Cadastro`, `QuestaoAberta` | `LeitosPage/tipos.ts` e `constantes.ts`; `hooks/useAlocacaoDeLeitos.ts`; `utils/{ocupacao, noites, leitos}.ts` (+ testes); `components/{AvisoDeConflito, Grade (+ components/{EscolhaDeHospede, LinhaDeLeito (+ components/Celula)}), SemLeito, ForaDoMapa, Cadastro (+ components/QuestaoAberta)}/` | dividir | Dividir Leitos, Contratações e Devoluções |
| `ContratacoesPage.tsx`: `TOM`; receber e confirmar; totais do cartão; teto; `DeQuemEIsso`, `Teto`, `CartaoDeContratacao`, `Linha`, `Lado`, `Devolucao`, `PainelDeRecebimento`, `DoisLadosDaMesmaPalavra` | `ContratacoesPage/constantes.ts`; `hooks/useContratacoes.ts`; `utils/resultadoDaContratacao.ts` e `utils/tetoDoMei.ts` (+ testes); `components/{DeQuemEIsso, Teto, DoisLadosDaMesmaPalavra, CartaoDeContratacao (+ components/{Linha, Lado, Devolucao, PainelDeRecebimento})}/` | dividir | Dividir Leitos, Contratações e Devoluções |
| `DevolucoesPage.tsx`: `diasEsperando`; pagar; competência do estorno; `Espelho`, `CartaoDeDevolucao`, `Linha`, `PainelDePagamento`, `ComoEntraNoResultado`, `FaltaramSemPedir`, `JaPagas` | `DevolucoesPage/hooks/useDevolucoes.ts`; `utils/diasEsperando.ts` e `utils/competenciaDoEstorno.ts` (+ testes); `components/{Espelho, ComoEntraNoResultado, FaltaramSemPedir, JaPagas, CartaoDeDevolucao (+ components/{Linha, PainelDePagamento})}/` | dividir | Dividir Leitos, Contratações e Devoluções |

### 9.3 Composições de domínio

| Origem | Destino | Ação | Etapa |
|---|---|---|---|
| `DevolucoesPage.tsx#PainelDePagamento` + `ContratacoesPage.tsx#PainelDeRecebimento` | `pages/eventos/components/PainelDeContaEData/` | fundir | Composições de domínio |
| `InscricaoPage.tsx#OpcaoEmLinha` + `InscricaoPublicaPage.tsx` (opção marcável) + `components/Anamnese.tsx#Opcao` | `pages/eventos/inscricao/components/OpcaoMarcavel/` | fundir | Composições de domínio |
| `InscricaoPage.tsx` (contribuição e total) + `InscricaoPublicaPage.tsx` (total); a interna zera a contribuição de `EQUIPE`, a pública não | `pages/eventos/inscricao/utils/valorDaInscricao.ts` com parâmetro de isenção (+ teste dos dois casos) | fundir | Composições de domínio |
| `NiveisDeContribuicao`, `ResumoDoDevido`, `DadosParaACasa` (`InscricaoPage` e `InscricaoPublicaPage`) | `pages/eventos/inscricao/components/` | fundir | Composições de domínio |
---

## 10. `pages/estoque/`

| Origem | Destino | Ação | Etapa |
|---|---|---|---|
| `pages/ayahuasca/AyahuascaPage.tsx` (1ª permissão `estoque.saldo.ler`) | `pages/estoque/AyahuascaPage/AyahuascaPage.tsx` | mover | Mover pessoas e estoque |
| `pages/ayahuasca/AyahuascaPage.dom.test.tsx` (entra com o #87) | `pages/estoque/AyahuascaPage/AyahuascaPage.dom.test.tsx` | mover | Mover pessoas e estoque |
| `mocks/ayahuasca.ts` | `pages/estoque/AyahuascaPage/mocks/ayahuasca.ts` | mover | Mover pessoas e estoque |
| `mocks/ayahuasca.ts`: `rotuloDoMovimento` (mapa de apresentação; só `AyahuascaPage` usa) | `pages/estoque/AyahuascaPage/constantes.ts` | repartir por export | Mover pessoas e estoque |
| `pages/estoque/FeitioPage.tsx` | `pages/estoque/FeitioPage/FeitioPage.tsx` | mover | Mover pessoas e estoque |
| `pages/estoque/FeitioPage.dom.test.tsx` (entra com o #87) | `pages/estoque/FeitioPage/FeitioPage.dom.test.tsx` | mover | Mover pessoas e estoque |
| `mocks/feitio.ts` | `pages/estoque/FeitioPage/mocks/feitio.ts` | mover | Mover pessoas e estoque |
| `AyahuascaPage.tsx`: `Aba`, `ModoDoFormulario`, `RascunhoDeMovimento`, `SITUACAO`, `litros`, `valorTabular`, `corDoMovimento`; saldos; erro do formulário; rascunhos; estado e salvar; `Kpi`, `FichaDoLote`, `Dado`, `ModalDeMovimento`; abas | `AyahuascaPage/tipos.ts` e `constantes.ts`; `utils/{saldos, validarMovimento, rascunhoDeMovimento}.ts` (+ testes); `hooks/useEstoqueDeDaime.ts`; `components/{Kpi, AbaDeLotes, AbaDeMovimentos, AbaDeReservas, ModalDeMovimento, FichaDoLote (+ components/Dado)}/` | dividir | Dividir Ayahuasca e Feitio |
| `FeitioPage.tsx`: concluir e estado; `PorQueApurar`, `FeitioEmCurso`, `Secao`, `PainelDeConclusao`, `Comparacao`, `Barra`, `Anteriores` | `FeitioPage/hooks/useFeitio.ts`; `components/{PorQueApurar, PainelDeConclusao, Anteriores, FeitioEmCurso (+ components/Secao), Comparacao (+ components/Barra)}/` | dividir | Dividir Ayahuasca e Feitio |
| `FeitioPage.tsx`: custo por litro e somas; `mocks/feitio.ts#custoTotal`, `custoConfirmado` | `FeitioPage/utils/custoDoFeitio.ts` (+ teste) | dividir | Dividir Ayahuasca e Feitio |

---

## 11. `pages/pessoas/`

| Origem | Destino | Ação | Etapa |
|---|---|---|---|
| `pages/pessoas/PessoasPage.tsx` | `pages/pessoas/PessoasPage/PessoasPage.tsx` | mover | Mover pessoas e estoque |
| `pages/pessoas/PessoasPage.dom.test.tsx` (entra com o #87) | `pages/pessoas/PessoasPage/PessoasPage.dom.test.tsx` | mover | Mover pessoas e estoque |
| `mocks/pessoas.ts` | `pages/pessoas/PessoasPage/mocks/pessoas.ts` | mover | Mover pessoas e estoque |
| `pages/pessoas/AnamnesePage.tsx` | `pages/pessoas/AnamnesePage/AnamnesePage.tsx` | mover | Mover pessoas e estoque |
| `pages/pessoas/AnamnesePage.dom.test.tsx` (entra com o #87) | `pages/pessoas/AnamnesePage/AnamnesePage.dom.test.tsx` | mover | Mover pessoas e estoque |
| `pages/pessoas/apoioDeTeste.tsx` (entra com o #87; usado pelos testes de Pessoas e Anamnese) | `pages/pessoas/apoioDeTeste.tsx` | manter | Mover pessoas e estoque |
| `mocks/anamnese.ts` | `pages/pessoas/AnamnesePage/mocks/anamnese.ts` | mover | Mover pessoas e estoque |
| `AnamnesePage.tsx`: `TOM_DA_SITUACAO`, `rotuloLabel`, `RascunhoDePergunta`; `mocks/anamnese.ts#TIPOS_DE_PERGUNTA` | `AnamnesePage/constantes.ts` e `tipos.ts` | dividir | Dividir Pessoas e Anamnese |
| `AnamnesePage.tsx`: publicar, criar rascunho, trocar posição; `Cartao`, `BotaoDaPergunta` | `AnamnesePage/utils/versoes.ts` (+ teste); `hooks/useVersoesDoFormulario.ts`; `components/{Cartao, ListaDeVersoes, CabecalhoDaVersao, HistoricoDaVersao, PerguntasDaVersao (+ components/{BotaoDaPergunta, FormularioDeNovaPergunta})}/` | dividir | Dividir Pessoas e Anamnese |
| `PessoasPage.tsx`: `ACESSO`, opções do filtro; filtro e contagens; mutações; e-mail do convite; `Kpi`, `FichaDaPessoa`, `Cartao`, `Dado` | `PessoasPage/constantes.ts`; `utils/{filtrarPessoas, resumirPessoas, emailDoConvite}.ts` (+ testes); `hooks/usePessoasDeDemonstracao.ts`; `components/{Kpi, ListaDePessoas, FichaDaPessoa (+ components/{Cartao, Dado})}/` | dividir | Dividir Pessoas e Anamnese |

---

## 12. `pages/sistema/`

### 12.1 Telas, mocks e aba de acessos (do #55)

| Origem | Destino | Ação | Etapa |
|---|---|---|---|
| `pages/auditoria/AuditoriaPage.tsx` | `pages/sistema/AuditoriaPage/AuditoriaPage.tsx` | mover | Mover sistema |
| `mocks/auditoria.ts` | `pages/sistema/AuditoriaPage/mocks/auditoria.ts` | mover | Mover sistema |
| `pages/acessos/AcessosPage.tsx` | `pages/sistema/AcessosPage/AcessosPage.tsx` | mover (do #55) | Mover sistema |
| `pages/acessos/AcessosPage.dom.test.tsx` | `pages/sistema/AcessosPage/AcessosPage.dom.test.tsx` | mover (do #55) | Mover sistema |
| `pages/acessos/AcessosPage.dom.test.tsx` (repartido por aba, com as faixas medidas no código mesclado) | `AbaDeUsuarios.dom.test.tsx` e `AbaDeGrupos.dom.test.tsx` | repartir por export (do #55) | Dividir sistema, Meu perfil e entrada |
| `pages/acessos/apoioDeTeste.tsx` (usado pelos testes das duas abas e dos painéis) | `pages/sistema/AcessosPage/apoioDeTeste.tsx` | mover (do #55) | Mover sistema |
| `pages/acessos/consultasDeAcessos.ts` (sem `temFiltroAplicado`, linha seguinte; `SEM_FILTRO` só tem consumo de teste: fica até a remoção, seção 6.4 do Documento 8) | `pages/sistema/AcessosPage/consultas.ts` | mover (do #55) | Mover sistema |
| `pages/acessos/consultasDeAcessos.ts`: `temFiltroAplicado` (só `AbaDeUsuarios` usa) | `pages/sistema/AcessosPage/components/AbaDeUsuarios/utils/temFiltroAplicado.ts` (+ teste) | repartir por export (do #55) | Mover sistema |
| `pages/acessos/consultasDeAcessos.test.ts`: describes `caminhoDaListagemDeUsuarios` e `consulta usuario(id)` | `pages/sistema/AcessosPage/consultas.test.ts` | repartir por describe (do #55) | Mover sistema |
| `pages/acessos/consultasDeAcessos.test.ts`: describe `temFiltroAplicado` | `pages/sistema/AcessosPage/components/AbaDeUsuarios/utils/temFiltroAplicado.test.ts` | repartir por describe (do #55) | Mover sistema |
| `pages/acessos/AbaDeGrupos.tsx` | `pages/sistema/AcessosPage/components/AbaDeGrupos/AbaDeGrupos.tsx` | mover (do #55) | Mover sistema |
| `pages/acessos/AbaDeUsuarios.tsx` (o index exporta também `ATRASO_DA_BUSCA_EM_MS`, usado pelo apoio de teste) | `pages/sistema/AcessosPage/components/AbaDeUsuarios/AbaDeUsuarios.tsx` | mover (do #55) | Mover sistema |
| `pages/acessos/FiltrosDeUsuarios.tsx` | `pages/sistema/AcessosPage/components/AbaDeUsuarios/components/FiltrosDeUsuarios/FiltrosDeUsuarios.tsx` | mover (do #55) | Mover sistema |
| `pages/acessos/LinhaDeUsuario.tsx` | `pages/sistema/AcessosPage/components/AbaDeUsuarios/components/LinhaDeUsuario/LinhaDeUsuario.tsx` | mover (do #55) | Mover sistema |
| `pages/acessos/situacaoDeUsuario.ts` (usado por `FiltrosDeUsuarios`, `LinhaDeUsuario` e `PainelDoUsuario`, todos sob `AbaDeUsuarios`) | `pages/sistema/AcessosPage/components/AbaDeUsuarios/situacaoDeUsuario.ts` | mover (do #55) | Mover sistema |
| `pages/acessos/PainelDeConvite.tsx` (aberto pela `AcessosPage`) | `pages/sistema/AcessosPage/components/PainelDeConvite/PainelDeConvite.tsx` | mover (do #55) | Mover sistema |
| `pages/acessos/SeletorDeGrupos.tsx` (usado por PainelDeConvite e PainelDoUsuario) | `pages/sistema/AcessosPage/components/SeletorDeGrupos/SeletorDeGrupos.tsx` | mover (do #55) | Mover sistema |
| `pages/acessos/ErroDoPainel.tsx` (usado por PainelDeConvite e PainelDoUsuario) | `pages/sistema/AcessosPage/components/ErroDoPainel/ErroDoPainel.tsx` | mover (do #55) | Mover sistema |
| `pages/acessos/PainelDoUsuario.tsx` (aberto pela `AbaDeUsuarios`) | `pages/sistema/AcessosPage/components/AbaDeUsuarios/components/PainelDoUsuario/PainelDoUsuario.tsx` | mover (do #55) | Mover sistema |
| `pages/acessos/PainelDoUsuario.dom.test.tsx` | `.../AbaDeUsuarios/components/PainelDoUsuario/PainelDoUsuario.dom.test.tsx` | mover (do #55) | Mover sistema |
| `pages/acessos/CampoDeMotivo.tsx` (só `PainelDoUsuario`) | `.../PainelDoUsuario/components/CampoDeMotivo/CampoDeMotivo.tsx` | mover (do #55) | Mover sistema |
| `pages/acessos/AvisoDeAtencao.tsx` (`PainelDoUsuario` e `CampoDeMotivo`) | `.../PainelDoUsuario/components/AvisoDeAtencao/AvisoDeAtencao.tsx` | mover (do #55) | Mover sistema |
| `pages/acessos/AcoesDeAcessos.dom.test.tsx` (percorre a página com os dois painéis) | `pages/sistema/AcessosPage/AcoesDeAcessos.dom.test.tsx` | mover (do #55) | Mover sistema |
| `pages/acessos/comandosDeAcessos.ts` | `pages/sistema/AcessosPage/comandos.ts` | mover (do #55) | Mover sistema |
| `pages/acessos/comandosDeAcessos.test.ts` | `pages/sistema/AcessosPage/comandos.test.ts` | mover (do #55) | Mover sistema |
| `pages/acessos/focarTitulo.ts` (`AcessosPage` e `AbaDeUsuarios`) | `pages/sistema/AcessosPage/utils/focarTitulo.ts` | mover (do #55) | Mover sistema |
| `pages/acessos/mensagemDeErroDeAcessos.ts` (consumidor: `useAcaoNoUsuario`) | `pages/sistema/AcessosPage/utils/mensagemDeErro.ts` | mover (do #55) | Mover sistema |
| `pages/acessos/mensagemDeErroDeAcessos.test.ts` | `pages/sistema/AcessosPage/utils/mensagemDeErro.test.ts` | mover (do #55) | Mover sistema |
| `pages/acessos/textosDeAcessos.ts`: `AVISO_DE_VERSAO_DESATUALIZADA` (usado por `useAcaoNoUsuario` e `mensagemDeErro`, ambos de `AcessosPage`) | `pages/sistema/AcessosPage/constantes.ts` | repartir por export (do #55) | Mover sistema |
| `pages/acessos/textosDeAcessos.ts`: `CONVITE_REGISTRADO` e `AJUDA_DE_GRUPOS_DO_CONVITE` (só `PainelDeConvite`) | `pages/sistema/AcessosPage/components/PainelDeConvite/constantes.ts` | repartir por export (do #55) | Mover sistema |
| `pages/acessos/textosDeAcessos.ts`: `AVISO_LGPD_DO_MOTIVO` e `LIMITE_DO_MOTIVO` (só `CampoDeMotivo`) | `.../PainelDoUsuario/components/CampoDeMotivo/constantes.ts` | repartir por export (do #55) | Mover sistema |
| `pages/acessos/textosDeAcessos.ts`: `MOTIVO_OBRIGATORIO` (só `PainelDoUsuario`) | `.../AbaDeUsuarios/components/PainelDoUsuario/constantes.ts` | repartir por export (do #55) | Mover sistema |
| `pages/acessos/useAcaoNoUsuario.ts` (`PainelDeConvite` e `PainelDoUsuario`) | `pages/sistema/AcessosPage/hooks/useAcaoNoUsuario.ts` | mover (do #55) | Mover sistema |
| `pages/acessos/useFocoNoPrimeiroCampoInvalido.ts` (do #55; os dois painéis) | `pages/sistema/AcessosPage/hooks/useFocoNoPrimeiroCampoInvalido.ts` | mover (do #55) | Mover sistema |
| `lib/chaveDeIdempotencia.ts`: `useChaveDeIdempotencia` (PR #55; hook React, que `lib/` não pode ter) | `pages/sistema/AcessosPage/hooks/useChaveDeIdempotencia.ts` | repartir por export (do #55) | Mover sistema |
| `lib/chaveDeIdempotencia.ts`: `criarGuardiaoDeChave`, `GuardiaoDeChave` e `GeradorDeChave` (PR #55; função pura) | `pages/sistema/AcessosPage/utils/guardiaoDeChave.ts` | repartir por export (do #55) | Mover sistema |
| `lib/chaveDeIdempotencia.test.ts` (PR #55; testa só `criarGuardiaoDeChave`) | `pages/sistema/AcessosPage/utils/guardiaoDeChave.test.ts` | mover (do #55) | Mover sistema |
| `lib/chaveDeIdempotencia.dom.test.tsx` (PR #55) | `pages/sistema/AcessosPage/hooks/useChaveDeIdempotencia.dom.test.tsx` (`.dom.test.tsx` porque usa JSX, seção 8.1 do Documento 8; nome final no merge, seção 14 deste anexo) | mover (do #55) | Mover sistema |
| `lib/useValorComAtraso.ts` (único consumidor: `AbaDeUsuarios`) | `pages/sistema/AcessosPage/components/AbaDeUsuarios/hooks/useValorComAtraso.ts` | mover | Mover sistema |
| `lib/formato.ts`: `FUSO_DA_CASA`, `DATA_E_HORA`, `formatarDataHora` (único consumidor: `LinhaDeUsuario`) | `pages/sistema/AcessosPage/components/AbaDeUsuarios/components/LinhaDeUsuario/utils/formatarDataHora.ts` | repartir por export | Mover sistema |
| `lib/formato.test.ts`: describe de `formatarDataHora` (entra com o #58) | `.../LinhaDeUsuario/utils/formatarDataHora.test.ts` | repartir por describe | Mover sistema |

### 12.2 Divisões

| Origem | Destino | Ação | Etapa |
|---|---|---|---|
| `AcessosPage.tsx`: `Aba`, `ROTULO_DA_ABA`, abas por permissão (do #55) | `AcessosPage/constantes.ts` e `utils/abasVisiveis.ts` (+ teste) | dividir | Dividir sistema, Meu perfil e entrada |
| `AbaDeUsuarios.tsx`: `semRepetidos`; `ATRASO_DA_BUSCA_EM_MS` (do #55) | `AbaDeUsuarios/utils/semRepetidos.ts` (+ teste); `AbaDeUsuarios/constantes.ts` | dividir | Dividir sistema, Meu perfil e entrada |
| `AbaDeGrupos.tsx`: `CartaoDeGrupo` (do #55) | `AbaDeGrupos/components/CartaoDeGrupo/` | dividir | Dividir sistema, Meu perfil e entrada |
| `AuditoriaPage.tsx`: `hora`, `dia`, `MS_MINUTO`, `rotularDia`; `Acesso`, `ContrapesoDaGovernanca`, `GrupoDeAcesso`, `agruparAcessos`, `rajada`, `GrupoDeAcessos`, `LinhaDeAcesso` | `AuditoriaPage/utils/instante.ts` (+ teste); `components/Acesso/` (+ `components/{ContrapesoDaGovernanca, GrupoDeAcessos (+ components/LinhaDeAcesso)}`, `utils/{agruparAcessos, rajada}.ts` com testes) | dividir | Dividir sistema, Meu perfil e entrada |
| `AuditoriaPage.tsx`: `Visao`, `Agrupamento`, `TODOS`; `mocks/auditoria.ts`: `FEICAO`, `EXIGE_REGISTRO_EXTRA`, `CONTEXTO_ROTULO` | `AuditoriaPage/constantes.ts` e `tipos.ts` | dividir | Dividir sistema, Meu perfil e entrada |
| `AuditoriaPage.tsx`: `Trilha`, `NotaDeImutabilidade`, `LinhaDaTrilha`, `RodapeDaTrilha`; `mocks/auditoria.ts#autoresDaTrilha` | `AuditoriaPage/components/Trilha/` (+ `components/{NotaDeImutabilidade, LinhaDaTrilha, RodapeDaTrilha}`, `utils/autoresDaTrilha.ts`) | dividir | Dividir sistema, Meu perfil e entrada |

---

## 13. `pages/transversal/`

### 13.1 Telas, mocks e fluxo de entrada

| Origem | Destino | Ação | Etapa |
|---|---|---|---|
| `pages/painel/PainelPage.tsx` | `pages/transversal/PainelPage/PainelPage.tsx` | mover | Mover transversal |
| `pages/painel/GraficoEstoque.tsx` | `pages/transversal/PainelPage/components/GraficoEstoque/GraficoEstoque.tsx` | mover | Mover transversal |
| `pages/painel/GraficoResultado.tsx` (desce para `CarrosselDeCerimonias/components/` na divisão do Painel) | `pages/transversal/PainelPage/components/GraficoResultado/GraficoResultado.tsx` | mover | Mover transversal |
| `mocks/cerimonias.ts` | `pages/transversal/PainelPage/mocks/cerimonias.ts` | mover | Mover transversal |
| `mocks/estoque.ts` (único consumidor: `GraficoEstoque`) | `pages/transversal/PainelPage/components/GraficoEstoque/mocks/estoque.ts` | mover | Mover transversal |
| `mocks/sessao.ts`: `competenciaAnterior` | `pages/transversal/PainelPage/mocks/resumoFinanceiro.ts` | repartir por export | Mover transversal |
| `mocks/financeiro.ts`: `saldoEmCaixa`, `saldoEmBanco`, `saldoConsolidado`, `movimentoDoMes`, `remessasEmLote` | `pages/transversal/PainelPage/mocks/resumoFinanceiro.ts` | repartir por export | Mover transversal |
| `pages/perfil/MeuPerfilPage.tsx` | `pages/transversal/MeuPerfilPage/MeuPerfilPage.tsx` | mover | Mover transversal |
| `pages/perfil/MeuPerfilPage.dom.test.tsx` | `pages/transversal/MeuPerfilPage/MeuPerfilPage.dom.test.tsx` | mover | Mover transversal |
| `pages/entrada/Aviso.tsx`: `Aviso` (único consumidor: `MensagemDeEntradaNaTela`) | `pages/transversal/entrada/components/MensagemDeEntradaNaTela/components/Aviso/Aviso.tsx` | repartir por export | Mover transversal |
| `pages/entrada/Aviso.tsx`: `TomDeAviso` (tipo de `MensagemDeEntrada`, do fluxo) | `pages/transversal/entrada/tipos.ts` | repartir por export | Mover transversal |
| `pages/entrada/EntrarPage.tsx` | `pages/transversal/entrada/EntrarPage/EntrarPage.tsx` | mover | Mover transversal |
| `pages/entrada/MensagemDeEntradaNaTela.tsx` | `pages/transversal/entrada/components/MensagemDeEntradaNaTela/MensagemDeEntradaNaTela.tsx` | mover | Mover transversal |
| `pages/entrada/mensagens.ts`: `MensagemDeEntrada` (tipo, usado por `EntrarPage` e `MensagemDeEntradaNaTela`) | `pages/transversal/entrada/tipos.ts` | repartir por export | Mover transversal |
| `pages/entrada/mensagens.ts`: `MENSAGENS_DE_RECUSA`, `MENSAGEM_DE_INDISPONIBILIDADE`, `MENSAGEM_DE_FALHA`, `MENSAGEM_DE_FALHA_AO_INICIAR` (só `EntrarPage` em produção) | `pages/transversal/entrada/EntrarPage/constantes.ts` | repartir por export | Mover transversal |
| `pages/entrada/mensagens.ts`: `MENSAGEM_DE_ERRO_NO_RETORNO` (só `RetornoPage`) | `pages/transversal/entrada/RetornoPage/constantes.ts` | repartir por export | Mover transversal |
| `pages/entrada/RetornoPage.tsx` | `pages/transversal/entrada/RetornoPage/RetornoPage.tsx` | mover | Mover transversal |

### 13.2 Divisões e composições

| Origem | Destino | Ação | Etapa |
|---|---|---|---|
| `PainelPage.tsx`: `rotuloLabel`, `numeroGrande`, `LinhaDeSaldo`, cartão de saldo; `ColunaDeMovimento`, movimento do mês; aviso de lote; `PAINEIS`, `SetaDoCarrossel`, `ItemDeMeta`, `ResumoDaProxima`, `BlocoDoResumo`, `ResumoDaUltima`, `ValorDaUltima`; carrossel | `PainelPage/components/CartaoDeSaldo/` (+ `components/LinhaDeSaldo`); `MovimentoDoMes/` (+ `components/ColunaDeMovimento`); `AvisoDeLote/` (vira fila de trabalho quando existir); `CarrosselDeCerimonias/` (+ `constantes.ts`, `components/{SetaDoCarrossel, ItemDeMeta, ResumoDaProxima (+ components/BlocoDoResumo), ResumoDaUltima (+ components/ValorDaUltima), GraficoResultado}`) | dividir | Dividir Painel |
| `GraficoEstoque.tsx`: `derivar`, `BASE`, `TOPO_PLOT`, `ESCALA`, `LARGURA_BARRA`, `PASSO_X`, `ESCALA_Y`, `Retangulo`, `RotuloDaBarra` | `GraficoEstoque/utils/derivarEstoque.ts` (+ teste) e `constantes.ts` | dividir | Dividir Painel |
| `GraficoResultado.tsx`: `y`, `x`, `TOPO`, `ALTURA`, `MAX`, `MIN` | `CarrosselDeCerimonias/components/GraficoResultado/utils/escala.ts` (+ teste) | dividir | Dividir Painel |
| `GraficoEstoque.tsx` (eixo de cerimônias) + `GraficoResultado.tsx` (eixo de cerimônias) | `PainelPage/components/EixoDeCerimonias/` | fundir | Composições de domínio |
| `MeuPerfilPage.tsx`: `PerfilDoEu`, `PerfilDoEuProps`, `Cartao`, `Leitura` (somem com os primitivos `Cartao` e `Leitura` do `ds` na etapa de primitivos novos) | `MeuPerfilPage/components/PerfilDoEu/` (+ `components/{Cartao, Leitura}`) | dividir | Dividir sistema, Meu perfil e entrada |
| `EntrarPage.tsx`: `useInicioDaEntrada`; `mensagemDoEstado`, `DESCRICAO_DA_ENTRADA` | `EntrarPage/hooks/useInicioDaEntrada.ts`; `utils/mensagemDoEstado.ts` (+ teste); `constantes.ts` | dividir | Dividir sistema, Meu perfil e entrada |
| `RetornoPage.tsx`: `useConclusaoDoRetorno`, `SituacaoDoRetorno` | `RetornoPage/hooks/useConclusaoDoRetorno.ts` | dividir | Dividir sistema, Meu perfil e entrada |

---

## 14. Pendências do mapeamento

- **Testes de hook da `AcessosPage`.** O teste de `useChaveDeIdempotencia` que o #55 traz é `.dom.test.tsx` porque usa JSX, o que a convenção admite (Documento 8, seção 8.1). Na main ficam `lib/chaveDeIdempotencia.dom.test.tsx`, que acompanha o hook, e `lib/chaveDeIdempotencia.test.ts`, que testa a função pura `criarGuardiaoDeChave` e vai com ela para `utils/guardiaoDeChave.test.ts`.
- **Nomes de arquivo nas divisões.** São propostos. A etapa confere no código da época e pode ajustar o nome, nunca a posse.
- **Mocks com destinos em mais de uma etapa.** `mocks/sessao.ts`, `mocks/financeiro.ts` e `mocks/lancamentos.ts` se repartem em etapas diferentes. Cada parte aparece na linha da própria etapa.
- **Fábrica `fontesDaSessao`.** É opcional, como indicado na linha de `main.tsx` (seção 6 deste anexo).
- **#55 mesclado.** Mesclado em 09/10/2026 (`1812df6`). `ErroDoPainel`, `AvisoDeAtencao`, `useFocoNoPrimeiroCampoInvalido` e `ds/TextField.dom.test.tsx` estão na main. `app/apoioDeTeste.tsx` importa `JANELA_DE_FRESCOR_EM_MS` de `dados/clienteDeConsultas.ts`, fora do barrel: a linha de `dados/index.ts` (seção 2) o reexporta.
- **`EstadoDaAnamnese` e `StatusAnamnese`.** O tipo de UI (`em dia`, `vencida`, `ausente`) não é o `StatusAnamnese` de `@cdd/contracts` (`PENDENTE`, `OK`, `VENCIDA`, `NAO_APLICAVEL`). O mapeamento não existe no código e entra quando a tela ligar no backend.
- **`gerarHash`.** Tratado como função falsa da demonstração, que fica no mock (`mocks/prestacao.ts`), e não como regra de domínio: é um hex aleatório (`mocks/prestacao.ts:180-181`), sem regra de negócio.
- **`AgendaPage.tsx:53`.** Decidido: só inteiros (Documento 8, seção 15). Ver a seção 3.1.
- **Iniciais.** O `AppShell` e o Meu perfil calculam iniciais de jeitos diferentes. Ver a seção 14 do Documento 8 antes de adotar o `Avatar` no `AppShell` (seção 4.3).
- **Apoios de teste repetidos.** Helpers iguais entre telas (`usarDensidade`, `fixarDensidade`, `definirDensidade`, `campoRotulado`, `textosDasFolhas` e outros) são consolidados depois que as seis caracterizações (#82 a #87) entrarem. O stub de `matchMedia` chega a `src/testes/configurarDom.ts` (Doc 8, §8.2) na etapa "testes/ global e setupFiles", com o corpo de hoje, sem ouvintes. O corpo passa à versão com ouvintes, a única que alcança a troca de densidade, no PR de consolidação dos apoios, fora de etapa de mover. Os helpers de consulta ainda não têm destino em §8.2 e ficam em aberto até a consolidação.
