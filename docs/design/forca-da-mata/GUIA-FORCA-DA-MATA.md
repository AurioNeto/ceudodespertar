# Guia de Transição Força da Mata

Céu do Despertar · Sistema de Gestão · proposta visual · 10 de outubro de 2026

Versão em texto do guia visual (`index.html`, mesma pasta). O HTML mostra os componentes e as telas nos dois climas; este arquivo registra tokens, regras e o plano original. A proposta foi implementada pela épica concluída em 12/10/2026, com os ajustes registrados abaixo.

**Como ler este guia (atualizado em 30/10/2026):** a nota de implementação descreve a entrega e prevalece sobre a proposta original nas seções seguintes, incluindo "Decisões tomadas com o dono". O clima atual é escolhido manualmente no perfil, com Noite como padrão; troca automática, guardiões e foto continuam no roadmap da [TSK-603](../../../project-flow/tasks/TSK-603-fases-futuras-da-mata.md). O tema de e-mail foi entregue depois da épica, no #203.

## Nota de implementação (12/10/2026)

A épica `refactor/epica-redesign` levou o guia para o `apps/web` e, em alguns pontos, fez diferente do que ele propõe:

- **Nomes dos tokens mantidos.** O guia propõe um `clima.css` com aliases novos. A épica manteve os nomes do design system (`--color-royal`, `--color-pending` e os demais), porque as telas e os testes já os consumiam. Só os valores mudam, por `data-clima` na raiz (#174).
- **Escolha do clima.** A pessoa escolhe o clima em Meu perfil, e a escolha fica em `localStorage`, só no aparelho. O padrão é a Noite. Não há troca automática por densidade nem por hora, nem campo no backend (#175).
- **Forma de folha.** Entrou por tokens novos `--leaf-*`, incluindo as versões espelhadas para o que abre de baixo ou da lateral. Os `--radius-*` não foram tocados e ficaram só em barras, trilhos e células de grade (#176 a #178, telas em #182 a #186).
- **Etiquetas.** Usam `--tone-X-bg` e `--tone-X-fg`: cheias na Noite e suaves no Amanhecer, inclusive no tom `royal` (#176, #177).
- **Tipos de trabalho da Agenda.** Têm tokens próprios por clima, `--tipo-X`, `--tipo-X-bg` e `--tipo-X-fg`, no lugar das cores fixas (#185).
- **Gráficos.** Séries categóricas usam `--serie-1..3` em ordem fixa; quebras por categoria usam a rampa `--ramp-1..9`, recalculada para manter pelo menos 3:1 contra o cartão. Cor de estado não identifica série (#181).
- **Tema de login do Keycloak.** É fixo na Noite, porque o login não enxerga a escolha do app, e as fontes ficam hospedadas no próprio tema (#180).
- **Tailwind.** Saiu antes de tudo; o reset dos elementos nativos foi para o `base.css` (#173).
- **Códigos de tela.** Não entram na interface. Continuam como referência nos documentos (Doc 4, Doc 8 e este guia), e o cabeçalho das telas mostra só título, subtítulo e ações (decisão do dono, 12/10/2026).

Ficou fora da épica (a entrega posterior do e-mail está indicada no item):

- a fila de guardiões e o guardião por tela ou por pessoa;
- a foto no avatar;
- a cerimônia no registro rápido;
- o botão central "Registrar" da barra de campo;
- as animações de ambiente (seiva, vaga-lumes);
- a troca automática de clima;
- o tema de e-mail do Keycloak (entregue depois da épica, no #203: Amanhecer, Alegreya no título e assunto de convite "Sistema de Gestão CDD");
- os climas alternativos (`outras-horas-da-mata.html`).

Nenhuma fase usa captura de telas: a validação visual é do dono.

## Decisões tomadas com o dono

- Clima: **Noite no escritório, Amanhecer no campo**, escolha automática por densidade com troca manual no perfil.
- Painel (T-02): **fila de guardiões em cima, saldos e movimento embaixo**.
- Guardiões: **liberdade criativa**; o mapa abaixo deve ser validado com a casa antes da fase 3. **O beija-flor simboliza sempre a Munay** e não entra na escolha pessoal; a abelha fica com o registro rápido.
- Painel: **nada do dashboard atual sai** (saldo consolidado, movimento do mês, aviso de lote, carrossel de cerimônias com cartaz, estoque por lote); a fila entra no topo.
- Header: a **merkaba recortada da logo** ao lado do nome, no lugar da folha. Arquivo `merkaba.png` nesta pasta.
- Avatar: **foto da pessoa dentro da folha**, emoldurada pela pele do guardião escolhido; sem foto, iniciais.
- Registro rápido (F-01): o gasto pode ser **vinculado a uma cerimônia**, com a mais próxima sugerida.
- Entregável: página HTML + este Markdown, fora do repositório.

## 01 · Diagnóstico

O front roda a v3 do design system base (papel creme, tinta azul-royal, Archivo nos títulos, raio simétrico 6/10/14, tema claro único). A estrutura é sólida: densidade campo/escritório, barra de estado de 3px, cinco estados obrigatórios por tela, vocabulário por regime. Faltam alma e hierarquia:

| Lacuna de hoje | Onde | O que a mata faz |
|---|---|---|
| Header quase vazio; chip de unidade inerte; Sair só em Meu perfil | AppShell | Header útil: marca, unidade que troca, busca global, sino da fila, avatar com menu |
| Marca só em texto; avatar quadrado com duas letras | AppShell | Átomo `Marca` com a merkaba da logo; avatar com a foto da pessoa na folha do guardião |
| Login é título + botão; formulário real no Keycloak com CSS espelhado | Portao, tema cdd | Portão e formulário no mesmo quadro; tema do Keycloak consome `clima.css` |
| Painel virou dashboard; fila de trabalho sem tela; WorkQueue não existe | PainelPage | Fila de guardiões + raízes; WorkQueue nasce vestido |
| Cartões sem sombra; cópias locais | Cartao | Um cartão de folha com anel e sombra do tema |
| Tabelas cruas; DataTable sem uso | Faturas, Empréstimos, Parâmetros | DataTable vestido como único caminho |
| Select nativo; data em texto livre; gavetas à mão | Formulários | Select, seletor de data, Modal/Sheet no catálogo |
| Restos da v1; R$ inconsistente; códigos de tela trocados | Vários | Lint de cor literal; AmountDisplay único; códigos do Doc 4 |

Conflitos resolvidos pelo guia:

- "Pendência" não é estado (`A_CONFERIR` continua; `PENDENCIA_ABERTA` é evento). Vira o marcador **Pergunta aberta**.
- Doc 5 §2.2 (símbolo não entra no fundo das telas de trabalho): a flor fica só no fundo da aplicação, a 20%, em linha fina; nunca atrás de cartão, campo ou tabela.
- Login: o visual precisa ser portado para o tema do Keycloak, senão fica só no portão.

## 02 · Seis raízes

1. A mata é a superfície. O dado não muda.
2. Cada fila tem um guardião. Ele acompanha o rótulo do estado, nunca o substitui.
3. Textura em faixa, borda, selo ou respiro; nunca sob texto.
4. Movimento como respiração: ambiente lento e contínuo; resposta ao toque rápida e única; movimento reduzido apaga o ambiente.
5. Um clima por contexto (Noite sentado, Amanhecer em pé no sol).
6. A regra aparece em português: bloqueio, estado e pendência nomeiam a regra; metáfora só em título e apoio.

## 03 · Clima

Os aliases semânticos que o código já consome ganham dois conjuntos de valores. `data-clima="noite" | "amanhecer"` na raiz. Nenhum componente sabe em que clima está. Chuva fica como variante futura.

Regra de escolha: 1) preferência da pessoa no perfil (Noite, Amanhecer, Automático); 2) automático por densidade (campo → Amanhecer, escritório → Noite); 3) hora só refina o gradiente do topo no Noite. No login a hora manda (6h–17h Amanhecer).

### Tokens principais

| Token | Noite | Amanhecer | Uso |
|---|---|---|---|
| `--bg-app` | `#0B1F17` copa | `#E9EDD8` céu | Fundo; `--sky` é o gradiente |
| `--sky` | radial `#1F4A33 → #10301F → #0B1F17` | linear `#E9EDD8 → #D6DEC0` | |
| `--bg-card` | `rgba(10,28,20,.86)` | `#F7F5EA` | Cartão, painel, gaveta |
| `--bg-card-solid` | `#0E241A` | `#F7F5EA` | Campo, folha, modal |
| `--bg-sunken` | líquen 7% | musgo 7% | Faixa, cabeçalho de tabela, zebra |
| `--bg-hover` | líquen 10% | musgo 8% | Hover de linha e item |
| `--bg-rail` / `--bg-header` | `rgba(8,22,16,.62 / .76)` | papel 72% / 88% | Com desfoque |
| `--bg-paper` | `#FBF8EF` | `#FBF8EF` | Documento (login, recibo, prestação) |
| `--text-primary` | `#EDE6D3` | `#1B3324` | Leitura |
| `--text-title` | `#EDE6D3` | `#764C29` | Títulos (Alegreya) |
| `--text-secondary` / `--text-meta` | `#C9D1BD` / `#B5BFA8` | `#3E5444` / `#5B6B5E` | Apoio / metadado |
| `--text-field-label` | `#D8A949` | `#8A6539` | Rótulo em versalete |
| `--text-link` | `#A8C68F` | `#2F5D3A` | |
| `--text-on-paper` / `--title-on-paper` / `--label-on-paper` | `#1B3324` / `#764C29` / `#8A6539` | idem | Sobre `--bg-paper` |
| `--border-subtle` / `--border-section` / `--border-field` | líquen 14% / 26% / 38% | musgo 14% / 28% · `#C6CDB8` | |
| `--border-brand` | `#C9A66B` 60% | `#C9A66B` | Linha da flor da vida |
| `--action-bg` / `--action-bg-hover` / `--action-fg` | `#A8C68F` / `#BCD6A3` / `#0B1F17` | `#2F5D3A` / `#24452E` / `#F7F5EA` | Ação, foco, seleção |
| `--focus-ring` | `#A8C68F` | `#2F5D3A` | 2,5px, offset 2px |
| `--accent-label` | `#D8A949` | `#9A5B12` | Sobrancelha, ícone ativo |
| `--flower` | líquen 20% | musgo 20% | SVG, 0,8px |
| `--vine` | `#7A5233` + `#6FA35E` | `#7A5233` + `#4E8B4A` | Rail e laterais do login |
| `--shadow-raised` | `0 14px 34px rgba(0,0,0,.35)` | `0 10px 28px rgba(27,51,36,.14)` | |
| `--ring-card` | inset 1px líquen 22% | inset 1px musgo 18% | |

### Tons de estado

| Tom | Noite (etiqueta cheia: fundo / texto) | Amanhecer (etiqueta suave: fundo / texto) |
|---|---|---|
| pending (resina) | `#E3A93E` / `#0B1F17` | `#F8ECD9` / `#8F5714` |
| attention (urucum) | `#E3734E` / `#0B1F17` | `#F8E5DF` / `#9E3520` |
| period (rio) | `#7FB8C6` / `#0B1F17` | `#E1EEF1` / `#2E6E7E` |
| confirmed (folha firme) | `#A8C68F` / `#0B1F17` | `#E2F0E7` / `#1B6E40` |
| neutral (jenipapo) | `#8A96A3` / `#0B1F17` | `#EDEEF2` / `#5E6775` |
| suggest (flor do cipó) | `#B49AD8` / `#0B1F17` | `#EFE9F3` / `#5C3E75` |

Tokens por tom: `--tone-X`, `--tone-X-bg`, `--tone-X-fg`, `--tone-X-soft`.

### Contraste (WCAG 2, calculado)

| Par | Noite | Amanhecer |
|---|---|---|
| Texto principal / fundo | 13,8 | 11,4 |
| Texto principal / cartão | 14,2 | 12,4 |
| Apoio / cartão | 11,2 | 7,5 |
| Metadado / cartão | 9,2 | 5,1 |
| Rótulo de campo / fundo | 7,9 | 4,9 |
| Tinta / botão primário | 9,1 | 7,0 |
| Tinta / etiqueta A conferir | 8,2 | 5,4 |
| Tinta / etiqueta atenção | 5,6 | 6,4 |
| Tinta / etiqueta período | 7,8 | 5,3 |
| Tinta / etiqueta estornado | 5,7 | 5,9 |
| Tinta / etiqueta sugestão | 7,0 | 8,0 |
| Título marrom / papel | 7,0 | 7,0 |

Todos passam AA (4,5); a maioria passa AAA (7). O Amanhecer foi calculado, não testado ao sol: testar no celular antes da fase 4.

O CSS completo dos dois climas está em `tokens-clima.css` nesta pasta.

## 04 · Estado: o que o dado é

Cor de estado nunca é cor de ação; rótulo sempre em texto. Rótulo em tela: "Confirmado" (Doc 5), não "Consolidado".

| Módulo | Enum | Espera | Atenção | Período | Firmado | Neutro |
|---|---|---|---|---|---|---|
| Financeiro | `StatusLancamento` | A_CONFERIR | + marcador Pergunta aberta | | CONFIRMADO | ESTORNADO |
| Financeiro | `SituacaoConciliacao` | PENDENTE | | | CONCILIADA | NAO_APLICAVEL |
| Financeiro | `StatusLinhaExtrato` | NAO_CONCILIADA | | | CONCILIADA | IGNORADA |
| Financeiro | `StatusFatura` | ABERTA | vencida (derivado) | FECHADA | PAGA | |
| Financeiro | `StatusAdiantamento` | AGUARDANDO_AUTORIZACAO | RECUSADO | AUTORIZADO | RESSARCIDO | |
| Financeiro | `StatusDevolucao` | PENDENTE | atrasada (derivado) | | PAGA | CANCELADA |
| Financeiro | Período | | | ABERTO / FECHADO | | |
| Eventos | `StatusEvento` | PLANEJADO | | CONFIRMADO | REALIZADO | CANCELADO |
| Eventos | `StatusInscricao` | PENDENTE | | | CONFIRMADA | CANCELADA |
| Eventos | `StatusAnamnese` | PENDENTE | VENCIDA | | OK | NAO_APLICAVEL |
| Eventos | `StatusAcolhimento` | PENDENTE | | | REALIZADO | NAO_NECESSARIO |
| Eventos | `StatusContratacao` | PROPOSTA | | CONFIRMADA | REALIZADA | CANCELADA |
| Pessoas | `StatusFormulario` | RASCUNHO | | | PUBLICADA | ARQUIVADA |
| Estoque | `SituacaoLote` | | QUARENTENA | LACRADO | EM_USO | ESGOTADO |
| Estoque | `StatusFeitio` | EM_ANDAMENTO | | | CONCLUIDO | |
| Identidade | `SituacaoUsuario` | CONVITE_PENDENTE | SUSPENSO | | ATIVO | REVOGADO |
| Transversal | Sugestão do sistema | tom **suggest** em categoria proposta, par de conciliação, valor sugerido | | | | |

Marcador **Pergunta aberta**: contorno urucum sobre a etiqueta A conferir, com quem perguntou e quando. Resolve D2 (F-02 separa "preciso responder" de "histórico").

## 05 · Tipografia

- `--font-title`: Alegreya 700 (título de tela 48/30 campo, seção 24, cartão 18, contagem-herói 50; virtude em itálico 500 14; verso 20).
- `--font-label`: Alegreya Sans SC 700, 11–15px, tracking .14–.18em (rótulo de campo, sobrancelha, código de tela, guardião, seção do menu).
- `--font-body`: Public Sans 400/500/600, 15px escritório, 17px campo.
- `--font-data`: IBM Plex Mono 500/600, tabular-nums obrigatório; valor 15 / 22 / 44 (hero), tracking −.025em. R$ sempre.
- Archivo sai. Fontes do Google Fonts; se houver fonte oficial (D1), a troca é um token.

## 06 · Forma

Raio de folha: dois cantos opostos arredondados (superior direito e inferior esquerdo). Espelhado para o que abre de baixo (BottomSheet) e para a gaveta lateral.

| Token | Valor | Onde |
|---|---|---|
| `--leaf-xs` | 0 8 0 8 | etiqueta, contagem, chip |
| `--leaf-sm` | 0 14 0 14 | campo, item de menu, linha de lista, folha de opção |
| `--leaf-md` | 0 20 0 20 | botão, aviso |
| `--leaf-lg` | 0 28 0 28 | cartão, painel, gaveta |
| `--leaf-xl` | 0 36 0 36 | documento (login, recibo) |
| `--leaf-seal` | 0 100% 0 100% | selo, avatar, pegada |

Não entra em linha de tabela, divisor, barra de progresso, gráfico, célula de calendário. A pílula deixa de existir. A barra de estado de 3px à esquerda continua, na cor do tom.

## 07 · Textura

Geométrica, em CSS/SVG, sem imagem. Vive em faixa (84px escritório, 44px campo, com degradê para o cartão), selo (26/36/64px) e respiro (flor da vida 0,8px a 20%). Nunca atrás de texto.

Animais: onça, gavião, jiboia, beija-flor, jabuti (nova), coruja, pirarucu, cutia (nova), arara, garça (nova), tatu, abelha (nova), formiga (nova). Folhas e raízes: rainha, samambaia, musgo, palmeira, cipó, casca, flor da vida, orquídea (nova), folha seca, papel de casca. Os valores CSS estão em `tokens-texturas.css`.

## 08 · Guardiões e selos

Um guardião por módulo ou fila. O beija-flor é a Munay em qualquer lugar do sistema (unidade, lojinha, venda) e por isso não entra na escolha pessoal de guardião.

| Guardião | Qualidade | Domínio |
|---|---|---|
| onça | paciência e atenção | Conferência · F-03, F-05 |
| gavião | visão do alto | Pendências devolvidas · marcador Pergunta aberta |
| jiboia | troca de pele | Fechamento · F-22 |
| beija-flor | mensageiro do amor; é a Munay, sempre | Munay: lojinha, vendas, regime comercial · selo da unidade |
| jabuti | carrega a casa, paciência longa | Contas e fundo · F-07, F-14 |
| cutia | enterra e volta buscar | Faturas, empréstimos, adiantamentos, devoluções · F-09 a F-13, E-09 |
| pirarucu | força do rio | Conciliação · F-25, F-26 |
| coruja | enxerga no escuro | Relatórios e prestação de contas · F-17 a F-20, F-24 |
| arara | festa e voz | Agenda, cerimônias, inscrição, contratações · E-01 a E-13 |
| garça | acolhe quem chega | Pessoas, anamnese, acolhimento, leitos · P-01 a P-10, E-10, E-15 |
| tatu | guarda e proteção | Estoque e feitio · S-01 a S-08 |
| abelha | vai de flor em flor e traz para a colmeia | Registro rápido · F-01, F-02 |
| formiga | ordem na trilha, cada uma no seu papel | Sistema · A-01 a A-04 |

Selos de unidade: CDD = merkaba da logo, Chácara = samambaia, Munay = beija-flor. Pegada: cada pessoa escolhe seu animal em Meu perfil; na linha de lista a pegada é a foto da pessoa na folha do guardião (sem foto, a pele do guardião); a cor da barra continua sendo o estado.

## 09 · Componentes vestidos

A API não muda; os tokens mudam. Novos no catálogo: `Marca`, `Selo`, `AvatarDeFolha`, `WorkQueueItem`, `Modal`.

- **AvatarDeFolha**: foto da pessoa cortada em quadrado no envio e exibida na forma de folha (0 100% 0 100%) por CSS; moldura de 2 a 6px com a pele do guardião escolhido; tamanhos 132 (Meu perfil), 96 (ficha), 48 (gaveta), 36 (header), 28 (pegada). Sem foto, iniciais sobre musgo. Em Meu perfil: trocar foto, escolher guardião (beija-flor fora da lista), clima.

- **Button**: primary (líquen/musgo), ghost, quiet, suggest, danger (só estorno). Bloqueado nomeia a regra abaixo. Campo: 56px, 16,5px.
- **TextField / Select / Data**: rótulo versalete; raio `--leaf-sm`; anel 1,5px; foco com anel na ação e halo 3px; erro urucum com regra em texto. Select deixa de ser nativo; data ganha seletor.
- **StatusBadge**: folha pequena; cheia no Noite, suave no Amanhecer; `flag` para Pergunta aberta.
- **NavItem**: ativo em folha com anel e ícone ouro; contagem em folha resina.
- **WorkQueueItem**: faixa com a pele do guardião respirando (14s calma, 6s atenta ≥14 dias, 2,4s urgente ≥45), contagem Alegreya na cor do tom, etiqueta, título, apoio, virtude, idade em texto. Clique abre a tela filtrada.
- **RecordRow**: pegada (selo 34px) + barra de estado 3px + descrição + valor mono + meta + etiqueta.
- **Estados**: EmptyState (borda tracejada dourada, flor ao fundo, "Nada aguarda você"), Skeleton (brilho 1,4s), DomainError (urucum), InfraError (resina + tentar de novo), PeriodLock (rio), PermissionDenied/TwoAxisGuard (jenipapo).
- **Receipt**: papel de casca, régua dourada, valor mono 38 marrom, etiqueta sempre na versão suave, rodapé diz para que fila o item foi.
- **DataTable**: zebra líquen 7%, cabeçalho fixo versalete, número à direita tabular.
- **BottomSheet / Modal**: folha espelhada, opções 52px, foco preso, Esc fecha, × de 56px no campo.
- **Marca / Selo**: a merkaba recortada da logo (16, 32 e 40px) + nome Alegreya + tagline versalete; no login, a logo completa sobre papel.

## 10 · Shell

Escritório: grid 240px / 56px. Header: Marca (merkaba) · unidade com o próprio símbolo (merkaba CDD, beija-flor Munay; troca de verdade: filtra, pré-preenche, comuta regime; Q5 resolvida como "filtra e pré-preenche") · busca global ⌘K · sino da fila · pessoa (nome, grupo, guardião; foto na folha do guardião; menu com Meu perfil, Clima, Trocar unidade, Sair). Rail com cipó (seiva 14s), seções em versalete, item ativo em folha. ScreenHeader com selo do guardião, código do Doc 4, unidade, resumo da fila e as ações primárias.

Campo (≤900px): header 60px (marca, unidade, sino, avatar); barra inferior com Painel, Meus registros, **Registrar** (botão central 56px em folha), Conferência, Menu (folha espelhada com seções e Meu perfil). Amanhecer por padrão; partículas desligadas.

Sai: chip "CDD ▾" inerte, quadrado royal, faixa royal de 2px no ScreenHeader, flor a 33% atrás de cartão e tabela.

## 11 · Telas-âncora

- **T-00 Login**: mata ao fundo, cipó nas laterais, cartão de papel com a logo, "Entrar", campos, botão verde, verso do dia. Portão do app e formulário do Keycloak no mesmo quadro; recusas como aviso dentro do cartão. Clima pela hora.
- **T-02 Painel** (nada do atual sai): saudação com resumo do dia + Registrar; guardiões (onça, gavião, jiboia) com contagem e idade; aviso do lote lido pela IA em tom sugestão com "Verificar lote"; saldo consolidado (hero, caixa, banco, fundo próprio, selo jabuti) ao lado do movimento do mês comparado ao anterior (entradas, saídas, resultado) com a série de seis meses; carrossel com os três painéis de hoje (próxima cerimônia com cartaz, metas, inscritos/sem pagamento/primeira vez/anamnese e pontos de atenção marcados como sensíveis; resultado por cerimônia; última cerimônia com contribuições, custos, resultado, média e litros); estoque de ayahuasca por lote; Trilha com a foto de quem registrou.
- **F-01 Registrar em campo** (Amanhecer, 390px): valor primeiro com teclado numérico e chips dos últimos valores (D3); segmento entrada/saída/transferência; descrição; categoria sugerida em um toque; conta pré-preenchida pela unidade; **cerimônia opcional, com a mais próxima já sugerida** (o gasto compõe o resultado por cerimônia e o filtro de Relatórios); câmera opcional; Registrar fixo 56px; recibo em casca com a linha Cerimônia e "Registrar outro". Guardião da tela: abelha.
- **F-05 Conferência**: lista com seleção múltipla e atalhos (J, K, C, P, E), filtros em chips, detalhe em gaveta com comprovante, Pergunta aberta (campo só para quem responde), linha do tempo com tom por evento, Confirmar / Perguntar / Estornar; par de extrato sugerido na mesma fila em flor do cipó com pegada pirarucu.
- **F-22 Fechamento**: checklist como trilha com link para o que falta; botão bloqueado nomeia a regra e o número; troca de pele (900ms, uma vez) ao concluir; depois PeriodLock único e reabertura explicada.

## 12 · Dados e gráficos

Regras: um eixo só (nunca dois eixos y); marcas finas (barras 26–40px com canto 2px, linhas 2px, pontos 8px com anel na cor do cartão); grade recessiva; rótulo, eixo e legenda em tinta e metadado, nunca na cor da série; legenda sempre que há duas séries, rótulo direto só nos pontos que importam; vista de tabela para todo gráfico; cor de estado nunca vira série.

Paleta categórica validada (daltonismo e contraste, nos dois climas): `--serie-1 #6FA35E` verde, `--serie-2 #3987E5` rio, `--serie-3 #C98500` ouro; no máximo três séries por gráfico, a quarta vira "outros". Quebra por categoria usa a rampa de um verde só (`--ramp-1..6`: Noite `#B9DBA3 → #2F6E3A`, Amanhecer `#2F5D3A → #B2D49C`).

Gráficos e telas de dados desenhados no HTML:
- Série do período (Relatórios F-17): bipolar, entradas acima do zero, saídas abaixo, acumulado em linha de tinta.
- Resultado por cerimônia (Painel, painel 2 de 3): linha com área; ponto negativo em urucum com rótulo; clique abre o recorte da cerimônia em Relatórios, alimentado pelos gastos vinculados no registro.
- Quebra por categoria (Relatórios F-18): barras ou rosca, mesma cor por item; total em linha, fora do centro.
- Última cerimônia (Painel, painel 3 de 3): cartaz, participantes, contas fechadas, contribuições, custos, resultado, média por participante, litros servidos.
- Ayahuasca (S-01): indicadores Em estoque / Reservado / Livre / Previsto até o mês / Em quarentena; lotes com barra de proporção, situação no tom certo (em uso = firmado, lacrado = período, quarentena = atenção, esgotado = neutro) e guardião do lote com foto; reservas por trabalho; movimentos com tom por tipo; estoque após cada cerimônia por lote (barra cheia = sobrou, hachura = consumido, linha pontilhada = feitio).
- Feitio (S-04): gasto até agora e litros previstos; "fazer ou comprar" como barra de proporção com custo por litro.
- Leitos (E-10): grade por noite com ocupado / reservado sem pagamento / livre.
- Compromissos (F-10, E-13): BarraDeProporcao para empréstimo devolvido, teto do MEI e adiantamento a ressarcir; tom de atenção só quando passa do limite.

## 13 · Fluxos e UX

| Percurso | Hoje | Proposta |
|---|---|---|
| Entrar e voltar | portão com um botão; Sair só em Meu perfil | um quadro para portão e formulário; menu do avatar com Sair, Clima, Trocar unidade; preferências no perfil; verso do dia |
| Ver o que pede ação | dashboard; fila sem tela | guardiões com contagem e idade; sino no header; saldos abaixo |
| Registrar em campo | formulário completo; BottomSheet de valores; R$ às vezes ausente | fluxo de cinco toques; chips de valor; sugestão em um toque; conta pela unidade; recibo diz o que vem depois; F-02 separa responder de histórico |
| Conferir e perguntar | sem atalhos; pendência como estado | lote + atalhos; Pergunta aberta como marcador; PendencyCard; linha do tempo com tom; extrato sugerido na fila |
| Fechar o período | checklist e botão; componentes reimplementados | trilha com links; bloqueio nomeado; troca de pele; PeriodLock único |
| Conciliar | três colunas; sugestão sem destaque | sugestão em flor do cipó com aceitar/dispensar; pegada pirarucu; "ignorar" explicado |
| Compromissos (F-09 a F-13, E-09) | quatro layouts | um padrão: lista com tom, gaveta, DataTable; tom derivado da data; cutia |
| Cerimônias | carrossel de cartazes no painel | faixa de palmeira por cerimônia; cartaz na Agenda; anamnese vencida em atenção; inscrição pública em papel |
| Pessoas | avatar de letras; dado sensível sem marca | selo; bloco sensível com fio dourado e "leitura registrada"; leitos em grade |
| Sistema | abas e tabelas cruas | DataTable; matriz de permissões com selo; auditoria em linha do tempo; selo do favo |

Transversais: contraste AA nos dois climas; foco 2,5px; alvos 44/56; diálogo com foco preso; movimento reduzido respeitado; cor nunca é o único canal; R$ e tabular em todo valor; entrada folha / saída tinta / estorno jenipapo (vermelho é atenção, não saída); dd/mm e mm/aaaa; ⌘K, J/K/C/P/E, "/" foca o filtro.

## 14 · Movimento e voz

| Movimento | Tempo | Regra |
|---|---|---|
| Seiva no cipó | 14s linear contínuo | só Noite |
| Raio de luz | 7–11s opacidade | só Noite; nunca atrás de texto |
| Vaga-lume | 6–12s | desligável; nunca no campo |
| Pele que respira | 14s / 6s / 2,4s | pela idade do mais antigo; idade em texto |
| Resposta ao toque | 120ms hover; 900ms onda | só ao tocar |
| Troca de pele | 900ms, 8 tiras, uma vez | só no fechamento |
| Esqueleto | 1,4s brilho | sem spinner |

Voz: estado primeiro, guardião acompanha; a frase nomeia a regra; metáfora em título e apoio, nunca em campo; sem solenidade, emoji ou agradecimento vazio; vocabulário do regime; o que acontece depois está escrito.

## 15 · Plano de transição

| Fase | Escopo | Critério de pronto | Observação |
|---|---|---|---|
| 0 · Durante a refatoração | nenhum pixel muda; primitivos novos do Doc 8 recebem props `tone`, `seal`, `band`; lint proíbe cor literal fora de `tokens/`; Archivo vira só token | nenhum `#`/`rgba(` fora de `tokens/`; catálogo do Doc 8 completo; Tailwind removido | depende das etapas pendentes do Doc 8 |
| 1 · Clima, fonte e forma | `tokens/clima.css`, `data-clima` por densidade e perfil, Alegreya + Alegreya Sans SC, raios de folha, `tokens/texturas.css`; tema Keycloak importa o mesmo arquivo | 29 telas capturadas em 2 viewports × 2 climas sem cor quebrada; contraste medido; reduced-motion | risco: resíduos da v1; o lint é a rede |
| 2 · Componentes | Button, Badge (+ flag), TextField, Select, Data, Cartao, RecordRow com pegada, EmptyState, Skeleton, avisos, Receipt, DataTable, BottomSheet, Modal, Marca, Selo, Avatar | catálogo de demonstração nos dois climas; teste estrutural contra cor literal; apêndice do Doc 5 | vai ao crivo |
| 3 · Shell, login e Painel | AppShell (header útil, rail com cipó, barra do campo), ScreenHeader com selo e código, Portão + Keycloak, Painel com WorkQueue e raízes, preferências em Meu perfil | percursos 1 e 2 do Doc 4 de ponta a ponta nos dois climas; Sair de qualquer tela | depende de endpoint de preferências (até lá, automático) |
| 4 · Telas-âncora e módulos | F-01, F-05, F-22; depois um PR por módulo na ordem do Doc 4 §12 | cinco estados por tela; guardião certo; códigos corrigidos; R$ em todo valor | respeita fonte mock/API de cada tela |
| 5 · O que a mata ainda pode fazer | guardião que reage, floresta que cresce, rastro completo, Chuva, som opt-in, recibo com compartilhar | só com medição da fase anterior | som e Chuva só com pedido do centro |

Mapa de aliases v3 → mata: `--color-paper`→`--bg-app`; `--color-surface`→`--bg-card`; `--color-surface-warm`→`--bg-paper`; `--color-ink`→`--text-primary`; `--color-ink-brand`→`--text-title`; `--color-royal`→`--action-bg`; `--color-suggest`→`--tone-suggest`; `--color-pending`→`--tone-pending`; `--color-confirmed`→`--tone-confirmed`; `--color-attention`→`--tone-attention`; novo `--tone-period`; `--color-neutral`→`--tone-neutral`; `--radius-*`→`--leaf-*`; `--font-display` Archivo→`--font-title` Alegreya + `--font-label` Alegreya Sans SC.

## 16 · Pendências

Do centro: validar o mapa de guardiões (sentido espiritual; beija-flor = Munay já decidido); fonte oficial (D1); selo da Chácara (samambaia é proposta); som e Chuva fora da transição.

Do time: campo de preferências na API (clima, guardião, vaga-lumes) e upload da foto de perfil (corte quadrado no envio); campo `cerimonia_id` opcional no lançamento; tema do Keycloak consumindo `clima.css` (TSK-416); teste de contraste ao sol antes da fase 4; lint de cor literal como pré-requisito da fase 1; reescrever o Doc 5 depois da fase 2.

## Apêndice

Climas alternativos (referência para ideia futura, só cor e ambiente): `outras-horas-da-mata.html` nesta pasta. Fogueira na noite, Chuva, Roda de cachimbo e Miração sagrada; cada um é um bloco `[data-clima]` a mais no `clima.css`, com a ação e a sobrancelha escolhidas para não disputar com as seis cores de estado.

Fontes: `https://fonts.googleapis.com/css2?family=Alegreya:ital,wght@0,500;0,700;1,400;1,500&family=Alegreya+Sans+SC:wght@700&family=Public+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap`

Origem: conceitos Painel, Login e Guia Força da Mata (Claude Design, com o design system base v3 embutido); `apps/web/src/ds/`, `AppShell.tsx`, `Portao.tsx`, tema `infra/keycloak/themes/cdd`; Doc 4 v0.3, Doc 5 v1.0, Doc 8 v1.0; `packages/contracts/src`.
