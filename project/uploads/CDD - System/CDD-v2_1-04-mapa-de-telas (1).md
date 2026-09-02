# Sistema de Gestão — Céu do Despertar (CDD)

## Documento 4 de 4 — Mapa de Telas e Navegação

**Versão 0.2** · Autor: Aurio Neto · Data: agosto/2026 · Status: proposta para validação

> **Mudanças da 0.1 → 0.2.** Aplicadas as decisões de design Q1, Q2 e Q6 (§14.1). Duas delas propagam para os Documentos 2 e 3 e estão listadas em §14.3 como pendência documental.

> Pressupõe os **Documentos 1, 2 e 3 (v2.1)**.
> Este documento é a **saída da etapa 1 (Design)** do método design-first (Doc 1 §8.1). Ele antecede o código de front-end e é o que se valida com a coordenação e a tesouraria.
>
> **Regra que governa o documento inteiro:** a interface pode **restringir** o domínio, nunca **contradizê-lo**. Onde uma tela parece exigir algo que o Doc 2 proíbe, o erro é da tela.

---

## 0. Como ler este documento

Cada tela é identificada por um código estável (`F-01`, `E-03`…) que será usado no protótipo, no nome do componente e na conversa. Cada tela declara:

| Campo | O que significa |
|---|---|
| **Permissão** | A permissão do catálogo (Doc 3 §4) que **habilita** a tela. Sem ela, a tela não existe no menu nem responde a link direto. |
| **Grupos** | Quem enxerga, derivado da matriz (Doc 3 §6). É consequência da permissão, não decisão separada. |
| **Fonte** | O read model (Doc 2) ou o agregado que a alimenta. Tela sem fonte declarada é tela que ninguém sabe de onde vem. |
| **Fase** | Fase do roadmap (Doc 1 §9). |
| **Plataforma** | `Campo` = usada em pé, no celular, com pressa. `Escritório` = usada sentado. Muda tudo no desenho. |

Legenda de grupos: **ADM** Administrador · **GOV** Governança · **TES** Tesouraria · **ACO** Acolhimento e Organização · **REG** Registro rápido · **LEI** Leitura.

---

## 1. Princípios de navegação

Sete princípios, todos derivados de decisões já tomadas nos Docs 1–3. Nenhum é preferência estética.

1. **A fila é a casa.** A tela inicial pós-login é a fila de trabalho, não um dashboard. Como não há notificações (Doc 1 §5.4), a fila é o único mecanismo que diz "isto precisa de você" — e o risco registrado é ela não ser consultada. Ela abre por padrão, com contagem visível.

2. **Uma tela por grupo, não uma tela com campos ocultos.** Não existe "a tela do evento": existe `E-03` (como o Acolhimento vê) e `E-04` (como a Tesouraria vê). Elas consomem read models diferentes, de contextos diferentes (Doc 2 §5.3). Campo escondido é vazamento esperando o bug de renderização.

3. **Toda tela tem uma permissão e uma fonte.** Se não dá para nomear a permissão que a habilita, a tela não está desenhada. Se não dá para nomear o read model, ela vai exigir uma consulta que ninguém previu.

4. **Nada bloqueia o registro.** Campo incerto vira lançamento `A_CONFERIR` com pendência, nunca impedimento (Doc 1 §5.3). Validação que trava o envio só existe onde o domínio realmente proíbe.

   > **Nota de vocabulário (decisão Q2).** O estado antes chamado `RASCUNHO` passa a se chamar **`A_CONFERIR`**, rótulo *"A conferir"*. Quem pagou R$ 70 de recarga de extintor não rascunhou nada — afirmou um fato. Renomear o estado, e não apenas o rótulo, preserva o princípio 1 do Doc 1: o mesmo nome no código, no banco e na tela. O `RASCUNHO` do `FormularioDeAnamnese` permanece — ali a coordenação está genuinamente rascunhando, e a renomeação deixa claro que os dois nunca foram o mesmo conceito.

5. **O sistema propõe, o humano confirma.** Vale para importação de extrato, conciliação, estimativa de daime e qualquer sugestão automática. Nenhuma tela grava fato financeiro sem alguém olhar.

6. **O vocabulário vem do regime da unidade.** A mesma tela exibe *contribuição / participante / valor sugerido* no CDD e *venda / cliente / preço* na Lojinha e na Munay (Doc 1 §4.3). Isso é um `Vocabulario` injetado, não texto fixo em componente.

7. **Se algo precisa de alguém, é linha da fila.** Nenhuma tela nova é criada para "avisar". O item entra na fila, filtrado pela permissão de quem olha.

---

## 2. Mapa geral de navegação

```
                          ┌─────────────┐
                          │  T-01 LOGIN │  (Keycloak)
                          └──────┬──────┘
                                 ▼
                     ┌───────────────────────┐
                     │  T-02 FILA DE TRABALHO│  ◄── casa de todos os grupos
                     │  (itens por permissão)│      conteúdo varia, tela não
                     └───────────┬───────────┘
                                 │
     ┌──────────────┬────────────┼────────────┬──────────────┐
     ▼              ▼            ▼            ▼              ▼
┌──────────┐  ┌──────────┐  ┌─────────┐  ┌─────────┐  ┌───────────┐
│FINANCEIRO│  │  EVENTOS │  │ PESSOAS │  │ ESTOQUE │  │  SISTEMA  │
│  (F-xx)  │  │  (E-xx)  │  │ (P-xx)  │  │ (S-xx)  │  │  (A-xx)   │
│  Fase 1-2│  │  Fase 4  │  │ Fase 3  │  │ Fase 5  │  │  Fase 0   │
└────┬─────┘  └────┬─────┘  └────┬────┘  └────┬────┘  └─────┬─────┘
     │             │             │            │             │
     │  ADM TES    │  ADM ACO    │  ADM ACO   │  ADM ACO    │  ADM
     │  GOV REG    │  GOV TES    │  GOV TES   │  TES        │  (GOV só
     │  LEI        │             │            │             │  auditoria)
     │             │             │            │             │
     └─────────────┴─────────────┴────────────┴─────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │  T-05 SEM PERMISSÃO     │  só por link direto;
                    │  (403)                  │  o menu nunca leva aqui
                    └─────────────────────────┘
```

**A fronteira mais importante do mapa** é vertical, dentro de Eventos:

```
        ┌──────────────────────────────┐   ┌──────────────────────────────┐
        │  E-03  PAINEL DO EVENTO      │   │  E-04  RESULTADO DO EVENTO   │
        │        (organização)         │   │        (financeiro)          │
        │                              │   │                              │
        │  · inscritos e confirmados   │   │  · despesas com eventoId     │
        │  · total ARRECADADO          │   │  · resultado do evento       │
        │  · leitos e refeições        │   │  · ponto de equilíbrio       │
        │  · pendências de acolhimento │   │  · devoluções a pagar        │
        │                              │   │                              │
        │  fonte: contexto EVENTOS     │   │  fonte: contexto FINANCEIRO  │
        │  ACO  TES  GOV  ADM          │   │  TES  GOV  ADM  (LEI)        │
        └──────────────────────────────┘   └──────────────────────────────┘
                   nenhum custo                    nenhuma anamnese
```

Duas telas, duas fontes, duas permissões. É a materialização de Doc 2 §5.3 — e a razão pela qual a restrição do Acolhimento não custa nada para implementar.

---

## 3. O shell e o menu de cada grupo

O shell é o mesmo para todos: barra superior com contexto (instituição · unidade ativa · usuário) e navegação lateral. **O que muda é o conjunto de entradas**, derivado das permissões — nunca uma entrada desabilitada com cadeado. Entrada que a pessoa não pode usar não aparece.

| Entrada do menu | ADM | GOV | TES | ACO | REG | LEI |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Fila de trabalho | ● | ● | ● | ● | ● | ● |
| Registrar gasto *(ação flutuante)* | ● | ○ | ● | ○ | ● | ○ |
| Meus registros | ● | ○ | ● | ○ | ● | ○ |
| Financeiro → Lançamentos | ● | ● | ● | ○ | ○ | ○ |
| Financeiro → Conferência | ● | ○ | ● | ○ | ○ | ○ |
| Financeiro → Conciliação *(F2)* | ● | ○ | ● | ○ | ○ | ○ |
| Financeiro → Contas e Fundo | ● | ● | ● | ○ | ○ | ○ |
| Financeiro → Adiantamentos | ● | ● | ● | ○ | ○ | ○ |
| Financeiro → Relatórios | ● | ● | ● | ○ | ○ | ● |
| Financeiro → Fechamento | ● | ○ | ● | ○ | ○ | ○ |
| Financeiro → Plano de contas | ● | ● | ● | ○ | ● | ● |
| Eventos → Agenda | ● | ● | ● | ● | ○ | ○ |
| Eventos → Contratações | ● | ● | ● | ○ | ○ | ○ |
| Pessoas → Diretório | ● | ● | ● | ● | ○ | ○ |
| Pessoas → Formulário de anamnese | ● | ○ | ○ | ● | ○ | ○ |
| Estoque | ● | ● | ● | ● | ○ | ● |
| Sistema → Usuários e parâmetros | ● | ○ | ○ | ○ | ○ | ○ |
| Sistema → Auditoria | ● | ● | ○ | ○ | ○ | ○ |

**Sobre `REG` e `LEI`:** começam sem usuários (Doc 3 §5.4). O menu de `REG` tem três entradas — fila, registrar, meus registros — e é isso mesmo: é o grupo de quem abre o app para registrar um gasto e fecha. O de `LEI` tem relatórios consolidados e nada nominal, porque lista de participantes é dado sensível (Doc 3 §5.3).

> **`Meus registros` é o que fecha o ciclo do `REGISTRO`** (decisão Q1). Sem ele, o grupo registra às cegas: não sabe se o lançamento passou, nem responde quando a conferência precisa de uma informação que só ele tem. Com ele, `REG` deixa de ser um menu com um botão e ganha motivo para voltar ao app — que é exatamente o que a adoção precisa.

---

## 4. Telas transversais

### T-01 · Login
**Permissão:** — · **Grupos:** todos · **Fase:** 0 · **Plataforma:** ambas

- Redirecionamento ao Keycloak; a aplicação não desenha campo de senha.
- Retorno resolve `Usuario`, grupos, permissões efetivas e `instituicaoId` (Doc 3 §10.3).
- **Estado crítico:** usuário autenticado no Keycloak mas sem `Usuario` ativo no sistema (US1/US4) → tela explicativa com contato do administrador, nunca erro genérico.

### T-02 · Fila de trabalho *(home)*
**Permissão:** nenhuma própria — cada bloco exige a sua · **Grupos:** todos · **Fonte:** os read models existentes · **Fase:** 1 (cresce a cada fase) · **Plataforma:** ambas

A tela mais importante do sistema, porque substitui a categoria inteira de notificações.

- **Uma lista plana, sem agrupamento** (decisão Q6). Ordem fixa dos blocos, definida à mão; dentro de cada bloco, mais velho primeiro. A pessoa não deveria precisar saber que "conciliação" é Financeiro — e, com o volume real, não precisa de estrutura para descobrir.
- Cada item: o que é, quantos, desde quando, e um link que leva **direto à ação**, não à listagem.
- Contagem no ícone e no título da aba do navegador — é o que substitui o "toque" da notificação.
- **Por que sem agrupamento:** com seis usuários e o volume registrado, a fila típica terá de três a oito itens. Com cinco itens, agrupamento é irrelevante. E "urgência" não é comparável entre tipos — *período anterior aberto* e *menor sem autorização* correm em relógios diferentes, o contábil e o do evento; um score que os ordenasse inventaria uma comparação que o domínio não faz. **Gatilho de reavaliação:** fila real passando de ~15 itens para um mesmo usuário. Nesse caso o agrupamento correto é **por relógio** — o que corre contra o próximo trabalho, o que corre contra o fechamento do mês, e o que não tem prazo — e não por módulo. Ligado à medição de uso da Fase 1 (Doc 1 §10.1).
- Blocos e quem os vê:

| Item | Permissão do bloco | Grupos | Fase |
|---|---|:--:|:--:|
| Lançamentos `A_CONFERIR` aguardando conferência | `financeiro.lancamento.confirmar` | ADM TES | 1 |
| **Seus registros com pendência** — a conferência devolveu uma pergunta | `financeiro.lancamento.ler_proprios` | ADM TES **REG** | 1 |
| Período anterior ainda aberto | `financeiro.periodo.fechar` | ADM TES | 1 |
| Adiantamentos aguardando autorização | `financeiro.adiantamento.autorizar` | ADM GOV | 1 |
| Adiantamentos pendentes de ressarcimento | `financeiro.reembolsos.ler` | ADM GOV TES | 1 |
| Linhas de extrato sem lançamento | `financeiro.conciliacao.executar` | ADM TES | 2 |
| Faturamento da unidade comercial vs. teto | `financeiro.dre.ler` | ADM GOV TES LEI | 2 |
| Inscrições com anamnese pendente | `eventos.inscricao.ler` | ADM ACO | 4 |
| Menores sem autorização de responsável | `eventos.inscricao.ler` | ADM ACO | 4 |
| Primeira vez sem conversa de acolhimento | `eventos.acolhimento.registrar` | ADM ACO | 4 |
| Devoluções solicitadas aguardando pagamento | `eventos.devolucao.efetivar` | ADM TES | 4 |
| Estimativa de daime acima do saldo | `eventos.operacao.ler` | ADM ACO TES GOV | 5 |
| Consumo não registrado após evento realizado | `estoque.consumo.registrar` | ADM ACO | 5 |

> **Estado vazio é uma tela desenhada, não um branco.** "Nada aguarda você" com data da última verificação. Uma fila que fica vazia com frequência é uma fila em que se confia.

### T-03 · Contexto (instituição e unidade ativa)
**Permissão:** — · **Grupos:** todos · **Fase:** 0

- Componente da barra, não tela. Na v1 há uma instituição; o seletor existe mesmo assim, porque `instituicaoId` já está em tudo (Doc 1 §4.2).
- Unidade ativa **filtra listagens e pré-preenche formulários**, e é o que dispara a troca de `Vocabulario`. Trocar de CDD para Lojinha muda os rótulos na tela.

### T-04 · Perfil do usuário
**Permissão:** — · **Grupos:** todos · **Fase:** 0

- Nome, pessoa vinculada, grupos e **lista legível das permissões efetivas**. Alguém precisa poder responder "por que não consigo ver isso?" sem abrir o banco.
- Preferências de captura: conta e unidade padrão do lançamento rápido.

### T-05 · Sem permissão (403)
**Permissão:** — · **Fase:** 0

- Alcançável só por link direto ou marcador antigo. Diz **qual permissão falta**, em linguagem humana, e a quem pedir. Não expõe o conteúdo.

---

## 5. Módulo Financeiro — Fases 1 e 2

O módulo que decide a adoção. É onde o requisito dos 30 segundos é verificável no protótipo.

| ID | Tela | Permissão | Grupos | Fase | Plataforma |
|---|---|---|:--:|:--:|---|
| F-01 | Lançamento rápido | `lancamento.registrar` | ADM TES REG | 1 | **Campo** |
| F-02 | Meus registros | `lancamento.ler_proprios` | ADM TES **REG** | 1 | Campo |
| F-03 | Fila de conferência | `lancamento.confirmar` | ADM TES | 1 | Escritório |
| F-04 | Detalhe do lançamento | `lancamento.ler` | ADM GOV TES | 1 | Ambas |
| F-05 | Lançamentos (lista e busca) | `lancamento.ler` | ADM GOV TES | 1 | Escritório |
| F-06 | Transferência entre contas | `transferencia.registrar` | ADM TES | 1 | Escritório |
| F-07 | Contas e saldos | `conta.ler` | ADM GOV TES | 1 | Ambas |
| F-08 | Cadastro de conta | `conta.gerenciar` | ADM TES | 1 | Escritório |
| F-09 | Faturas de cartão | `fatura.gerenciar` | ADM TES | 1 | Escritório |
| F-10 | Empréstimos | `emprestimo.gerenciar` | ADM TES | 1 | Escritório |
| F-11 | Adiantamentos | `adiantamento.registrar` | ADM TES | 1 | Ambas |
| F-12 | Autorizar adiantamento | `adiantamento.autorizar` ⊗ | ADM GOV | 1 | **Campo** |
| F-13 | Reembolsos pendentes | `reembolsos.ler` | ADM GOV TES | 1 | Escritório |
| F-14 | Fundo Ayahuasca | `fundo.gerenciar` | ADM TES | 1 | Escritório |
| F-15 | Plano de contas | `plano_contas.ler` / `.gerenciar` | ADM GOV TES REG LEI | 1 | Escritório |
| F-16 | Unidades e regimes | `plano_contas.gerenciar` | ADM TES | 1 | Escritório |
| F-17 | DRE | `dre.ler` | ADM GOV TES LEI | 1 | Escritório |
| F-18 | Fluxo de caixa | `fluxo_caixa.ler` | ADM GOV TES LEI | 1 | Escritório |
| F-19 | Resultado por cerimônia | `resultado_evento.ler` | ADM GOV TES LEI | 1 | Escritório |
| F-20 | Resultado por fornecedor | `dre.ler` | ADM GOV TES LEI | 1 | Escritório |
| F-21 | Faturamento × teto | `dre.ler` | ADM GOV TES LEI | 2 | Escritório |
| F-22 | Fechamento de período | `periodo.fechar` | ADM TES | 1 | Escritório |
| F-23 | Reabertura de período | `periodo.reabrir` | **ADM** | 1 | Escritório |
| F-24 | Prestação de contas | `prestacao_contas.gerar` | ADM GOV TES | 1 | Escritório |
| F-25 | Importar extrato | `importacao.executar` | ADM TES | 2 | Escritório |
| F-26 | Fila de conciliação | `conciliacao.executar` | ADM TES | 2 | Escritório |

### F-01 · Lançamento rápido — *a tela que decide o projeto*

**Meta:** do toque no ícone ao "registrado" em **menos de 30 segundos**, em pé, com uma mão.

- **Ordem dos campos é a ordem do pensamento:** valor → o que foi → comprovante. Nada mais é obrigatório para gravar.
- **Valor primeiro**, teclado numérico aberto, foco automático.
- **Comprovante em um toque**, direto da câmera ou galeria (Doc 1 §5.3).
- **Padrões inteligentes preenchidos e visíveis, todos editáveis:** data de hoje como competência, conta mais usada por *este* usuário, unidade do último lançamento, categoria sugerida pela descrição.
- **Campo de descrição livre aceita o jeito atual de escrever**, inclusive `"65+70 recarga extintor e suporte"` — sem tentar dividir automaticamente. Item composto vira pendência na conferência (Anexo A, regra 11).
- **A data real entre parênteses é reconhecida**: `"ração cavalos (23/02)"` propõe `dataCompetencia = 23/02` com destaque visual e um toque para aceitar. É o hábito existente virando dado estruturado.
- **Grava sempre em `A_CONFERIR`.** Nenhuma validação impede o envio. Faltou categoria? Grava e marca pendência.
- Confirmação de tela inteira, com "registrar outro" imediatamente disponível — o caso real é registrar três coisas seguidas na saída do mercado.
- **O que a tela nunca faz:** escolher natureza (vem da categoria — L3), aceitar valor negativo (L1), oferecer confirmação a quem só tem `registrar`.

### F-02 · Meus registros
**Fonte:** read model *Meus registros* · **Plataforma:** campo

O read model existe para fechar o ciclo do registro, e é desenhado para **não** virar um relatório financeiro pobre.

- Contém **apenas** lançamentos com `registradoPor = usuárioAtual`.
- Exibe valor, descrição, data, status, pendência aberta e anexo.
- **Não exibe** conta, saldo, categoria de terceiros nem qualquer lançamento alheio.
- **Nunca agrega.** Sem total, sem soma, sem filtro por período. É a lista dos fatos que eu afirmei, não um demonstrativo. É essa ausência de agregação que impede a tela de virar um DRE por acidente — e é a diferença material entre `lancamento.ler_proprios` e `lancamento.ler`.
- Responder a uma pendência é a única ação de escrita disponível aqui, e ela não altera o status.
- Depois de `CONFIRMADO`, a linha permanece visível como histórico, sem nenhuma ação.

> **Nova permissão.** `financeiro.lancamento.ler_proprios` não existe no catálogo do Doc 3 §4.1 — é acréscimo desta versão, concedido a ADM, TES e REG. Para ADM e TES é redundante com `lancamento.ler`, mas concedê-la mantém a matriz coerente e o read model reutilizável: "meus registros" é uma visão útil também para quem tem acesso total.

### F-03 · Fila de conferência
**Fonte:** read model *Fila de conferência*

- Lista de `A_CONFERIR` por **origem** (manual, extrato, integração) e **idade**, mais velho primeiro.
- Cada linha mostra o que falta para poder confirmar (L7): categoria, conta, unidade, valor, competência.
- **Ações em massa** para o caso comum: vários lançamentos do mesmo dia, mesma conta.
- Confirmar é irreversível por definição (L2) — o botão diz isso antes, não depois.
- Lançamento de origem `INTEGRACAO_EVENTOS` **não aparece aqui** — nasce `CONFIRMADO` (Doc 2 §5.1.1), porque o fato aconteceu e ninguém digitou nada para revisar. Seu controle é a conciliação (Doc 3 §7.3). Como consequência, **todo `A_CONFERIR` realmente aguarda conferência humana** — o rótulo nunca mente.
- **Devolver com pendência** (decisão Q1): quando falta uma informação que só quem gastou sabe, a conferência registra a pergunta endereçada a `registradoPor`, e ela aparece na fila daquela pessoa. O lançamento permanece `A_CONFERIR`; devolver não é um estado novo. É o que impede o ciclo de se fechar no WhatsApp.

### F-04 · Detalhe do lançamento
- Todos os campos, anexos com **URL assinada de curta duração** (nunca link público), autor, origem, timestamps.
- Se `CONFIRMADO`: **não há botão de editar**. Só *estornar*, que abre o fluxo de estorno com motivo obrigatório e cria lançamento novo herdando a competência (L9).
- Estado de conciliação visível: conciliado com qual linha de extrato, ou não conciliado.
- Se `PeriodoContabil` fechado: ações bloqueadas com a razão explícita (L5), e o caminho para reabertura só aparece para quem tem `periodo.reabrir`.

### F-06 · Transferência entre contas
- Origem, destino, valor, data, **finalidade** — o campo que resolve a categoria *Movimentação* das planilhas.
- Finalidades: entre contas, `APORTE_A_FUNDO`, `RESSARCIMENTO_DE_ADIANTAMENTO`, repasse entre unidades.
- A tela deixa explícito, em texto: **transferência não é despesa e não aparece no DRE**. É um dos erros que o sistema existe para corrigir.

### F-11 e F-12 · Adiantamento — o fluxo de dois eixos
`F-11` registra: quem adiantou, qual despesa, qual conta pessoal, valor, comprovante.

`F-12` é **tela da Governança e é de campo** — padrinho e madrinha vão autorizar pelo celular, provavelmente logo depois de uma conversa. Contém apenas o essencial: quem, quanto, para quê, comprovante, autorizar ou recusar com motivo.

> **A tela não decide a autoridade.** Um administrador que não seja padrinho nem madrinha tem a permissão, vê a tela e **a operação falha no domínio** (A1, Doc 3 §8.1). O front precisa desenhar esse erro como um estado legítimo e explicado — "você tem acesso a esta tela, mas autorizar adiantamento exige vínculo de padrinho ou madrinha" — e não como falha de sistema. É o desenho de erro mais importante do sistema inteiro.

### F-14 · Fundo Ayahuasca
- Saldo, aportes, aplicações, e a lista de **categorias permitidas** visível na própria tela (FD1).
- Aplicação fora das categorias permitidas não é validação de formulário: é opção que não aparece.
- Aporte só se faz por transferência (FD3) — a tela leva a `F-06` com a finalidade pré-selecionada, em vez de duplicar o formulário.

### F-15 · Plano de contas
- Categorias com `codigoSistema`, natureza, tipo, **regimes permitidos** e `linhaRelatorio`.
- **Categoria ativa sem `linhaRelatorio` é destacada como erro** (C1) — é o buraco dos R$ 40,6 mil, e a tela existe em parte para nunca mais deixá-lo passar despercebido.
- Natureza aparece como campo **imutável** após criação (C2), com o texto explicando por quê.
- `REG` e `LEI` têm apenas leitura — `REG` porque precisa escolher categoria ao registrar.

### F-19 · Resultado por cerimônia
**A "terceira tabela" hoje montada à mão.**

- Por evento: contribuições recebidas − despesas com aquele `eventoId` = resultado.
- **Ponto de equilíbrio**: custo previsto ÷ contribuição média = número de contribuições necessárias, comparado às inscrições confirmadas. Responde, *antes* do trabalho, se ele se paga.
- Comparação demanda de refeições prevista × despesa efetiva com alimentação.
- **Esta tela é invisível ao Acolhimento.** Não é a mesma tela de `E-03` com uma seção a menos: é outra tela, de outro contexto.

### F-22 · Fechamento de período
- Por unidade e competência. Bloqueia com a razão exata quando há lançamento `A_CONFERIR` na competência (P1) ou competência anterior aberta (P4), com link para resolver.
- Fechar exibe e grava o **hash** do conjunto de lançamentos (P2), que aparece na exportação.
- `F-23` (reabrir) é só do Administrador, exige motivo textual e o registro fica permanente e visível na própria tela do período (P3).

### F-25 e F-26 · Importação e conciliação — *o que consolida a confiança*

`F-25`: seleciona a conta, envia OFX/CSV, vê o resumo antes de confirmar (quantas linhas, período, quantas já existiam por `FITID` — I1). Reimportar o mesmo arquivo não duplica nada, e a tela diz isso.

`F-26` é uma **tela de duas colunas**, e a forma importa:

```
   LINHAS DO EXTRATO                 LANÇAMENTOS DO SISTEMA
   sem correspondência               sem correspondência
   ───────────────────────           ───────────────────────
   ◄── "saiu dinheiro que            "registramos algo que ──►
        ninguém registrou"            não saiu do banco"
```

- No meio, as **sugestões de casamento** por valor + proximidade de data + conta, cada uma com um toque para aceitar. Sempre confirmadas por humano.
- Aceitar preenche `dataCaixa` a partir do extrato, nunca o contrário (I3).
- Ignorar uma linha exige motivo (I4).
- A coluna da esquerda é o produto inteiro da Fase 2: **é o problema de omissão saindo da invisibilidade.**

---

## 6. Módulo Pessoas — Fase 3

| ID | Tela | Permissão | Grupos | Fase | Plataforma |
|---|---|---|:--:|:--:|---|
| P-01 | Diretório de pessoas | `pessoa.ler` | ADM GOV TES ACO | 3 | Ambas |
| P-02 | Cadastro de pessoa | `pessoa.registrar` / `.editar` | ADM TES ACO | 3 | Ambas |
| P-03 | Ficha da pessoa | `pessoa.ler` | ADM GOV TES ACO | 3 | Ambas |
| P-04 | Vínculos e papéis | `vinculo.gerenciar` | ADM GOV ACO | 3 | Escritório |
| P-05 | Anamnese — leitura e parecer | `anamnese.ler` / `.analisar` | **ADM ACO** | 3 | Ambas |
| P-06 | Anamnese — preenchimento presencial | `anamnese.responder_por_terceiro` | ADM ACO | 3 | **Campo** |
| P-07 | Editor de formulário de anamnese | `formulario.editar` / `.publicar` | ADM ACO | 3 | Escritório |
| P-08 | Autorização de responsável | `autorizacao_responsavel.registrar` ⊗ | ADM ACO | 3 | **Campo** |
| P-09 | Consentimento | `consentimento.registrar` | ADM ACO | 3 | Ambas |
| P-10 | Anonimização | `pessoa.anonimizar` | **ADM** | 3 | Escritório |

### P-02 · Cadastro de pessoa
- **Primeira escolha: física ou jurídica**, e ela reconfigura o formulário inteiro — CPF/data de nascimento contra CNPJ/razão social/nome fantasia (PE1).
- Papéis rituais **não são oferecidos** para jurídica. Não desabilitados: ausentes.
- Documento duplicado abre **sugestão de deduplicação**, não erro (PE2). A migração vai trazer o mesmo nome escrito de três formas.
- Contato de emergência e restrições alimentares moram na inscrição, não aqui — mudam por evento.

### P-03 · Ficha da pessoa
- Identificação, contatos, vínculos ativos e encerrados, histórico de participação, consentimentos.
- **A seção de anamnese aparece como um cartão fechado**, com "abrir registra acesso" escrito antes do clique. Quem não tem `anamnese.ler` não vê nem o cartão.
- Pessoa com histórico não oferece excluir — só inativar ou anonimizar (PE3).

### P-04 · Vínculos e papéis
- Atribuir papel com `desde`, `ate` opcional e unidade quando cabível (músico da Munay).
- `remunerado` é **exibido, derivado e não editável** (V4). A tela mostra por quê: guardião e cuidadora são voluntários por definição de domínio.
- **`PADRINHO` e `MADRINHA` só se atribuem aqui** (V5). A tela diz, em texto, que esse vínculo habilita autorizar adiantamento — para que quem atribui saiba o que está fazendo. Não existe caminho para esse papel a partir de `A-01`.

### P-05 · Anamnese — leitura e parecer
**A tela mais sensível do sistema.**

- Abrir **grava registro de acesso** (RA3). Isso é dito na interface, não escondido em política. Não há leitura silenciosa de dado de saúde.
- Alertas do formulário no topo; respostas agrupadas; perguntas `sensivel` visualmente marcadas.
- Parecer do acolhimento é registrado, com autor e data. **A decisão é humana** — o sistema sinaliza, não veta.
- Status: `PENDENTE` · `OK` · `VENCIDA` · `NAO_APLICAVEL`, com a data de validade visível.
- Governança **não vê esta tela**. Liderança espiritual não implica acesso a dado de saúde (Doc 3 §6.3).

### P-06 · Preenchimento presencial
- É de campo: acontece com a pessoa na frente, muitas vezes na chácara, possivelmente sem sinal.
- **Resposta incremental**: quem já respondeu a versão anterior recebe só o que mudou.
- Salvamento parcial contínuo. Anamnese interrompida não se perde.

### P-07 · Editor de formulário
- Versionado. Rascunho → publicar → supersedida.
- **Antes de publicar, a tela mostra o impacto**: quantas pessoas passarão a ter pendência. É a mitigação do risco "versionamento gera pendência em massa" (Doc 1 §10.1).
- Distingue explicitamente **correção cosmética** (não gera pendência) de **substituição de pergunta** (gera).
- Marcar pergunta como `sensivel` é campo de primeira classe, na v1, mesmo sem criptografia ainda (Doc 1 §5.6).

### P-08 · Autorização de responsável
- É de campo: acontece na chegada, com o responsável presente.
- Criança, responsável, evento, **modalidade** (`PARTICIPA_RITUAL` ou `PERMANECE_SOB_SUPERVISAO`), anexo do termo assinado.
- **Segundo caso de dois eixos:** o responsável precisa ser pessoa física maior de idade (AR4). Erro de domínio, desenhado como tal.
- A tela deixa claro que **autorização é por evento** (AR2) — não há "autorizar para o ano".

---

## 7. Módulo Eventos — Fase 4

| ID | Tela | Permissão | Grupos | Fase | Plataforma |
|---|---|---|:--:|:--:|---|
| E-01 | Agenda de eventos | `inscricao.ler` | ADM GOV TES ACO | 4 | Ambas |
| E-02 | Criar / editar evento | `evento.criar` / `.editar` | **ADM ACO** | 4 | Escritório |
| E-03 | Painel do evento — organização | `arrecadacao.ler` + `operacao.ler` | ADM GOV TES **ACO** | 4 | Ambas |
| E-04 | Resultado do evento — financeiro | `financeiro.resultado_evento.ler` | ADM GOV TES LEI | 4 | Escritório |
| E-05 | Lista de participantes | `inscricao.ler` | ADM GOV TES ACO | 4 | **Campo** |
| E-06 | Inscrição — nova / editar | `inscricao.registrar` / `.editar` | ADM ACO | 4 | Ambas |
| E-07 | Marcar pagamento | `pagamento.registrar` | ADM TES **ACO** | 4 | **Campo** |
| E-08 | Cancelar inscrição e solicitar devolução | `inscricao.cancelar` + `devolucao.solicitar` | ADM TES ACO | 4 | Ambas |
| E-09 | Devoluções a pagar | `devolucao.efetivar` | ADM TES | 4 | Escritório |
| E-10 | Mapa de leitos | `operacao.gerenciar` / `.ler` | ADM ACO *(ler: +GOV TES)* | 4 | Ambas |
| E-11 | Demanda de refeições | `operacao.ler` | ADM GOV TES ACO | 4 | **Campo** |
| E-12 | Acolhimento de primeira vez | `acolhimento.registrar` | ADM ACO | 4 | **Campo** |
| E-13 | Contratações (Munay) | `contratacao.gerenciar` | ADM GOV TES | 4 | Escritório |
| E-14 | Realizar evento | `evento.realizar` | ADM ACO | 4 | Ambas |
| E-15 | Dormitórios e leitos *(cadastro)* | `operacao.gerenciar` *(ver §14.2, Q3)* | ADM ACO | 4 | Escritório |

### E-02 · Criar evento — *a tela em que o regime é escolhido*

- **Primeira decisão: o regime de receita**, e ela reconfigura tudo o que vem depois:

| Regime | A tela então pede | E não oferece |
|---|---|---|
| `CONTRIBUICAO` | Tabela de contribuição, capacidade, inscrições | Contratação (EV1) |
| `CONTRATADO` | Contratante, valor acordado, forma de pagamento | Inscrições, tabela (EV2) |
| `INTERNO` | Só participantes de equipe | Ambos (EV3) |

- `CONTRATADO` só aparece se a unidade for de regime `COMERCIAL` (EV4). No CDD, a opção não existe.
- **`regimeDeReceita` é imutável** (EV5). A tela avisa antes de criar, e depois oferece apenas cancelar e recriar.
- Identidade exibida é sempre **nome + data** — `"Lua Cheia — 15/01/2026"` — porque há dois trabalhos no mesmo mês (Anexo A, regra 1).
- Tabela de contribuição embutida: valor base, adicional de hospedagem por dia, adicionais de refeição, isenções por tipo, e `permiteValorLivre` como **decisão explícita** de quem cria. Contribuição religiosa admite valor a critério de quem contribui, e o sistema não pode impedir.

### E-03 · Painel do evento — organização *(a tela do Acolhimento)*
**Fonte:** read models de Eventos, exclusivamente. **Nenhum custo, nenhuma despesa, nenhum resultado.**

- Cabeçalho: nome, data, local, status, capacidade.
- **Arrecadação:** inscritos · confirmados · pagos · pendentes · **total arrecadado**.
- **Pendências**, com ação direta: anamnese pendente, menor sem autorização, primeira vez sem conversa.
- **Operação:** ocupação de leitos, demanda de refeições, consumo estimado de daime × saldo.
- Ações: abrir/encerrar inscrições, inscrever, marcar pagamento, alocar leito, realizar.
- **O que não existe nesta tela:** despesas, resultado, ponto de equilíbrio, devolução paga, contratação.

### E-04 · Resultado do evento — financeiro
Já descrita em `F-19`. Está listada aqui porque, para a Tesouraria, ela é *a* tela do evento — chegada pela agenda, não pelo DRE. **Mesmo evento, telas distintas, contextos distintos.**

### E-05 · Lista de participantes
- É de campo: usada na recepção, no dia, no celular, provavelmente com sinal ruim.
- Nome, tipo de participação, hospedagem, refeições, status de anamnese e de acolhimento, pago/pendente.
- Busca por nome no topo, resultados instantâneos, alvos de toque grandes.
- **Não mostra respostas de anamnese** — só o status. Ver resposta exige `P-05` e gera registro de acesso.

### E-06 · Inscrição
- Pessoa (busca no diretório ou cadastro rápido embutido), tipo de participação, `primeiraVez`, **`consagra`** (explícito desde a v2.1, não derivado).
- Hospedagem com dias, refeições, restrições alimentares, contato de emergência.
- **Valor calculado ao vivo pela tabela**, com o campo editável se `permiteValorLivre`.
- `EQUIPE` **não gera valor devido** (IN1) — a tela mostra "isento", não zero, porque a diferença é de domínio.
- `CRIANCA_ESTELAR` exige responsável **e** modalidade, e leva a `P-08` se não houver autorização vigente (IN2).
- **Contato de emergência e restrições são obrigatórios sempre** (IN4), inclusive para quem não consagra. É a única obrigatoriedade dura do fluxo de inscrição.

### E-07 · Marcar pagamento — *a tela que prova a fronteira*
- Contém **apenas**: quanto, quando, por qual meio. Confirmação em um toque.
- **Não contém**: conta, categoria, unidade, competência. Esses vêm da configuração do evento; o sistema compõe o lançamento, o Acolhimento fornece o fato (Doc 3 §7.3).
- Depois de marcar, mostra o saldo a pagar da inscrição e o total arrecadado do evento — nada além.
- O lançamento gerado **não é editável nem estornável** por quem marcou (L8). Não há link para ele nesta tela.

### E-08 e E-09 · Devolução — *o espelho, em duas telas e duas pessoas*

```
   E-08  ACOLHIMENTO                        E-09  TESOURARIA
   ──────────────────                       ─────────────────
   cancela a inscrição                      vê a fila de devoluções
   registra que a pessoa                    escolhe conta e data
   pediu o dinheiro de volta        ──►     paga
   `devolucao.solicitar`                    `devolucao.efetivar`
```

- `E-08` deixa explícito que **cancelar não devolve** (DV1): gera pendência. Quem falta e não pede, não recebe.
- Valor sempre integral do que foi pago (DV2) — campo exibido, não editável.
- `E-09` é a saída financeira do evento, e por isso o Acolhimento não a vê. É a restrição inteira expressa como duas telas.

### E-10 · Mapa de leitos
- Grade **dormitório × noite**, arrastar inscrição para leito ou selecionar por toque.
- Só oferece inscrições com hospedagem ≠ `SEM_HOSPEDAGEM` (ML2).
- Sobreposição no mesmo evento é impossível (ML1) — o leito ocupado não é alvo válido.
- **Conflito com outro evento no mesmo local é aviso, não bloqueio** (limitação assumida, Doc 2 §2.6). A tela precisa desenhar esse aviso com clareza, porque o domínio não o impede.
- Cancelar inscrição libera o leito visivelmente (ML3).

### E-11 · Demanda de refeições
**A lista de compras da cerimônia.** Três linhas que substituem uma conversa inteira no WhatsApp.

- Totais por refeição (ceia, café, almoço, domingo) e restrições agregadas por descrição e quantidade.
- Data de atualização em destaque — quem vai ao mercado precisa saber se o número é de hoje.
- Exportável/imprimível: alguém vai levá-la ao mercado sem sinal.

### E-12 · Acolhimento de primeira vez
- Lista de quem vem pela primeira vez e ainda não conversou.
- Registrar a conversa: data, quem acolheu, observações.
- **Deliberadamente simples.** O sistema apoia o acolhimento; não o substitui (Doc 1 §1.3). Nada aqui tenta roteirizar a conversa.

### E-13 · Contratações
- Contratante (pessoa **jurídica**, tipicamente), valor acordado, forma de pagamento, status, observações.
- Registrar recebimento gera `CACHE_RECEBIDO` (receita) vinculado ao evento; os cachês aos músicos são `CACHE_PAGO` (despesa) no **mesmo** evento (CN2/CN3). A tela mostra os dois lados juntos, porque é exatamente a confusão que o modelo veio desfazer.
- **Fora do Acolhimento**: negociar cachê com outra instituição é ato comercial da Munay, não recepção.

### E-14 · Realizar evento
- Só habilita se a data de início já passou (EV10).
- Ao realizar, mostra o que passa a ser pendência: **registro do consumo real de daime** (`S-05`) e fechamento da apuração.

---

## 8. Módulo Estoque — Fase 5

| ID | Tela | Permissão | Grupos | Fase | Plataforma |
|---|---|---|:--:|:--:|---|
| S-01 | Saldos por item e lote | `saldo.ler` | ADM GOV TES ACO LEI | 5 | Ambas |
| S-02 | Itens e lotes | `item.gerenciar` | ADM TES | 5 | Escritório |
| S-03 | Movimentos | `movimento.registrar` | ADM TES REG | 5 | Ambas |
| S-04 | Feitio | `feitio.gerenciar` | ADM TES | 5 | Ambas |
| S-05 | Registrar consumo da cerimônia | `consumo.registrar` | **ADM ACO** | 5 | **Campo** |
| S-06 | Estimativa × saldo | `eventos.operacao.ler` | ADM GOV TES ACO | 5 | Ambas |
| S-07 | Estimado × realizado (calibragem) | `saldo.ler` | ADM TES | 5 | Escritório |
| S-08 | Custo por litro | `saldo.ler` + `financeiro.dre.ler` | ADM TES GOV | 5 | Escritório |

### S-05 · Registrar consumo — *a tela onde estimativa vira fato*
- É de campo, usada **depois do trabalho**, por quem estava lá.
- **Volume vem pré-preenchido pela estimativa e editável**, com rótulo dizendo que é estimativa. Reduz atrito sem transformar suposição em fato.
- Um ou mais lotes, cada um com volume próprio. Uma cerimônia pode servir mais de um lote.
- **Só ao confirmar** gera `SAIDA_CONSUMO` por lote. A estimativa nunca move estoque (EC1).
- Não há registro por participante nem por dose — inviável durante o ritual, e fora do modelo.

### S-06 · Estimativa × saldo
- Responde **uma pergunta: "dá?"**. Consagrantes × consumo médio contra o saldo de daime, com margem em litros.
- Recalculada a cada confirmação ou cancelamento de inscrição (EC2).
- Insuficiência vira item da fila (EC5), nunca notificação.
- A tela declara a imprecisão: 20% de erro é aceitável, porque a decisão que ela informa é *fazer feitio ou comprar* — com meses de antecedência.

### S-07 · Estimado × realizado
- Existe para uma coisa: **oferecer a média histórica como recalibragem** do parâmetro de consumo médio (EC4). Sugere; nunca altera sozinho. O botão é "adotar como parâmetro", e é da pessoa.

---

## 9. Módulo Sistema — Fase 0

| ID | Tela | Permissão | Grupos | Fase |
|---|---|---|:--:|:--:|
| A-01 | Usuários | `sistema.usuario.gerenciar` | **ADM** | 0 |
| A-02 | Grupos e permissões | `sistema.grupo.gerenciar` | **ADM** | 0 *(leitura)* / 8 *(CRUD)* |
| A-03 | Parâmetros da instituição e unidades | `sistema.parametro.gerenciar` | **ADM** | 0 |
| A-04 | Auditoria e acesso a dado sensível | `sistema.auditoria.ler` | ADM GOV | 0 |

### A-01 · Usuários
- Associar `Usuario` a `Pessoa` e a grupos. Todo usuário é uma pessoa (US1); a tela começa buscando no diretório.
- **Não há aqui nenhum papel de domínio.** Nem `PADRINHO`, nem `GUARDIAO`. A separação de eixos é visível na interface: quem quer conceder autoridade espiritual vai a `P-04`, e essa é a única porta.
- Impede remover o último administrador ativo (US5), com a razão dita.
- Toda mudança de grupo mostra autor e timestamp na própria tela (US6).

### A-02 · Grupos e permissões
- Na v1 é **leitura**: os seis grupos com suas permissões, em linguagem humana. Serve para a conversa de revisão de acesso, que é a mitigação não-técnica do risco de acesso demais (Doc 3 §5.4).
- Vira CRUD na Fase 8, sem refactor, porque as permissões já são códigos.

### A-04 · Auditoria
- Duas visões: trilha geral de operações e **log de acesso a dado sensível** (quem abriu a anamnese de quem, quando).
- Governança tem acesso — é o contrapeso ao poder do Acolhimento sobre dado de saúde.

---

## 10. Telas que deliberadamente não existem

Registrar a ausência é tão importante quanto o inventário, porque toda uma delas será pedida em algum momento.

| Tela ausente | Por quê | Onde a decisão está |
|---|---|---|
| Central de notificações / preferências de canal | Não há notificação. Há fila. | Doc 1 §5.4 |
| Editar lançamento confirmado | Imutabilidade. Só estorno. | Doc 2, L2 |
| DRE público / painel aberto a membros | Prestação de contas é exportação sob demanda. | Doc 1 §6 |
| Autoinscrição em cerimônia | A recepção é sempre humana. | Doc 1 §1.3, §5.5 |
| Escala de guardiões por função e turno | Os guardiões revezam funções no mesmo trabalho. | Doc 2 §2.8 |
| Tela única de evento com campos ocultos por perfil | É como vazamento de permissão nasce. | Doc 1 §8.1 |
| Chatbot de lançamento | Substituído pela importação de OFX. | Doc 1 §5.3 |
| Apoios recorrentes / "inadimplência" de apoiador | `Apoio` é pós-v1 — e apoiador que falha não é inadimplente. | Doc 2 §6.1 |
| Cobrança automática de qualquer natureza | Não existe no domínio. | Doc 2 §6.1 |

---

## 11. Percursos críticos — o que o protótipo precisa provar

Cinco percursos ponta a ponta. Se o protótipo navegável percorrer estes cinco, o design está validado.

**1. Do gasto ao DRE** — *mede os 30 segundos*
`T-02` → `F-01` (registra `A_CONFERIR`, no mercado) → `F-03` (tesouraria confere; se faltar informação, devolve pendência) → `F-02` (quem registrou responde) → `F-04` (confirma) → `F-26` (concilia com o extrato) → `F-17` (aparece no DRE).

**2. Da chegada ao pagamento** — *prova a fronteira do Acolhimento*
`E-01` → `E-03` → `E-06` (inscreve) → `P-06` (anamnese) → `P-05` (analisa) → `E-12` (conversa) → `E-07` (marca pagamento) → e **para aí**: o lançamento gerado não é alcançável a partir de nenhuma tela do Acolhimento.

**3. Da falta à devolução** — *prova a separação de atos*
`E-08` (acolhimento cancela e registra a solicitação) → `T-02` da tesouraria (aparece na fila) → `E-09` (tesouraria paga) → lançamento de saída vinculado ao evento.

**4. Do adiantamento ao ressarcimento** — *prova a verificação de dois eixos*
`F-11` (registra) → `T-02` da governança → `F-12` (autoriza — **e falha, com explicação, se quem tenta não for padrinho nem madrinha**) → `F-13` (reembolso pendente) → `F-06` (ressarcimento por transferência, sem gerar despesa nova — A5).

**5. Do "dá?" ao consumo real** — *prova que projeção não move estoque*
`S-06` (estimativa acima do saldo → item da fila) → decisão de feitio ou compra → `E-14` (evento realizado) → `S-05` (consumo real, pré-preenchido e corrigido) → `S-07` (calibragem do parâmetro).

---

## 12. Ordem de construção do front

Segue as fases do Doc 1 §9, com uma exceção deliberada.

| Ordem | O que | Por quê |
|---|---|---|
| 1 | `T-01`, `T-02` *(esqueleto)*, `T-04`, `T-05`, `A-01`, `A-02` | O modelo de acesso entra na Fase 0. Toda tela seguinte é desenhada por grupo — sem ele, não há por onde começar. |
| 2 | **`F-01`** | A tela que decide o projeto. Vai a teste com quem hoje lança pelo WhatsApp, isolada, antes de qualquer outra coisa. |
| 3 | `F-03`, **`F-02`**, `F-04`, `F-15`, `F-07` | O ciclo mínimo de confiança: registrar, conferir, **devolver a pendência a quem sabe**, categorizar, ver saldo. `F-02` vem logo depois de `F-03` porque as duas formam um par: conferência que não consegue perguntar volta para o WhatsApp. |
| 4 | `F-17`, `F-18`, `F-19`, `F-22`, `F-24` | Relatórios e fechamento — o marco de validação (bater com a planilha por dois meses). |
| 5 | `F-25`, `F-26` | Conciliação: o que transforma "sistema onde a gente digita" em "sistema que sabe mais que a gente". |
| 6 | Pessoas → Eventos → Estoque | Ordem do roadmap. |

**A exceção:** `F-01` sai da fila e é prototipada e testada **antes** de qualquer outra tela funcional. Não como parte do lote da Fase 1 — sozinha, com quem vai usar. Se ela não passar no teste dos 30 segundos, nada mais no roadmap importa, e é melhor descobrir isso na segunda semana.

---

## 13. Estados obrigatórios em toda tela

Saída da etapa de design, exigida pelo Doc 1 §8.1. Nenhuma tela é entregue sem os cinco.

| Estado | O que precisa dizer |
|---|---|
| **Carregando** | Esqueleto do conteúdo, não spinner genérico. |
| **Vazio** | Por que está vazio e o que fazer. "Nenhum lançamento neste período" ≠ "erro". |
| **Erro de infraestrutura** | O que falhou e o que tentar. Preserva o que foi digitado — sempre. |
| **Erro de domínio** | A regra que barrou, em português, sem código. *"Este período está fechado. Reabrir exige um administrador."* Nunca "operação inválida". |
| **Sem permissão** | Só por link direto. Diz qual permissão falta e a quem pedir, sem revelar o conteúdo. |

> **O estado de erro de domínio é o mais negligenciado e o mais importante aqui.** O sistema tem dezenas de invariantes (Doc 2), e cada uma vai virar uma mensagem que alguém lê em pé, com pressa, na chácara. Escrevê-las bem é parte do design, não do backend.

---

## 14. Decisões e questões de design

### 14.1 Decisões tomadas nesta versão

| # | Questão | Decisão | Razão determinante |
|---|---|---|---|
| **Q1** | `REG` tem `lancamento.registrar` mas não `lancamento.ler`. Quem registra opera às cegas? | **Nova permissão `financeiro.lancamento.ler_proprios`** + read model *Meus registros*, filtrado por autoria, sem agregação. Concedida a ADM, TES, REG. Conferência pode devolver pendência endereçada a quem registrou. | Não é conveniência: a conferência encontra lançamentos sem categoria, e **só quem gastou sabe para que foi**. Sem caminho de volta, o ciclo se fecha no WhatsApp — o retrabalho que o sistema existe para eliminar. |
| **Q2** | Rótulo de `RASCUNHO`. | **Renomear o estado para `A_CONFERIR`**, rótulo *"A conferir"*. Renomeação de linguagem ubíqua, não de label. `RASCUNHO` permanece em `FormularioDeAnamnese`. | "Rascunho" sugere tentatividade e que *ainda não conta* — desincentiva o comportamento mais caro de conseguir. Dois rótulos para um estado violariam o princípio 1 do Doc 1; "A conferir" lê certo dos dois lados e cabe em chip. |
| **Q6** | Fila agrupada por urgência ou por módulo? | **Nenhum dos dois: lista plana**, ordem fixa de blocos, mais velho primeiro dentro de cada um. Reavaliar por relógio se um usuário passar de ~15 itens. | Com o volume real, a fila típica tem de três a oito itens — agrupamento é irrelevante. E urgência não é comparável entre relógios diferentes; ordená-la inventaria uma comparação que o domínio não faz. |

> As três eram as que bloqueavam as Fases 0 e 1. **A Fase 0 está desimpedida.**

### 14.2 Questões ainda abertas

| # | Questão | Contexto | Quem decide | Bloqueia |
|---|---|---|---|---|
| Q3 | Cadastro de dormitórios e leitos (`E-15`) é operação de evento ou parâmetro do sistema? A permissão muda conforme a resposta. | `E-15` | Coordenação | Fase 4 |
| Q4 | `S-08` (custo por litro) cruza Estoque e Financeiro. Exigir as duas permissões, ou é read model do Financeiro? | `S-08` | Aurio | Fase 5 |
| Q5 | A unidade ativa (`T-03`) filtra tudo globalmente ou só pré-preenche formulários? Filtro global esconde dados sem avisar; pré-preenchimento pode gerar lançamento na unidade errada. | Shell | Tesouraria | Fase 1 |

### 14.3 Pendência documental — propagação para os Docs 2 e 3

As decisões Q1 e Q2 alteram artefatos fora deste documento. Até que os Documentos 2 e 3 sejam atualizados, **este documento está adiante deles**, o que inverte temporariamente a regra de precedência declarada no rodapé.

| Alteração | Documento | Seção | Natureza |
|---|---|---|---|
| `StatusLancamento`: `RASCUNHO` → `A_CONFERIR` | Doc 2 | §1.3 (`type StatusLancamento`), §1.10 (P1), §4 (read model *Fila de conferência*) | Renomeação de linguagem ubíqua. Custo zero — nada implementado. |
| `Lancamento.pendencias: Pendencia[]` | Doc 2 | §1.3 | **Acréscimo ao agregado.** O Doc 1 §5.3 já pressupõe "rascunho com pendência", mas o Doc 2 não modela o campo. Cada pendência tem texto, autor, destinatário (`registradoPor`) e resolução. Resolver não altera status. |
| `financeiro.lancamento.ler_proprios` | Doc 3 | §4.1 (catálogo), §6.1 (matriz: ● ADM, ○ GOV, ● TES, ○ ACO, ● REG, ○ LEI) | Nova permissão. |
| Descrição de `lancamento.registrar` | Doc 3 | §4.1 | "Criar lançamento em `RASCUNHO`" → "em `A_CONFERIR`". |

> **A lacuna do campo `pendencias` é um resultado do método, não um defeito dele.** A tela exigiu um campo que a especificação textual deixou implícito em prosa — que é exatamente o que o Doc 1 §8.1 prometia que o design-first produziria antes do backend existir.

---

## 15. Próximos passos

1. **Validar `§3` (menu por grupo) e `§7` (Eventos) com a coordenação e o acolhimento.** São as partes que se conferem linha a linha sem entender de arquitetura.
2. **Propagar §14.3 para os Documentos 2 e 3** — quatro alterações pequenas, todas de custo zero enquanto nada estiver implementado. É o que restabelece a precedência normal entre os documentos.
3. **Prototipar `F-01` isoladamente** e testar com quem hoje lança pelo WhatsApp, cronômetro na mão.
4. **Desenhar os cinco estados (§13) para `F-01`, `F-02`, `F-03` e `E-07`** antes de expandir o inventário — são as três telas onde os estados carregam mais regra.
5. **Extrair os tipos de `packages/contracts`** à medida que as telas viram código, conforme Doc 1 §8.1.

---

*Documento derivado dos Documentos 1, 2 e 3 da v2.1. Toda regra de tela citada corresponde a uma invariante do Doc 2. Onde este documento diverge daqueles, prevalecem aqueles — **com a exceção explícita das quatro alterações de §14.3**, que são decisões desta versão aguardando propagação, e não divergências acidentais.*
