# Sistema de Gestão — Céu do Despertar (CDD)

## Documento 6 — Plano do Backend

**Versão 1.1** · setembro/2026 · Status: proposta

> **1.1** — conferido contra o código depois das 13 telas da etapa F. **Números:** telas e itens (§1.1, §1.3), percursos (§1.4), camada de dados e estados (§2.4), o que resta da etapa F (§6), riscos e resumo (§10, §11); §1.2 fica como retrato da re-análise. **Conteúdo:** as divergências de §2.3 constam como decididas (§2.1, §2.3, §2.5), com onde cada decisão já está no esquema, no contrato e nas telas; as telas que misturam fronteiras passam a ser cinco, e o dado de saúde aparece também no Painel e no detalhe da cerimônia (§2.2); read model por bloco de tela no lugar de "um por tela e por grupo" (§5, §7); B1, B2, B4 e B5 acertados com as decisões de §2.5, §2.5.1 e §2.6; em §9.2, a #10 e a #13 resolvidas e a devolução como estorno e o colchonete listados entre as abertas.

> Pressupõe os Documentos 1 (Arquitetura), 2 (Modelo de Domínio v2.2), 3 (Identidade e Acesso v2.2) e 4 (Mapa de Telas v2.2).
> Onde este documento divergir daqueles, **prevalecem aqueles** — salvo nas decisões registradas aqui em setembro/2026: a tela única com autorização por bloco (§2.2, contra Doc 1 §8.1 e Doc 4 §10), as quatorze divergências de §2.3, decididas em §2.5, e as duas premissas revistas em §2.6 (autoinscrição pelo link e remoção da `P-06`). A devolução como estorno (§2.5.1) é proposta, ainda à espera da coordenação (§9.2).

Este documento faz duas coisas: **§1 e §2** dizem onde o projeto está de fato, comparando o que foi construído com o que os quatro documentos especificam; **§3 em diante** organiza a construção do backend.

> **Continua no [Documento 7 — Backend: arquitetura, banco de dados e plano de construção](CDD-07-backend-arquitetura-e-banco.md)**, que detalha a forma do servidor, o desenho completo do banco (com esquema SQL executável e verificação) e o que cada etapa de §6 entrega em tabela, endpoint e teste.

---

# Parte I — Re-análise

## 1. Onde o projeto está

### 1.1 O que existe

| Camada | Situação |
|---|---|
| Monorepo pnpm (`apps/web`, `packages/contracts`) | ✅ conforme Doc 1 §4.5 |
| Design system em TSX (27 componentes e um hook, tokens fiéis ao export) | ✅ |
| Telas implementadas | 30 (25 internas + 4 de entrada + 1 pública de inscrição) |
| `packages/contracts` | 8 arquivos, ~1.240 linhas de tipos — ver §2.4 |
| Camada de dados | ❌ **inexistente** — ver §2.4 |
| Backend | ❌ nada |
| Testes | ❌ nenhum |
| CI, lint, ADRs | ❌ nenhum |

### 1.2 Cobertura do inventário de telas (Doc 4)

O Doc 4 cataloga **68 telas**. Na re-análise, o protótipo tinha 13 telas internas, que cobriam **31 desses itens** — não uma a uma: várias telas do documento foram **fundidas** numa só do protótipo. Isso é bom para navegar e ruim para autorizar — ver §2.2. *Esta seção é o retrato daquele momento; o estado atual está em §1.3.*

| Módulo | Doc 4 | Telas do protótipo | Itens cobertos | Ausentes |
|---|:--:|:--:|---|:--:|
| Transversais (T) | 5 | 2 | `T-01` (entrada) · `T-04` (Meu perfil) | 3 |
| Financeiro (F) | 26 | 7 | `F-01`+`F-06` → Registrar lançamento · `F-02` → Meus registros · `F-03` → Verificação de lote · `F-04`+`F-05` → Lançamentos · `F-07`+`F-08`+`F-14` → Contas e fundo · `F-17`+`F-18`+`F-19` → Relatórios · `F-22`+`F-23` → Fechamento | 12 |
| Pessoas (P) | 10 | 2 | `P-01`+`P-02`+`P-03`+`P-04` → Pessoas · `P-07` → Anamnese | 5 |
| Eventos (E) | 15 | 1 | `E-01`+`E-02`+`E-03`+`E-05`+`E-14` → Agenda | 10 |
| Estoque (S) | 8 | 1 | `S-01`+`S-02`+`S-03` → Ayahuasca | 5 |
| Sistema (A) | 4 | 1 | `A-01`+`A-02` → abas de Pessoas | 2 |

**Ausências que importam para o backend**, porque são fluxos inteiros e não detalhes de tela: adiantamento e ressarcimento (`F-11`–`F-13`), faturas de cartão (`F-09`), empréstimos (`F-10`), importação e conciliação (`F-25`, `F-26`), prestação de contas (`F-24`), plano de contas e unidades (`F-15`, `F-16`), devoluções (`E-08`, `E-09`), leitos e refeições (`E-10`, `E-11`), contratação da Munay (`E-13`), feitio e consumo real (`S-04`, `S-05`), auditoria (`A-04`). Todas viraram tela na etapa F, menos três que o remapeamento de §1.3 fez modal ou bloco: `E-08`, `E-11` e `S-05`.

### 1.3 Remapeamento sob a diretriz de tela única

**Diretriz (setembro/2026):** não se constrói uma tela por grupo de acesso. A tela é uma só, e a
autorização é **por bloco, resolvida no backend** — quem não tem a permissão não recebe o bloco.

Isso muda a conta. Boa parte dos 68 itens do Doc 4 existia porque o mesmo objeto precisava de duas
telas para dois grupos; sob a nova diretriz esses itens **colapsam em blocos** da mesma tela. Outros
sempre foram gaveta, modal ou estado, e nunca precisaram de rota própria.

Percorrendo os 68 itens um a um:

| Destino | Qtde | O que é |
|---|:--:|---|
| ✅ Telas construídas | 26 | cobrem 49 itens — 30 das telas originais e 19 das novas, contando a `P-06` como substituída pela inscrição pelo link. O 50º item em tela, `T-01`, fica com as quatro telas de entrada, fora desta conta. Três deles têm lugar na tela e ainda não têm a função: `P-02`, `P-04` e `E-14` (§6) |
| 🆕 Telas a construir | 0 | — |
| Modais e folhas | 7 | atos curtos dentro de uma tela existente |
| Blocos em telas existentes | 10 | 9 são itens do Doc 4; o décimo — pendências em Meus registros e Verificação de lote — é comportamento de `F-02`/`F-03`. Inclui os que a autorização por bloco passa a governar |
| Comportamento do shell | 2 | unidade ativa (`T-03`) e estado sem-permissão (`T-05`) |

**O inventário fecha em 26 telas** — 25 internas e a pública de inscrição, todas de pé — para os mesmos 68 itens: 50 em tela (49 nas 26 telas e o `T-01` nas quatro de entrada — login, convite, esqueci e redefinir a senha —, que não entram na contagem de telas), 7 em modal, 9 em bloco e 2 no shell. O que resta da etapa F são modais, blocos em telas existentes e comportamentos do shell, listados abaixo, os três itens em tela ainda sem função e as correções de modelo que as telas não receberam (§2.5, *Onde cada decisão já está*). A situação de cada um está em §6.

#### As 13 telas que faltavam, e foram construídas

| # | Tela | Cobre | Módulo |
|:--:|---|---|---|
| 1 | Faturas de cartão | `F-09` | Financeiro |
| 2 | Empréstimos | `F-10` | Financeiro |
| 3 | Adiantamentos e reembolsos | `F-11` `F-12` `F-13` | Financeiro |
| 4 | Prestação de contas | `F-24` | Financeiro |
| 5 | Conciliação e importação de extrato | `F-25` `F-26` | Financeiro |
| 6 | Parâmetros — categorias, unidades, instituição | `F-15` `F-16` `A-03` | Financeiro · Sistema |
| 7 | Auditoria | `A-04` | Sistema |
| 8 | Inscrição pelo link da cerimônia — autocadastro e anamnese | *(substitui `P-06`)* | Pessoas · Eventos |
| 9 | Inscrição | `E-06` | Eventos |
| 10 | Devoluções a pagar | `E-09` | Eventos |
| 11 | Leitos — mapa e cadastro | `E-10` `E-15` | Eventos |
| 12 | Contratações da Munay | `E-13` | Eventos |
| 13 | Feitio | `S-04` | Estoque |

Todas concluídas em setembro/2026, com verificação em navegador nas duas densidades. Três levantaram divergência de modelo pelo caminho — a devolução como estorno (§2.5.1), a anamnese respondida pela própria pessoa e a autoinscrição (§2.6) —, e uma trouxe conceito novo, a declaração de veracidade por cerimônia.

#### Modais e folhas

`E-07` marcar pagamento · `E-08` cancelar inscrição e solicitar devolução · `E-12` acolhimento de
primeira vez · `S-05` registrar consumo real · `P-08` autorização de responsável · `P-09`
consentimento · `P-10` anonimização.

#### Blocos a acrescentar em telas que já existem

Fila de trabalho no Painel · pendências em Meus registros e Verificação de lote · leitura e parecer de
anamnese na ficha da pessoa (`P-05`) · resultado financeiro do evento com bloco governado por
permissão (`E-04`) · demanda de refeições (`E-11`) · estimativa × saldo (`S-06`) · estimado ×
realizado (`S-07`) · custo por litro (`S-08`, ✅ na tela de Feitio) · resultado por fornecedor
(`F-20`) · faturamento × teto (`F-21`, ✅ em Contratações e Parâmetros).

### 1.4 O que o protótipo provou

Na re-análise, o protótipo percorria **um e meio** dos cinco percursos críticos do Doc 4 §11, e os percursos 3, 4 e 5 não existiam em tela alguma. Com as telas da etapa F, todos avançaram, e **nenhum está completo**:

| # | Percurso | O que já tem tela | O que falta |
|:--:|---|---|---|
| 1 | Do gasto ao DRE | Registro, verificação de lote, conciliação (`F-25`, `F-26`), relatórios, fechamento | A ida e volta da pendência (`F-03` pergunta, `F-02` responde) e a fila no Painel |
| 2 | Da chegada ao pagamento | Inscrição pela recepção (`E-06`) e pelo link, com a anamnese respondida pela pessoa | Leitura e parecer da anamnese (`P-05`), acolhimento de primeira vez (`E-12`, hoje um booleano na inscrição), marcar pagamento (`E-07`) |
| 3 | Da falta à devolução | A metade financeira: `E-09` paga e estorna a receita, na competência corrente quando a original está fechada | Cancelar e solicitar a devolução (`E-08`) e o item na fila |
| 4 | Do adiantamento ao ressarcimento | Quase todo, numa tela só (`F-11`–`F-13`): registrar, autorizar com a recusa de dois eixos (A1), ressarcir por transferência | O item da Governança na fila do Painel |
| 5 | Do "dá?" ao consumo real | Só a decisão de fazer: Feitio (`S-04`), com a comparação com comprar de fora | Estimativa × saldo (`S-06`, hoje uma reserva — o modelo que a decisão 10 rejeitou), realizar o evento (`E-14` — a Agenda só edita, duplica e cancela), consumo real (`S-05`), estimado × realizado (`S-07`) |

Os percursos 2, 3 e 4 são os que provam as fronteiras de permissão, e a fronteira ainda não existe em tela alguma: na `E-09`, *"o Acolhimento não vê esta tela"* é um comentário; na `F-11`, a perspectiva é um seletor de demonstração. E entre as telas não há percurso navegável: além do menu, as únicas ligações são o atalho do Painel para a Verificação de lote e os botões do checklist do Fechamento.

---

## 2. O que a re-análise encontrou

### 2.1 A inversão que o método produziu

O Doc 1 §8.1 previu design → front → back, e prometeu que a interface exigiria precisão que a prosa deixara implícita. Isso aconteceu — o Doc 4 §14.3 registra duas invariantes (L10, L11) nascidas do desenho de tela. Mas aconteceu também o inverso, e é o que esta re-análise traz de novo: **o protótipo tomou quatorze decisões de modelo que o domínio não autorizou**. Não são erros de quem desenhou; são perguntas que o desenho fez e que ninguém respondeu, porque não havia backend para reclamar.

Elas estão em §2.3, e a maioria precisava de decisão **antes** da etapa B1. Todas foram respondidas em setembro/2026 — ver §2.5.

### 2.2 Tela única com autorização por bloco

O Doc 4 §10 listava, entre as telas que deliberadamente não existem, a *"tela única de evento com campos ocultos por perfil"*, e o Doc 1 §8.1 mandava desenhar uma tela por grupo de acesso.

**Essa diretriz foi revista em setembro/2026**, com três razões declaradas: quem hoje opera apenas eventos é um grupo pequeno e de confiança conhecida; duplicar telas por grupo custa mais que resolver a permissão por bloco; e a filtragem no backend esconde a informação por completo, não parcialmente.

A revisão é compatível com o Doc 3 §10.2 — *"read model que o usuário não pode ver não é consultado"* — **desde que a composição seja por bloco**:

| O que vale | O que não vale |
|---|---|
| A tela pede N blocos; o backend devolve só os que a permissão autoriza | A tela pede tudo e esconde o que não pode mostrar |
| O bloco negado **não existe na resposta** | O bloco vem no DTO com uma marca `visivel: false` |
| O front desenha o que chegou | O front tem layout fixo e aplica `display:none` |
| Cada bloco é um read model com sua permissão | Um read model gordo servindo todos os grupos |

A diferença não é de estilo. Na primeira coluna, um endpoint de exportação esquecido não vaza nada, porque o dado nunca foi buscado. Na segunda, vaza — e é exatamente a classe de bug que o Doc 3 §10.2 existe para impedir.

**As telas que hoje misturam fronteiras** — três do protótipo original e duas da etapa F — deixam de ser erro e passam a ser o caso de teste da nova diretriz: são elas que provam se a autorização por bloco foi implementada como omissão ou como ocultação.

| Tela | Mistura | Consequência |
|---|---|---|
| **Agenda → detalhe da cerimônia** | Arrecadação (Eventos) **e** custo previsto × lançado, resultado, contribuições recebidas (Financeiro) **e** pontos de atenção da anamnese por participante | O Acolhimento não pode ver custo (T2 → 403). Como está, a tela inteira é inacessível a ele — ou vaza. |
| **Painel** | Saldo consolidado, movimento do mês, resultado por cerimônia, fila de lote **e** pontos de atenção da anamnese por participante | Só `TESOURARIA`/`GOVERNANCA`/`ADMIN` podem abrir. Não há painel para `ACOLHIMENTO`, `REGISTRO` nem `LEITURA`. |
| **Pessoas → ficha** | Cadastro (`pessoa.ler`) **e** pontos de atenção da anamnese (`anamnese.ler`) | Ver §2.3, divergência 8 — é vazamento de dado de saúde. |
| **Feitio** (`S-04`, etapa F) | Feitio e matéria-prima (Estoque) **e** custo por litro calculado dos lançamentos (`S-08`, Financeiro) | Qual permissão governa o bloco é a Q4 (§9.2 #12); até ela ser respondida, o bloco não tem dono. |
| **Contratações** (`E-13`, etapa F) | Contratações e recebimentos (Eventos) **e** faturamento × teto (`F-21`, Financeiro) | O teto lê o faturamento do Financeiro: tem de chegar como bloco com permissão do Financeiro, não junto com a contratação. |

Nas três primeiras, **o dado de saúde continua sendo defeito** mesmo sob a nova diretriz. Na ficha de pessoa o caso é estrutural: `pontosDeAtencao` não é um bloco a mais na resposta, é um campo dentro do read model de pessoa. Enquanto for campo, quem tem `pessoa.ler` recebe dado de saúde e a leitura não deixa rastro (RA3). A correção é extrair o bloco de anamnese para um read model próprio, com sua permissão e seu registro de acesso — ver §2.3 #8, acatada. No Painel e no detalhe da cerimônia, os pontos de atenção aparecem por participante, com nome, e vale a mesma correção: o dado vem do bloco de anamnese, com sua permissão e seu registro de acesso, ou não vem.

Tirado esse dado, o detalhe da cerimônia e o Painel — e, da etapa F, Feitio e Contratações — passam a ser o caso de teste da composição por bloco.

### 2.3 Divergências entre o protótipo e o modelo de domínio

Cada linha era uma decisão pendente. A coluna *Recomendação* é minha; as decisões tomadas estão em §2.5.

| # | Onde | O protótipo faz | O Doc 2 manda | Recomendação |
|:--:|---|---|---|---|
| 1 | `Lancamento.categoriaIds[]` | Várias categorias por lançamento (chat 3) | **Uma** `categoriaId`, portadora da `natureza` (L3, C2) | **Nem um nem outro: itens de lançamento.** Um lançamento com N linhas, cada uma com categoria e valor. Resolve o valor composto real (*"65+70 recarga extintor e suporte"*, Anexo A regra 11) e preserva L3, que a lista de categorias quebra — duas categorias de naturezas opostas no mesmo lançamento não têm natureza definível. |
| 2 | `Lancamento.grupo` + `unidadeId` | Dois campos: "Grupo" (Lojinha, Dormitório, Chácara, CDD, Cozinha, Secretaria) e unidade | `Unidade` **é** o que a planilha chama de Grupo (§1.1) | **Fundir.** São o mesmo conceito duplicado. Decidir se Cozinha e Secretaria viram unidades (centros de custo) ou categorias. A tesouraria decide; o padrão razoável é unidade. |
| 3 | `TipoLancamento = ENTRADA \| SAIDA \| TRANSFERENCIA` | Transferência é um tipo de lançamento | `Transferencia` é **agregado próprio**; T1: não afeta resultado | **Manter o seletor na tela, separar na API.** Dois endpoints, dois agregados. Se transferência virar lançamento no banco, o resultado do período fica errado — que é o bug que o sistema existe para consertar. |
| 4 | Conferência | Aprovar ou devolver com motivo (texto livre) | `Pendencia` endereçada, com L10 e L11 | **Implementar `Pendencia`.** É a decisão Q1 do Doc 4 e o único caminho de volta que impede a conversa de migrar para o WhatsApp. Exige mudança em Meus registros e Verificação de lote. |
| 5 | `StatusEvento` | `PLANEJADO \| CONFIRMADO \| REALIZADO \| CANCELADO` | `PLANEJADO \| INSCRICOES_ABERTAS \| INSCRICOES_ENCERRADAS \| REALIZADO \| CANCELADO` | **Adotar o do Doc 2.** EV6 (inscrição só com inscrições abertas) não é verificável sem esses estados. |
| 6 | Contribuição | Lista de valores sugeridos (40/60/90) | `TabelaDeContribuicao`: base + adicional de hospedagem/dia + adicional de refeição + isenções | **As duas coisas.** A tabela calcula o devido (IN7); os valores sugeridos são a apresentação disso a quem contribui. Sem a tabela, hospedagem e refeição deixam de ser cobradas e a operação do evento perde a base de cálculo. |
| 7 | `Papel` | Inventou `MEMBRO`, `FREQUENTADOR`, `VISITANTE`; perdeu `ACOLHIMENTO`, `VOLUNTARIO`, `PARTICIPANTE`, `APOIADOR` | Lista fechada do §3.2 | **Separar dois eixos.** "Membro/frequentador/visitante" é **grau de vínculo com a casa**, não papel — vale como campo próprio. Os papéis perdidos voltam à lista. |
| 8 | `Pessoa.pontosDeAtencao` no diretório | Pontos de atenção da anamnese no cadastro | Diretório **sem dado de saúde** (§3.7); leitura registra acesso (RA3) | **Remover do read model de pessoa.** Como está, a Tesouraria — que tem `pessoa.ler` e não `anamnese.ler` — lê dado de saúde, e a leitura não gera registro de acesso. É o vazamento mais grave encontrado. |
| 9 | `Inscricao` | Sem contato de emergência, sem restrições alimentares, sem refeições, sem dias de hospedagem, sem responsável de menor | IN2, IN4 — obrigatórios **sempre**, inclusive para quem não consagra | **Acrescentar.** IN4 é a única obrigatoriedade dura do fluxo de inscrição e hoje não existe em campo algum. |
| 10 | Estoque | `ReservaDeEstoque` (reservado × livre) | Não existe reserva; existe `EstimativaDeConsumo`, que **nunca** move saldo (EC1) | **Trocar por estimativa.** A reserva é um saldo paralelo que ninguém baixa — o caminho curto para o estoque mentir. |
| 11 | `OrigemLancamento` | `COMPROVANTE_IA`, `REGISTRO_RAPIDO`, `MIGRACAO` | `INTEGRACAO_EVENTOS`, `INTEGRACAO_ESTOQUE`, `IMPORTACAO_TEXTO` | **Unir as duas listas.** As do protótipo são reais (a leitura de comprovante por IA é a fila de lote); as do Doc 2 são exigidas por L8 e pela integração de pagamento. |
| 12 | `TarefaDePreparo` | Lista de preparo com **link público sem login** e webhook | Não existe no Doc 2 | **Escopo novo, e não é pequeno.** Um link público é superfície de ataque e toca a LGPD se a tarefa nomear pessoas. Modelar como agregado próprio, com token de escopo único, expiração e sem dado pessoal — ou adiar. |
| 13 | Fila de trabalho (`T-02`) | Substituída pelo Painel, por decisão sua no chat 1 | É a substituta das notificações (Doc 1 §5.4) e a home de todos os grupos | **Reintroduzir como bloco, não como home.** O Painel continua sendo a entrada; a fila vira uma faixa dentro dele. Sem ela, `REGISTRO` e `ACOLHIMENTO` não têm por onde saber que algo os espera — e o sistema não tem notificação por decisão de projeto. |
| 14 | Vocabulário por regime | Uma redação só, de contribuição, em todas as telas | Unidade `COMERCIAL` exibe *venda*, *cliente*, *preço*; unidade `CONTRIBUICAO` exibe *contribuição*, *participante*, *valor sugerido* (Doc 1 §4.3) | **Ligar o que já existe.** O componente `RegimeVocabulary` está no design system e nenhuma tela o usa. A distinção tem reflexo jurídico e tributário, e a Lojinha e a Munay são comerciais — não é preciosismo de redação. |

### 2.4 Lacunas estruturais no front-end

Não são divergências de modelo; são o que falta para o front conseguir falar com um servidor.

| Lacuna | Situação | Custo de resolver depois |
|---|---|---|
| **Camada de dados** | 26 dos 27 arquivos de mock exportam **constantes síncronas**, importadas direto por 55 declarações em 37 arquivos — 25 das 30 telas: todas as internas menos Meu perfil, e a inscrição pública. Só a autenticação é assíncrona, e é o único mock que as quatro telas de entrada importam. Não há cliente HTTP nem cache. | Alto. Cada tela precisa ganhar assincronia, cache, invalidação e os estados de carregando/erro. É trabalho de tela, não de infraestrutura. |
| **Cinco estados obrigatórios** (Doc 4 §13) | Carregando e erro de infraestrutura só na entrada. Vazio em cerca de dez telas. Erro de domínio em poucos pontos — `PeriodLock` e `DomainError` em Registrar lançamento, `DomainError` em Faturas e Empréstimos, `TwoAxisGuard` em Adiantamentos, e a lista de pendências da Inscrição (`E-06`), que bloqueia a confirmação e marca cada item com a invariante que o barra —; nas outras telas, as invariantes viram texto solto, sem código. Sem-permissão em um lugar só: Registrar lançamento, que abre com `financeiro.lancamento.registrar` (Doc 4, F-01) e só grava consolidado com `financeiro.lancamento.confirmar` — sem ela, grava como a conferir (Doc 3, T13/T14). Até setembro/2026 a tela comparava o nome do grupo de uma fixture fixa, o que T28 proíbe (§3, item 3), e o estado nunca aparecia. O shell ainda não tem o estado (`T-05`). | Médio, e é onde as invariantes do Doc 2 viram texto em português — trabalho de design, não de backend. |
| **Testes e CI** | Zero. O Doc 3 §11 exige 30 casos de autorização na CI, mais T28 (lint) e T30 (metaprogramação sobre rotas). | Alto se adiado: T30 é o teste que pega o endpoint novo que alguém esqueceu de proteger. |
| **`packages/contracts`** | Cresceu com as telas: formas de agregado e de read model e o catálogo de permissões. Não tem comandos, nem erros de domínio, nem validação em tempo de execução — e boa parte das decisões de §2.5 ainda não chegou a ele (ver *Onde cada decisão já está*, em §2.5). | Médio — ver §5. |

> **Dois componentes do design system existem e nenhuma tela os usa:** `PendencyCard` e `RegimeVocabulary`. O primeiro é justamente a `Pendencia` que falta (§2.3 #4); o segundo é o vocabulário que muda com o regime da unidade — *contribuição* × *venda*, *participante* × *cliente* (Doc 1 §4.3), que o Doc 2 trata como regra e o protótipo nunca aplicou. As peças foram desenhadas; ninguém as ligou. É o sinal mais barato de que as duas regras existem no papel e não no produto.

---

### 2.5 Decisões tomadas sobre as quatorze divergências

Respondidas em setembro/2026. Onde a decisão contraria a recomendação, a razão é do domínio e está registrada.

| # | Decisão | Razão |
|:--:|---|---|
| 1 | **Manter as categorias por lançamento** | O lançamento composto detalha um pagamento único a uma pessoa: *Aline devia 100, forneceu flores (70) e ervas (50), e o CDD paga a diferença de 20.* É encontro de contas, não valor somado. **Consequência de modelo:** o contrato hoje tem `categoriaIds[]` com um único `valor`, e não representa esse caso — a etiqueta de categoria passa a carregar **valor próprio**, mantendo a tela como está. |
| 2 | **Manter "Grupo" ao lado de `Unidade`** | Decisão do usuário; a tela permanece como no protótipo. Fica registrado que o Doc 2 §1.1 os trata como o mesmo conceito, e que o relatório por unidade e o relatório por grupo vão conviver. |
| 3 | Acatada — `Transferencia` é agregado próprio | O seletor de três tipos permanece na tela; a API separa. |
| 4 | Acatada — implementar `Pendencia` | Com L10 e L11. |
| 5 | Acatada — estados do evento do Doc 2 | Volta `INSCRICOES_ABERTAS` e `INSCRICOES_ENCERRADAS`. |
| 6 | **Redefinida pelo domínio** | Ver abaixo. |
| 7 | Acatada — dois eixos para papel e vínculo | Membro / frequentador / visitante vira campo próprio. |
| 8 | Acatada — tirar dado de saúde do read model de pessoa | Bloco próprio, permissão própria, registro de acesso. |
| 9 | Acatada — inscrição com contato de emergência e restrições | IN4, obrigatório sempre. |
| 10 | Acatada — trocar reserva por estimativa | EC1: projeção não movimenta saldo. |
| 11 | Acatada — unir as listas de origem | |
| 12 | Acatada com ajuste — **a lista de preparo exige login** | Tela simplificada com as informações abertas da cerimônia e a to-do. Versão posterior. |
| 13 | Acatada — fila de trabalho como bloco do Painel | |
| 14 | **Adiada** — vocabulário por regime | Fica para versão posterior; `RegimeVocabulary` permanece no design system, sem uso. |

#### A contribuição, como ela realmente funciona (decisão 6)

Os padrinhos definem **três níveis sugeridos** para a participação na cerimônia:

| Nível | Natureza |
|---|---|
| **Valor social** | o piso sugerido |
| **Valor sustentável** | o que cobre o custo |
| **Valor próspero** | quem pode contribuir acima |

Regras que decorrem disso, e que substituem a `TabelaDeContribuicao` do Doc 2:

- Os três valores são **sugestão, nunca cobrança**. Pode ser negociado para menos conforme a condição financeira de quem participa, ou pago acima por vontade própria. `permiteValorLivre` é sempre verdadeiro, nos dois sentidos.
- Os níveis referem-se **exclusivamente à participação na cerimônia**.
- **Hospedagem é paga à parte**, por quem usa a acomodação — não entra no valor da contribuição.
- **Dormir na igreja em colchonete próprio é gratuito e não se registra.** Não é uma opção de hospedagem no sistema; é a ausência dela.
- **Alimentação só é cobrada em ocasiões especiais** — jornadas de três dias, por exemplo. Não é adicional padrão do evento.

Isso simplifica o agregado em relação ao Doc 2: nada de mapa de adicional por refeição, nada de adicional de hospedagem por dia embutido no cálculo. O evento carrega três valores sugeridos e um valor de hospedagem quando houver; o resto é acordo entre pessoas, registrado como valor efetivo da inscrição.

> **Ponto em aberto — o colchonete.** A decisão diz *"opção grátis, que não vamos registrar"*. Li isso como **não cobrar**, e mantive `COLCHONETE` como opção de hospedagem sem valor: a pergunta *"onde você vai dormir"* precisa de resposta verdadeira para quem fica, e a operação conta gente para café e espaço. Se a intenção era literalmente não existir no sistema, é uma linha a remover — e a pergunta passa a ter só "não vou dormir aqui" e as pagas. **Decisão da coordenação.**

#### Onde cada decisão já está

Conferido no código em setembro/2026. O esquema do Documento 7 já incorpora todas as que dependem de esquema; `packages/contracts` e as telas, não.

| # | Decisão | Esquema (Doc 7) | `packages/contracts` | Telas |
|:--:|---|:--:|---|---|
| 1 | Categorias com valor por etiqueta | ✅ | ❌ `categoriaIds[]` e um `valor` | ❌ categorias sem valor; o valor composto é bloqueado com a orientação de separar em dois lançamentos |
| 2 | "Grupo" ao lado de `Unidade` | ✅ | ⚠️ `grupo` convive com `unidadeId`, mas é texto livre; falta `grupoDeCustoId` (Doc 7 §18.2) | ✅ em Registrar lançamento — mas Parâmetros cadastra seis unidades e o formulário oferece duas, e não há cadastro de grupo |
| 3 | `Transferencia` como agregado | ✅ | ⚠️ o tipo existe, mas `TipoLancamento` ainda tem `TRANSFERENCIA` e `Lancamento` tem `contaDestinoId` | ✅ o seletor de três tipos, como a decisão manda; o Fechamento confere os dois lados de cada transferência do mês |
| 4 | `Pendencia` | ✅ | ❌ | ❌ devolver é texto livre; `PendencyCard` segue sem uso |
| 5 | Estados do evento do Doc 2 | ✅ | ❌ `StatusEvento` ainda com `CONFIRMADO` | ❌ a Agenda ainda usa os quatro estados antigos (planejada, confirmada, realizada, cancelada); no link, só um booleano de inscrições abertas |
| 6 | Três níveis e hospedagem à parte | ✅ | ⚠️ os tipos novos existem; `Evento` ainda tem `contribuicoesSugeridas[]` e `permiteValorLivre` | ⚠️ na inscrição (`E-06` e link), sim; na Agenda, ainda a lista livre 40/60/90, sem valor de hospedagem |
| 7 | Papel × relação com a casa | ✅ | ❌ um `Papel` só, sem os papéis perdidos | ⚠️ só o eixo da relação, com "Fardado" onde o esquema diz `MEMBRO` |
| 8 | Dado de saúde fora do read model de pessoa | ✅ | ❌ `Pessoa.pontosDeAtencao` | ❌ na lista e na ficha de Pessoas, no Painel e no detalhe da cerimônia |
| 9 | Contato de emergência e restrições | ✅ os dois obrigatórios; *"nenhuma"* é resposta | ❌ `Inscricao` sem os campos | ✅ `E-06` e link exigem os dois (IN4) · ⚠️ o responsável do menor (IN2) só na `E-06`; o link não trata menor |
| 10 | Estimativa no lugar da reserva | ✅ | ❌ `ReservaDeEstoque` | ❌ aba Reservas na Ayahuasca |
| 11 | Origens unidas | ✅ | ❌ cinco valores | — |
| 12 | Lista de preparo com login, depois | ✅ quem marca é um usuário (`feita_por`) | ❌ `OrigemMarcacao` com `LINK_PUBLICO` e `WEBHOOK` | ❌ *"quem abrir marca as tarefas sem precisar de login"*, com webhook |
| 13 | Fila de trabalho como bloco do Painel | — | — | ⚠️ só a faixa do lote |
| 14 | Vocabulário por regime — adiada | — | — | `RegimeVocabulary` sem uso, como decidido |
| §2.5.1 | Devolução como estorno — proposta, em aberto (§9.2 #14) | ✅ | ❌ `DevolucaoDevida` sem estorno nem competência | ✅ `E-09` |
| §2.6 | Anamnese pelo link, declaração, `POR_ESCOLHA` | ✅ | ✅ — a declaração não aponta a inscrição | ✅ |

Levar as decisões ao contrato é trabalho de B1 em diante (o Doc 7 §18.2 lista as trocas do Financeiro). Levá-las às telas é parte do que resta da etapa F (§6).

---

### 2.5.1 Devolução é estorno de receita, não despesa — divergência contra o Doc 2

O Doc 2 se contradiz sobre isso e vale resolver antes de virar tabela. O §5.1.4 desenha o fluxo terminando em *"`Lancamento` de **DESPESA** vinculado ao mesmo `eventoId`"*; a assinatura de `DevolucaoDevida.efetivar(transferenciaId)`, três páginas antes, recebe uma **transferência**. Os dois não podem estar certos.

**A tela `E-09` foi construída como estorno da receita original.** A razão é a mesma que sustenta F2, E1 e A5: quando a casa devolve uma contribuição, ela não teve custo — ela desfaz uma receita que não se confirmou.

O erro de lançar como despesa é traiçoeiro porque **fecha o resultado pelo mesmo número**: as duas pontas incham juntas e o lucro do período não muda. O que muda é tudo o que se lê a partir das linhas:

| | Como estorno | Como despesa |
|---|---|---|
| Receita de contribuição no ano | cai R$ 210 | fica R$ 210 a mais |
| Custo do trabalho | intacto | sobe R$ 210 que a casa nunca gastou |
| Resultado | igual | igual |
| Resposta a *"quanto a casa arrecadou?"* | verdadeira | inflada dos dois lados |

**Competência.** O estorno vai para a competência da receita original quando o período está aberto. Quando está fechado — e o de julho está —, ele entra na competência corrente, dita na tela, em vez de reabrir um período já prestado à assembleia. Reabrir é possível (`financeiro.periodo.reabrir`, com motivo e trilha), mas transformar prestação entregue em rascunho por causa de uma devolução é caro demais para o que resolve.

**Decisão da coordenação** — segue aberta (§9.2 #14). O esquema do Doc 7 e a `E-09` já seguem esta proposta; se for rejeitada, a troca custa uma regra de domínio (Doc 7 §27.2).

---

### 2.6 Duas premissas dos documentos que não são da casa

Levantadas em setembro/2026, depois de a tela de anamnese presencial estar construída. Ambas vinham dos Documentos, não de quem toca o CDD — e as duas invertem o desenho.

| Premissa documentada | O que a casa faz | Consequência |
|---|---|---|
| **`P-06` · anamnese de preenchimento presencial** (Doc 4 §6): alguém do Acolhimento digita pela pessoa, na chácara, possivelmente sem sinal | **Não existe.** A anamnese é respondida pelo **próprio participante**, online, durante a inscrição | A tela `P-06` foi removida. A permissão `anamnese.responder_por_terceiro` some do catálogo: não tem caso de uso. O cálculo de pendências (delta, RA1, RA4) migra intacto para a tela pública |
| **Não há autoinscrição** (Doc 1 §1.3), listada entre as "telas que deliberadamente não existem" | **A pessoa pode se inscrever sozinha.** O que a casa quer humanizado é o **atendimento da recepção**, que acontece no WhatsApp — e é de lá que sai o link | Entra uma tela pública, fora do AppShell. `E-06` deixa de ser a única porta de inscrição e passa a ser a da recepção: inscrever quem chegou por outro caminho e conferir o que veio pelo link |

**Como o link funciona.** Um token **por cerimônia**, gerado no cadastro dela e enviado pela recepção. O mesmo link serve para todo mundo; quem identifica a pessoa é o **CPF que ela declara ao abrir**:

- **CPF conhecido** → a casa reconhece, calcula o delta da anamnese e pergunta só o que mudou.
- **CPF desconhecido** → cadastro (cinco campos, uma vez só) e formulário inteiro.
- **Sempre, nos dois casos** → a pessoa **declara que a anamnese segue verdadeira para aquela cerimônia**.

**A declaração de veracidade é conceito novo, e é a peça que faltava.** Anamnese em dia não basta: uma medicação que começou semana passada não aparece em nenhuma revalidação anual. Declarar por cerimônia é barato para quem está bem, e é a única forma de a casa saber do que mudou sem obrigar todo mundo a refazer o formulário. Vai para o domínio como agregado próprio, ligado a `Inscricao` e à `RespostaDeAnamnese` vigente, com autor e instante — e a confirmação de inscrição (IN5) passa a exigir as duas coisas: resposta em dia **e** declaração para aquele evento.

**E ao lado da declaração tem que haver a porta de refazer.** Sem ela a declaração vira armadilha: quem mudou de condição fica entre afirmar algo falso e abandonar a inscrição, e as duas saídas são piores para a casa do que a pergunta a mais. A tela oferece *"quero responder de novo"* ao lado do próprio texto que a pessoa não consegue assinar — não escondida atrás de um "editar", porque é ali que ela descobre que precisa.

Isso traz uma distinção nova para o domínio: **resposta refeita por escolha não é o mesmo que resposta refeita por vencimento.** Vencimento é rotina de calendário; escolha significa que algo mudou na vida de alguém, e quem lê o parecer depois merece saber a diferença. Entra como `MotivoDaPendencia.POR_ESCOLHA`, ao lado de `REVALIDACAO`. A resposta anterior não se apaga — fica no histórico, supersedida, como já acontece na troca de versão do formulário.

**Área do participante ≠ autocadastro.** São coisas separadas, e só a segunda entra agora. A área do participante — com login, para acompanhar as próprias inscrições — continua fora: é a Fase 6 do Doc 1 §9.2 (Portal do participante), que depende do programa de conformidade LGPD. Não tem relação com a decisão 12, que trata da lista de preparo da equipe. O autocadastro pelo link não exige login nenhum.

---

# Parte II — Plano do Backend

## 3. O que não se negocia

Herdado dos Documentos 1 a 3, listado aqui para não se perder no meio da construção.

1. **Monólito modular**, um schema PostgreSQL por módulo, sem chave estrangeira cruzando schema (Doc 1 §4.7).
2. **`instituicao_id` em toda tabela de domínio, com RLS ativa.** Isolamento é garantia do banco, não disciplina do desenvolvedor (§4.2).
3. **Autorização é domínio, não Keycloak.** O token diz quem é; o sistema resolve o que pode. Nunca se compara nome de grupo — só permissão (Doc 3 §9).
4. **Dinheiro em centavos.** `bigint` ou `numeric(14,2)`. Nunca `float`.
5. **Competência é o eixo dos relatórios**; caixa alimenta o fluxo de caixa (Doc 2 §1.3).
6. **Lançamento confirmado é imutável.** Correção só por estorno (L2).
7. **O sistema propõe, o humano confirma.** Nenhuma automação cria lançamento financeiro sem revisão — exceto a integração de pagamento, cujo controle é a conciliação, não a conferência (Doc 2 §5.1.1).
8. **Nenhum assinante de notificação.** Eventos de domínio alimentam projeção e auditoria (Doc 1 §5.4).
9. **Read model que o usuário não pode ver não é consultado** — filtro na query, nunca na serialização (Doc 3 §10.2).

## 4. Estrutura

Conforme Doc 1 §4.5, com `apps/api` nascendo ao lado do que já existe:

```
apps/api/src/
├── modules/
│   ├── financeiro/      domain · application · infrastructure · interface/http
│   ├── eventos/
│   ├── pessoas/
│   ├── identidade/
│   └── estoque/
├── shared/
│   ├── kernel/          Entity, AggregateRoot, DomainEvent, Result, DomainError
│   ├── types/           branded ids (hoje em packages/contracts/kernel.ts)
│   └── infrastructure/  event bus, outbox, storage, auth, tenant-context
└── main.ts
```

**Regra de dependência verificada por lint** (`dependency-cruiser` na CI): `domain` não importa de `application`, `infrastructure` nem `interface`; módulos não importam o `domain` uns dos outros.

## 5. O contrato — o que muda em `packages/contracts`

Hoje o pacote mistura, por módulo, o que seria a camada de domínio (enums como `StatusLancamento` e o catálogo de permissões), formas de agregado e alguns read models, todos extraídos do protótipo. Faltam os comandos, as consultas por bloco e o catálogo de erros. A separação importa porque o front consome cada camada de um jeito diferente.

| Camada | O que é | Exemplo |
|---|---|---|
| **Domínio** | Enums e tipos que front e back compartilham | `StatusLancamento`, `Permissao`, `CodigoGrupo` |
| **Comandos** | O que se envia, com validação em tempo de execução (Zod) | `RegistrarLancamento`, `ConfirmarLancamento`, `AbrirPendencia` |
| **Consultas** | Read models, um por bloco de tela, cada um com sua permissão | `FilaDeConferencia`, `MeusRegistros`, `CustosDoEvento` |
| **Erros** | Catálogo de erros de domínio com código estável | `PERIODO_FECHADO`, `SEM_AUTORIDADE_PARA_AUTORIZAR_ADIANTAMENTO` |

O catálogo de erros é o que faz o Doc 4 §13 ("erro de domínio em português, sem código") ser possível: o servidor devolve o código, o front tem a frase. Sem código estável, cada tela inventa a sua.

> **Um read model por bloco.** É a consequência prática de §2.2: o painel do evento pede o bloco `CustosDoEvento`, e quem não tem `financeiro.resultado_evento.ler` não o recebe — não porque a tela o esconde, mas porque a consulta não é feita.

## 6. Etapas

Sequência derivada do Doc 1 §9.2, com o tamanho relativo de cada uma. As semanas são para uma pessoa em tempo parcial, que é o cenário real (Doc 1 §5.2), e servem para ordenar, não para prometer.

**A etapa F vem primeiro por decisão de setembro/2026:** completar o inventário de telas antes de começar o servidor. O motivo é o mesmo do método design-first — cada tela que falta é um contrato que ainda não foi escrito, e descobrir isso com o agregado pronto custa mais.

### F — Completar o front · ~5 semanas na estimativa original · **precede B0**

As 13 telas que faltavam (§1.3) estão construídas — eram a maior parte da etapa. O que resta, conferido no código em setembro/2026:

| Frente | ✅ Feito | ⚠️ Parcial | ❌ Ausente |
|---|---|---|---|
| Itens em tela (50) | os demais 46, sem auditoria função a função | `P-07` — o editor publica sem mostrar o impacto antes (FA5) | `P-02` — Nova pessoa e Editar só exibem um aviso · `P-04` — não há como atribuir papel com vigência · `E-14` — a Agenda não realiza o evento |
| Modais e folhas (7) | — | `E-12` — só um booleano na inscrição | `E-07`, `E-08`, `S-05`, `P-08`, `P-09`, `P-10` |
| Blocos (10) | `S-08` na tela de Feitio · `F-21` em Contratações e Parâmetros | Fila de trabalho no Painel — só a faixa do lote · `E-04` — sem governança por permissão · `S-06` — no modelo de reserva | Pendências em Meus registros e Verificação de lote · `P-05` · `E-11` · `S-07` · `F-20` |
| Shell (2) | — | `T-05` — só em Registrar lançamento; o shell não tem o estado (§2.4) | `T-03` — o seletor de unidade é só visual |

E as correções de modelo que as telas ainda não receberam (§2.5, *Onde cada decisão já está*): valor por etiqueta em Registrar lançamento (#1), `Pendencia` em Meus registros e Verificação de lote (#4), estados do evento (#5), os três níveis e a hospedagem no cadastro do evento — na inscrição já estão (#6) —, o papel ao lado da relação com a casa em Pessoas, com o vocabulário do esquema (#7), dado de saúde fora de Pessoas, do Painel e da Agenda (#8), o responsável do menor na inscrição pelo link (#9), estimativa no lugar da reserva (#10), lista de preparo com login (#12) e a fila de trabalho no Painel (#13).

**Entrega:** o inventário do Doc 4 coberto — 26 telas (mais as quatro de entrada), 7 modais, 10 blocos e o shell —, com os cinco percursos críticos (§1.4) completos em tela.

> Ainda sobre mocks. O que esta etapa produz não é sistema: é o contrato de API desenhado em forma de tela, que é o que o Doc 1 §8.1 pede como saída da etapa de front.

### B0 — Fundação · ~3 semanas · **bloqueia tudo**

`apps/api` com NestJS; PostgreSQL 16 com schema por módulo; MikroORM com migrations; kernel compartilhado (`Result`, `AggregateRoot`, `DomainEvent`); event bus in-process com Outbox; **RLS multi-tenant com teste de vazamento cross-tenant**; Keycloak com o realm do CDD; `Usuario` e `Grupo` como agregados; catálogo de permissões e seed dos seis grupos (Doc 3 §12); guard `@RequerPermissao`; CI com lint de fronteira, T28, T29 e T30.

**Entrega:** aplicação vazia em produção, com login real e os seis grupos funcionando.
**No front:** o mock de autenticação sai; o `Portao` vira tema do Keycloak; entram a camada de dados e os cinco estados (§2.4).

> As três regressões estruturais (T28, T29, T30) entram **aqui**, com o primeiro endpoint. Depois de vinte endpoints, T30 vira uma tarde de descobrir o que ficou aberto.

### B1 — Financeiro, o núcleo · ~6 semanas · **a etapa que decide**

`Unidade` (com regime), `Categoria`, `Conta`, `Lancamento` (com `Pendencia`, L1–L11), `Transferencia`, `PeriodoContabil`, `Fundo`. Read models: fila de conferência, meus registros, lançamentos, contas e saldos, DRE, fluxo de caixa, resultado por cerimônia.

Depende de: **cadastro mínimo de `Pessoa`** (nome, tipo, documento), porque `Lancamento.pessoaId` referencia fornecedor — o Doc 1 §9.4 já previa isso. O papel, desde a decisão 7, é `Vinculo` e chega em B2 (Doc 7 §25).

**Marco:** o fechamento do sistema bate com o da planilha por dois meses consecutivos.

### B2 — Financeiro, o resto · ~3 semanas

`Fatura` (resolve a dupla contagem de ~R$ 3,5 mil), `Emprestimo`, `Adiantamento` com a verificação de dois eixos (A1 — a invariante que impede conceder autoridade espiritual pela tela de acesso), reembolsos pendentes, prestação de contas com hash e supressão de identidade.

**Entrega:** o percurso 4 do Doc 4 §11 passa a existir com servidor — na tela ele já está quase todo, faltando o item da Governança na fila do Painel (§1.4) — e com ele o primeiro teste real da separação entre permissão e vínculo.

### B3 — Importação e conciliação · ~3 semanas

Parser OFX/CSV, `ImportacaoDeExtrato`, `LinhaExtrato` com idempotência por `FITID` (I1), motor de sugestão por valor + data + conta, fila de conciliação, faturamento por unidade comercial contra o teto.

**Entrega:** o lançamento esquecido deixa de ser invisível. É o que o Doc 1 §5.3 chama de estratégia principal de captura.

### B4 — Pessoas e anamnese · ~4 semanas

`Pessoa` completa (física e jurídica), `Vinculo`, `FormularioDeAnamnese` versionado, `RespostaDeAnamnese` com resposta incremental e refeita por escolha (`POR_ESCOLHA`, §2.6), `DeclaracaoDeVeracidade` por cerimônia (§2.6), `CalculadoraDePendenciasDeAnamnese`, log de acesso (RA3), `Consentimento`, `AutorizacaoDeResponsavel`.

**A parte difícil não é o CRUD:** é a identidade estável de `PerguntaId` entre versões e o `simularImpacto()` antes de publicar (FA5) — uma edição descuidada gera pendência para a base inteira às vésperas de uma cerimônia.

### B5 — Eventos · ~5 semanas

`Evento` com os três regimes de receita e suas invariantes (EV1–EV5), os três níveis de contribuição e a hospedagem à parte (§2.5, decisão 6), `Inscricao` completa pelos dois canais — recepção e link da cerimônia (§2.6) —, `Contratacao`, pagamentos com a integração para o Financeiro (Doc 2 §5.1.1), `DevolucaoDevida` com solicitar e efetivar separados e efetivação como estorno (§2.5.1), `MapaDeLeitos`, `Dormitorio`, demanda de refeições, acolhimento de primeira vez.

**Entrega:** os percursos 2 e 3 do Doc 4 §11 — os que provam a fronteira do Acolhimento.

### B6 — Estoque · ~3 semanas

`Item`, `Lote`, `MovimentoDeEstoque`, `Feitio` com custo por litro, `ConsumoDeCerimonia` por lote, `EstimativaDeConsumo` (que nunca movimenta saldo — EC1) e a calibragem do parâmetro por histórico (EC4).

### Transversal — Migração · ~2 semanas, em paralelo a B1 e B2

1.760 lançamentos, 44 categorias, 9 contas, ~15 abas de cerimônia, ~16 pessoas. Módulo `migracao` com CLI de importação e **relatório de conciliação**, histórico carregado somente leitura.

**Não começa sem as onze decisões humanas do Doc 1 §7.2** — natureza de cada categoria, reclassificação de transferências, faturas que duplicam compras, deduplicação de pessoas. Nenhuma delas é técnica.

## 7. Dentro de cada módulo, nesta ordem

1. **Agregado + invariantes**, com teste de unidade sem I/O. As invariantes do Doc 2 viram testes antes de virarem código de infraestrutura.
2. **Comandos** na camada de aplicação, com o guard de permissão.
3. **Persistência** (MikroORM + mappers) e migration com RLS.
4. **Read models** — um por bloco de tela, cada um com sua permissão, filtrados na consulta (§2.2).
5. **HTTP** com validação Zod e o catálogo de erros.
6. **Teste de integração** com Postgres real (Testcontainers), incluindo o caso de vazamento cross-tenant.
7. **Trocar o mock por chamada real**, uma tela por vez.

> O passo 7 é o que mantém o sistema honesto: enquanto um módulo não tiver backend, a tela correspondente continua em mock — e **precisa dizer isso na interface**. Uma faixa de "dados de demonstração" por módulo evita que alguém feche o mês olhando para número inventado. É barato agora e constrangedor depois.

## 8. Testes

| Camada | Ferramenta | O que cobre |
|---|---|---|
| Domínio | Vitest, sem I/O | Cada invariante do Doc 2 — L1–L11, EV1–EV11, IN1–IN12, A1, P1–P4… |
| Autorização | Vitest + fixtures de grupo | Os 30 casos do Doc 3 §11, como suíte executável |
| Integração | Testcontainers + Postgres real | RLS, transações, Outbox, idempotência do OFX |
| Estrutural | dependency-cruiser + teste de metaprogramação | T28 (nenhuma comparação com nome de grupo), T29, T30 (todo endpoint de escrita tem decorator) |
| Ponta a ponta | Playwright | Os cinco percursos do Doc 4 §11 |

**Sugestão de método:** escrever os 30 casos de autorização em B0, todos falhando, como critério de aceite das etapas seguintes. Eles são a especificação executável do Doc 3 — o documento que a coordenação valida linha a linha.

## 9. Decisões necessárias antes de começar

### 9.1 Bloqueiam B1

| # | Decisão | Quem decide | Situação |
|:--:|---|---|---|
| 1 | Categoria por lançamento | Tesouraria | ✅ resolvida — §2.5 #1, com valor por etiqueta |
| 2 | "Grupo" e `Unidade` | Tesouraria | ✅ resolvida — §2.5 #2, os dois permanecem |
| 3 | Regime da Chácara e dos Dormitórios | Coordenação | ⏳ aberta — Doc 1 §10.3 #1 |
| 4 | A unidade ativa filtra tudo ou só pré-preenche formulários? | Tesouraria | ⏳ aberta — Doc 4 §14.2, Q5 |
| 5 | Telas por grupo de acesso | Você | ✅ resolvida — §2.2, autorização por bloco |

### 9.2 Bloqueiam etapas posteriores

| # | Decisão | Bloqueia |
|:--:|---|---|
| 6 | Prazo de ressarcimento e valor que dispensa autorização prévia | B2 |
| 7 | Validade da anamnese em meses (sugestão: 12) | B4 |
| 8 | A equipe consagra e não faz anamnese — é intencional? | B4/B5 |
| 9 | Cadastro de dormitórios e leitos: operação de evento ou parâmetro? (Q3) | B5 |
| 10 | Capacidade real de leitos por dormitório | ✅ resolvida — Dormitório 1 com uma cama de casal, Dormitório 2 com três beliches, sem divisão por gênero (Doc 7 §19) |
| 11 | Consumo médio de daime por consagrante | B6 |
| 12 | Custo por litro: read model do Financeiro ou exige as duas permissões? (Q4) | B6 |
| 13 | Lista de preparo com link público — escopo, ou adiar? | ✅ resolvida — §2.5 #12: exige login, versão posterior |
| 14 | Devolução como estorno de receita, e em que competência entra quando o período está fechado (§2.5.1) | B5 |
| 15 | Colchonete: registrar sem cobrar, ou não registrar (§2.5) | B5 |

## 10. Riscos próprios desta etapa

| Risco | Por que é real aqui | Mitigação |
|---|---|---|
| **O front parece pronto e não está** | 30 telas navegáveis com dado inventado passam impressão de sistema pronto; o backend é 80% do trabalho restante | Faixa de "dados de demonstração" por módulo (§7) — nenhuma tela interna tem ainda; não demonstrar tela sem backend como se fosse operação |
| **Autorização por bloco virar campo escondido** | É a forma mais fácil de implementar a nova diretriz, e a que a anula: o dado chega e o front esconde | Contrato por bloco desde o primeiro read model (§2.2); teste que confere a **ausência** da chave na resposta, não a invisibilidade na tela |
| **A camada de dados virar refactor de 30 telas** | Hoje são 55 importações diretas de constantes síncronas, em 37 arquivos | Introduzir o cliente e o cache em B0, migrando tela a tela com o mock atrás da mesma interface |
| **`ADMINISTRADOR` para todo mundo** | Seis pessoas que se conhecem; a matriz vira teoria | Não é técnico (Doc 3 §5.4): a matriz escrita, revisada, e o acesso pleno tratado como exceção |
| **A migração introduzir erro no histórico** | 1.760 linhas com 31 lançamentos já sinalizados como ambíguos | Operação paralela com conciliação por dois meses; histórico somente leitura |

---

## 11. Resumo

O front-end está mais largo e mais raso do que parece: 30 telas navegáveis (25 internas) cobrem como tela 50 dos 68 itens do inventário — três deles ainda sem a função, e os outros 18 são modais, blocos e o shell, a maioria por fazer (§6 F) —, e tudo roda sobre constantes síncronas, sem camada de dados. As **quatorze divergências de modelo** (§2.3) estão decididas (§2.5), a #14 como adiamento, e todas as que dependem de esquema já estão desenhadas no do Doc 7, mas a maior parte ainda não chegou ao contrato nem às telas; das **cinco decisões** que bloqueiam B1 (§9.1), duas seguem abertas — o regime da Chácara e dos Dormitórios, e o alcance da unidade ativa. Nenhuma delas é de código.

O caminho termina a etapa F e segue o do Doc 1: fundação com acesso e multi-tenancy (B0), Financeiro núcleo até o fechamento bater com a planilha (B1), o resto do Financeiro e a conciliação (B2, B3), e então Pessoas, Eventos e Estoque (B4–B6). Na estimativa original, cerca de **32 semanas em tempo parcial**, com o marco de confiança — o fechamento que bate — ao fim de B1; as telas já construídas encurtam a etapa F.

Duas coisas valem ser feitas fora de ordem: os trinta testes de autorização, escritos em B0 falhando, e a composição por bloco das telas que misturam fronteiras, junto de B1 — o dado de saúde sai delas ainda na etapa F (§6). As duas ficam caras exatamente na proporção em que forem adiadas.
