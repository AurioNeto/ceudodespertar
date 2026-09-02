# Sistema de Gestão — Céu do Despertar (CDD)

## Documento 5 de 5 — Sistema de Design

**Versão 1.0** · Autor: Aurio Neto · Data: agosto/2026 · Status: proposta para validação

> Pressupõe o **Documento 4 — Mapa de Telas e Navegação**, do qual herda o inventário de telas, os cinco estados obrigatórios e a classificação campo/escritório.
> Acompanham este documento dois artefatos executáveis: `cdd-tokens.css` (tokens, para importar no Claude Design) e `CDD-design-system.html` (especificação viva, com tudo renderizado).
>
> **Regra que governa o documento inteiro:** o sistema de design pode **restringir** a interface, nunca **contradizer** o domínio. Nenhum componente daqui pode ter uma palavra de negócio escrita dentro.

---

## 1. O que este documento decide, e o que ele não decide

Ele decide cor, tipo, medida, forma, densidade e o inventário de componentes. Não decide fluxo, permissão ou conteúdo — isso é Doc 4, e o sistema de design obedece.

A ordem importa. Um sistema de design construído antes do mapa de telas inventa componentes que ninguém usa. Este foi extraído *das* telas: cada componente abaixo existe porque pelo menos três telas do Doc 4 pedem a mesma coisa.

**Convenção de nomes:** tokens e componentes em inglês, decisão registrada na conversa de design. É a única parte do projeto que não segue a linguagem ubíqua em português, e por um motivo específico: token é infraestrutura, não domínio. `--color-pending` é a cor; `A_CONFERIR` continua sendo o estado, em português, no código, no banco e na tela.

---

## 2. A tradução da identidade

A referência é a própria marca do centro: um **merkaba** em duas metades — verde de um lado, ouro do outro, com um ápice em violeta e rosa — sobre a **flor da vida** em linha dourada fina; abaixo, o wordmark em **marrom quente pesado** e a tagline em **caixa alta leve, muito espaçada, em bronze**.

O que transfere de uma marca para uma ferramenta de campo é paleta, tinta e gesto tipográfico. O que **não** transfere é densidade: a logo respira, e `F-01` tem trinta segundos.

### 2.1 As quatro traduções

| Elemento da marca | Vira | Por que não é decoração |
|---|---|---|
| **As duas metades do merkaba** — verde e ouro | Os dois estados do lançamento: `CONFIRMADO` (verde) e `A_CONFERIR` (ouro) | O domínio tem exatamente duas condições centrais. A dualidade da marca carrega a dualidade do domínio, em vez de competir com ela. |
| **O ápice violeta** — o menor e mais raro elemento do símbolo | A cor de ação: botão primário, foco, sugestão aceitável | A cor mais rara carrega a coisa mais rara na tela. Se tudo é ação, nada é. |
| **A linha da flor da vida** — dourado pálido, 1px | Todo hairline e divisor do sistema | É o elemento da marca que mais aparece e menos se nota — que é exatamente o que um divisor deve ser. |
| **A tagline** — caixa alta, leve, tracking largo, bronze | O tratamento de todo rótulo de campo e sobrancelha de seção | Um gesto tipográfico específico da marca, reaproveitado onde a marca não caberia. |

### 2.2 O que a marca não decide

O **marrom do wordmark** (`#764C29`) é a tinta dos títulos, mas não do corpo: em 15px ele fica confortável, não legível sob sol. O corpo usa um marrom mais escuro derivado dele (`#3B2617`, 13,3:1). Preto puro não entra em lugar nenhum do sistema — é a única concessão puramente estética, e ela é barata.

**O símbolo não entra na interface de trabalho.** Merkaba e flor da vida aparecem em três lugares e só: tela de login, estados vazios e marca d'água da especificação. Fundo geométrico atrás de conteúdo que se lê ou se digita reduz legibilidade, e a tela mais importante do sistema é usada no estacionamento do mercado.

### 2.3 A assinatura

**A barra de estado:** 3px na borda esquerda de toda linha de lançamento — ouro para o que espera, verde para o que está firmado, cinza para estornado. São as duas metades do merkaba reduzidas à sua forma mais útil: estado legível numa lista rolando, no sol, sem ler nada.

É reforço, nunca portadora única de significado — todo estado tem também um rótulo em texto.

---

## 3. Tokens

O arquivo normativo é `cdd-tokens.css`. Resumo do que ele contém e por quê.

### 3.1 Color

| Token | Valor | Contraste sobre paper | Uso |
|---|---|---|---|
| `--color-paper` | `#FAF7F0` | — | Fundo da aplicação |
| `--color-surface` | `#FFFFFF` | — | Cartão, campo, linha de lista |
| `--color-surface-sunken` | `#F3EEE2` | — | Faixa de valor, cabeçalho de tabela |
| `--color-line` | `#E3D9C5` | — | Hairline |
| `--color-ink` | `#3B2617` | 13,3:1 | Texto principal |
| `--color-ink-brand` | `#764C29` | 6,9:1 | Títulos |
| `--color-ink-muted` | `#6E5B48` | 6,0:1 | Texto de apoio |
| `--color-ink-subtle` | `#877461` | 4,2:1 | **Só metadado**, nunca texto essencial |
| `--color-label` | `#8A6539` | 4,9:1 | Rótulo em caixa alta |
| `--color-action` | `#5C3E75` | 8,2:1 | Botão primário, foco |
| `--color-pending` | `#8F5714` | 5,5:1 | `A_CONFERIR`, lacuna, aviso |
| `--color-confirmed` | `#1B6E40` | 5,9:1 | `CONFIRMADO`, conciliado |
| `--color-attention` | `#9E3520` | 6,6:1 | Pendência aberta, bloqueio, sem permissão |
| `--color-neutral` | `#877461` | 4,2:1 | Estornado, inativo |

**`--color-ink-subtle` fica abaixo de 4,5:1 de propósito e por isso é restrito.** Ele existe para metadado que já aparece em outro lugar da tela — data, conta, código. Usá-lo em texto essencial é bug de acessibilidade, não escolha estética.

**`attention` nunca significa "erro do usuário".** Significa "alguém precisa agir". Um lançamento com pendência não está errado — está esperando uma resposta que só uma pessoa tem (Doc 2, L11).

### 3.2 Typography

| Papel | Família | Onde |
|---|---|---|
| `--font-display` | **Archivo** 700/800, tracking −0,02em | Só títulos de tela e de seção |
| `--font-body` | **Public Sans** 400/500/600 | Todo o resto do texto |
| `--font-data` | **IBM Plex Mono** 500/600, tabular | Todo número: valor, data, código, contagem |

Archivo carrega o peso geométrico do wordmark sem imitá-lo. Public Sans faz o corpo porque precisa ser lido em tela pequena sob sol. E **numerais tabulares são obrigatórios** em qualquer coluna de valor — sem eles, ler uma coluna exige contar dígitos, e a conferência é justamente leitura de coluna.

O rótulo (`--text-label` + `--tracking-label` em caixa alta, bronze) é o gesto da tagline e aparece em todo campo do sistema.

### 3.3 Shape

Raio baixo, porque o símbolo é feito só de retas e ângulos de 60°: `6px` / `10px` / `14px`. Pílula (`999px`) **só em badge de estado** — nunca em elemento estrutural. Sem sombra pesada: uma única elevação para cartão levantado e outra para folha inferior.

### 3.4 Density

Duas densidades, e a escolha de cada tela já está feita na coluna "Plataforma" do Doc 4.

| | Campo | Escritório |
|---|---|---|
| `--target` | 56px | 44px |
| Texto base | 17px / 500 | 15px / 400 |
| Padding horizontal | 20px | 16px |
| Ação primária | Largura total, fixa no rodapé | Alinhada à direita, em linha |

**Telas de campo:** `F-01`, `F-02`, `F-12`, `E-05`, `E-07`, `E-11`, `E-12`, `P-06`, `P-08`, `S-05`. Acontecem no mercado, na recepção ou depois do trabalho. Todo o resto é escritório.

---

## 4. Inventário de componentes

Extraído das ~60 telas do Doc 4. A regra de admissão: **três telas ou mais pedindo a mesma coisa**. O que aparece em uma tela só fica sendo composição, não componente.

### 4.1 Estrutura

| Componente | Telas | Notas |
|---|---|---|
| `AppShell` | todas | Barra de contexto (instituição · unidade · usuário) + navegação derivada de permissão. Entrada que a pessoa não pode usar **não aparece** — nunca desabilitada com cadeado. |
| `ScreenHeader` | todas | Sobrancelha (código da tela), título, subtítulo. |
| `WorkQueue` / `WorkQueueItem` | T-02 | Contagem, título, subtítulo, link direto à ação. Lista plana, ordem fixa (decisão Q6). |
| `BottomSheet` | F-01, E-06, E-10, P-02 | Escolha de conta, unidade, categoria, competência. Substitui `<select>` em densidade campo. |
| `ActionBar` | F-01, F-03, E-06… | Ação primária fixa no rodapé, densidade campo. |

### 4.2 Dado

| Componente | Telas | Notas |
|---|---|---|
| `AmountInput` | F-01 | Hero tipográfico, teclado decimal, aceita soma (`65+70`), nunca divide sozinho. |
| `AmountDisplay` | F-02..F-26, E-*, S-* | Mono tabular. Sinal vem da natureza, nunca embutido no valor (Doc 2, L1). |
| `RecordRow` | F-02, F-03, F-05, E-05 | **A assinatura.** Barra de estado à esquerda. |
| `StatusBadge` | ~20 telas | `A conferir` · `Confirmado` · `Estornado` · `Aguardando resposta`. |
| `SuggestionChip` | F-01, F-26, S-05 | Sugestão do sistema, um toque para aceitar. **Nunca aplicada sozinha.** |
| `DefaultField` | F-01 | Padrão preenchido e **visível**, editável em um toque. Padrão escondido é erro que ninguém revisa. |
| `Receipt` | F-01 (confirmação), F-24 | Cartão de recibo, borda superior serrilhada. |
| `AttachmentCapture` | F-01, F-11, P-08, E-13 | Um toque, direto da câmera. Nunca obrigatório. |
| `DataTable` | F-17..F-23 | Só escritório. Numerais tabulares, cabeçalho em rótulo. |

### 4.3 Domínio

Estes carregam regra, e por isso não são genéricos.

| Componente | Invariante que expressa | Como |
|---|---|---|
| `PendencyCard` | Doc 2, **L11** | Para o destinatário: caixa de resposta. Para quem conferiu: o campo de resposta está **ausente**, não desabilitado, com a razão em texto. |
| `ConfirmAction` | Doc 2, **L2** e **L7** | Diz que é irreversível *antes*. Quando bloqueado, nomeia a regra: "Não dá para confirmar sem categoria" — nunca "operação inválida". |
| `PeriodLock` | Doc 2, **L5**, **P1**, **P3** | Bloqueia com razão explícita; o caminho para reabertura só aparece para quem tem `periodo.reabrir`. |
| `TwoAxisGuard` | Doc 3, **A1** | Estado legítimo e explicado — "você tem acesso a esta tela, mas autorizar adiantamento exige vínculo de padrinho ou madrinha". **Não é erro de sistema.** |
| `RegimeVocabulary` | Doc 1 §4.3 | Provedor de contexto. Nenhum outro componente pode ter palavra de negócio escrita dentro. |

### 4.4 Estado

`SkeletonList` · `EmptyState` · `InfraError` · `DomainError` · `PermissionDenied`. Os cinco do Doc 4 §13, como variantes de primeira classe — não como caso de borda esquecido no fim da sprint.

O mais negligenciado é o **erro de domínio**. O sistema tem dezenas de invariantes, e cada uma vira uma frase que alguém lê em pé, com pressa, na chácara. Escrevê-las bem é parte do design.

---

## 5. Piso de qualidade

Condição de entrega, não meta.

- **Contraste:** texto essencial ≥ 4,5:1. `ink-subtle` é proibido em texto essencial.
- **Cor nunca sozinha:** todo estado tem rótulo em texto além da cor. A barra de assinatura é reforço.
- **Foco visível:** anel de 2,5px em `action`, deslocamento de 2px. Nunca removido.
- **Alvo mínimo:** 44px em qualquer densidade, 56px em campo — inclusive o `×` que remove um chip.
- **Movimento:** máximo 200ms, e só onde explica mudança de estado. `prefers-reduced-motion` zera tudo.
- **Sem armazenamento local:** protótipos rodam com estado em memória.

---

## 6. Handoff para o Claude Design

O Claude Design não enxerga este Projeto: ele tem projetos próprios, e o contexto entra por anexo. O procedimento:

1. **Criar o projeto** em `claude.ai/design`.
2. **Importar o sistema de design** por upload direto de `cdd-tokens.css` e `CDD-design-system.html`. Com o sistema importado, o Claude constrói com componentes reais e confere a própria saída contra eles antes de mostrar.
3. **Anexar como contexto** o Doc 4 (mapa de telas) e o Doc 3 (permissões). São os dois que evitam o erro mais caro: desenhar uma tela para o grupo errado.
4. **Pedir uma tela por vez, nomeando o grupo de acesso.** *"Desenhe F-03, fila de conferência, para o grupo Tesouraria, densidade escritório"* — não *"desenhe a tela de conferência"*.
5. **Exigir os cinco estados** em cada pedido. Se não forem pedidos, não virão.

**O que não delegar ao Claude Design:** o texto dos erros de domínio. Eles carregam regra e precisam ser escritos contra o Doc 2, não gerados por aproximação.

**Expectativa calibrada:** a importação vale o que vale a fonte, e o produto está em beta. O que sai de lá é protótipo, não verdade — a verdade continua sendo os Documentos 1 a 4.

---

## 7. Questões abertas

| # | Questão | Bloqueia |
|---|---|---|
| D1 | Archivo e Public Sans são substituíveis por famílias licenciadas se o centro já tiver alguma da identidade. Existe fonte oficial da marca além do wordmark? | Nada. Troca é um token. |
| D2 | `F-02` mistura acompanhar o próprio histórico e responder pendências. Se a maioria das visitas for para responder, a pendência merece entrada própria na fila. | Decidir após o teste de `F-01`/`F-02`. |
| D3 | O ciclo de valores nos padrões de `F-01` (toque para alternar) serve ao protótipo, não a quatro contas e quatro unidades. `BottomSheet` é a resposta — e muda o cálculo dos 30 segundos. | `F-01` de produção. |

---

*Documento derivado dos Documentos 1 a 4 e da identidade visual do centro. Toda cor, medida e componente aqui é rastreável a uma decisão anterior ou a um elemento da marca. Onde este documento diverge daqueles, prevalecem aqueles.*
