# Sistema de Gestão — Céu do Despertar (CDD)

## Documento 2 de 4 — Modelo de Domínio

**Versão 2.2** · Autor: Aurio Neto · Data: agosto/2026 · Status: consolidado

> Pressupõe a leitura do **Documento 1 — Arquitetura e Estratégia**, em especial o glossário (§2) e o regime de unidade (§4.3).
> As permissões citadas neste documento estão definidas no **Documento 3 — Identidade, Acesso e Permissões**.
> As telas que consomem estes agregados estão no **Documento 4 — Mapa de Telas e Navegação**.

### Mudanças da v2.1 → v2.2

Duas alterações, ambas originadas no desenho de telas (Doc 4 §14.1) e propagadas para cá. São a primeira evidência prática do método design-first (Doc 1 §8.1): a interface exigiu precisão que a especificação textual deixara implícita.

| # | Alteração | Seções | Origem |
|---|---|---|---|
| 1 | `StatusLancamento`: `RASCUNHO` → **`A_CONFERIR`** | §1.3, §1.10, §1.14, §5.1.1 | Doc 4, decisão Q2 |
| 2 | **`Lancamento.pendencias`** — novo campo, com invariantes L10 e L11 | §1.3, §1.13, §1.14 | Doc 4, decisão Q1 |

**Sobre a alteração 1.** "Rascunho" descreve mal o fato: quem pagou uma recarga de extintor não rascunhou nada — afirmou um fato que ainda não foi conferido. O termo sugeria tentatividade e, pior, que o registro *ainda não conta*, desincentivando justamente o comportamento mais caro de conseguir. A renomeação é de **linguagem ubíqua**, não de rótulo de tela: o mesmo nome no código, no banco e na interface (Doc 1 §1.3, princípio 1). O `RASCUNHO` de `FormularioDeAnamnese` (§3.4.1) **permanece** — ali a coordenação está genuinamente rascunhando, e a renomeação torna explícito que os dois nunca foram o mesmo conceito.

**Sobre a alteração 2.** O Doc 1 §5.3 sempre pressupôs "registro em rascunho **com pendência**", mas o agregado não modelava a pendência — havia apenas `status`. Sem o campo, a conferência que encontra um lançamento sem categoria não tem como perguntar a quem gastou, e o ciclo se fecha fora do sistema, no WhatsApp. Era o retrabalho que o projeto existe para eliminar, sobrevivendo dentro dele.

---

## Convenções deste documento

- **Raiz de agregado** define fronteira transacional: tudo dentro é salvo junto, tudo fora é referência por ID.
- **Referência entre contextos é sempre por ID**, nunca por objeto. Não há chave estrangeira cruzando schema.
- Toda raiz de agregado carrega `instituicaoId` no construtor (Doc 1 §4.2). Omitido nas assinaturas abaixo por brevidade, mas **não é opcional**.
- Campos `readonly` são imutáveis após a criação; campos `private` mudam apenas por método do agregado.
- **Invariante** é regra verificada pelo domínio e que faz a operação falhar. Regra que só a interface respeita não é invariante — é conveniência.

---

# 1. Contexto Financeiro

Core domain. Módulo `financeiro`, schema `financeiro`.

## 1.1 `Unidade` (raiz de agregado)

Formaliza o que a planilha chama de *Grupo*. É dimensão de relatório e portadora do regime.

```typescript
type RegimeDaUnidade = 'CONTRIBUICAO' | 'COMERCIAL';

class Unidade {
  readonly id: UnidadeId;
  readonly codigoSistema: string;                  // 'CDD', 'MUNAY', 'LOJINHA'
  private nome: string;                            // rótulo editável
  private regime: RegimeDaUnidade;
  private documentoFiscal: CNPJ | null;
  private tetoFaturamentoAnual: Dinheiro | null;
  private ativa: boolean;

  get vocabulario(): Vocabulario                   // deriva do regime
  get exigeNotaFiscal(): boolean                   // regime === COMERCIAL && documentoFiscal !== null
}
```

**Invariantes**

| # | Regra |
|---|---|
| U1 | `codigoSistema` é imutável e único na instituição. Regras de negócio referenciam o código, nunca o nome. |
| U2 | Unidade de regime `COMERCIAL` com `documentoFiscal` preenchido exige `tetoFaturamentoAnual` definido, para viabilizar o indicador de teto. |
| U3 | Mudança de regime só é permitida com nenhum lançamento no período contábil aberto — mudar regime no meio do mês invalida a classificação já feita. |
| U4 | Unidade inativa não aceita novo lançamento; o histórico permanece. |

> **Por que o regime vive aqui e não em Eventos:** o regime determina categorias e obrigação fiscal, que são conceitos financeiros. Eventos consome o regime da unidade por referência, mas não o define.

## 1.2 `PlanoDeContas` — `Categoria` (raiz de agregado)

```typescript
type Natureza = 'RECEITA' | 'DESPESA';
type TipoCategoria = 'OPERACIONAL' | 'INVESTIMENTO' | 'MANUTENCAO' | 'PATRIMONIAL';

class Categoria {
  readonly id: CategoriaId;
  readonly codigoSistema: string;                  // 'CONTRIB_CDD', 'CACHE_PAGO', 'CACHE_RECEBIDO'
  private nome: string;                            // "Custo Feitio"
  readonly natureza: Natureza;
  readonly tipo: TipoCategoria;
  private regimesPermitidos: RegimeDaUnidade[];    // novo na v2.0
  private unidadePadraoId: UnidadeId | null;
  private linhaRelatorio: string;
  private ativa: boolean;
}
```

**Invariantes**

| # | Regra |
|---|---|
| C1 | Toda categoria ativa **deve** ter `linhaRelatorio` preenchida. Resolve o buraco atual: *Investimento na Lojinha* e *Movimentação* não tinham linha no DRE e R$ 40,6 mil ficaram órfãos sem que isso fosse sinalizado como erro. |
| C2 | `natureza` é imutável. Uma categoria não muda de lado. Se precisar dos dois lados, são duas categorias. |
| C3 | Categoria só pode ser usada por unidade cujo regime conste em `regimesPermitidos`. |
| C4 | Categoria com lançamento confirmado não pode ser excluída — apenas inativada. |

**Consequência direta da v2.0 — desambiguação do cachê:**

| `codigoSistema` | Nome | Natureza | Regimes | Uso |
|---|---|---|---|---|
| `CACHE_PAGO` | Cachê a músico | `DESPESA` | `COMERCIAL` | Munay paga o músico |
| `CACHE_RECEBIDO` | Cachê de contratação | `RECEITA` | `COMERCIAL` | Contratante paga a Munay |
| `CONTRIB_CDD` | Contribuição | `RECEITA` | `CONTRIBUICAO` | Cerimônia do centro |
| `VENDA_MERCADORIA` | Venda de mercadoria | `RECEITA` | `COMERCIAL` | Lojinha |

Sem essa separação, o DRE da Munay soma receita e despesa do mesmo evento na mesma linha.

## 1.3 `Lancamento` (raiz de agregado)

O registro atômico de movimentação. Substitui a linha da aba *Lançamentos*.

```typescript
type StatusLancamento = 'A_CONFERIR' | 'CONFIRMADO' | 'ESTORNADO';

type OrigemLancamento =
  | 'MANUAL'                  // digitado por usuário
  | 'INTEGRACAO_EVENTOS'      // gerado por pagamento de contribuição ou contratação
  | 'INTEGRACAO_ESTOQUE'      // sugerido por compra de insumo
  | 'IMPORTACAO_EXTRATO'      // proposto a partir de OFX/CSV
  | 'IMPORTACAO_TEXTO';       // proposto a partir de mensagem

// v2.2 — pergunta endereçada de volta a quem registrou
class Pendencia {
  readonly id: PendenciaId;
  readonly texto: string;                      // "de qual cerimônia foi esta compra?"
  readonly abertaPor: UsuarioId;               // quem confere
  readonly destinatario: UsuarioId;            // sempre o `registradoPor` do lançamento
  readonly abertaEm: DataHora;
  private resposta: string | null;
  private resolvidaEm: DataHora | null;

  get aberta(): boolean
  responder(texto: string, por: UsuarioId): Result<void, DomainError>
}

class Lancamento {
  readonly id: LancamentoId;
  readonly unidadeId: UnidadeId;
  readonly categoriaId: CategoriaId;
  readonly contaId: ContaId;
  readonly valor: Dinheiro;                    // sempre positivo
  readonly natureza: Natureza;                 // herdada da Categoria
  readonly dataCompetencia: DataLocal;         // quando o fato ocorreu
  private dataCaixa: DataLocal | null;         // quando o dinheiro se moveu
  private descricao: string;
  private eventoId: EventoId | null;
  private pessoaId: PessoaId | null;           // fornecedor, prestador, beneficiário
  readonly origem: OrigemLancamento;
  readonly registradoPor: UsuarioId;
  private anexos: Anexo[];
  private status: StatusLancamento;
  private estornoDe: LancamentoId | null;
  private conciliacao: Conciliacao | null;     // ver §1.11
  private pendencias: Pendencia[];             // v2.2

  static registrar(dados): Result<Lancamento, DomainError>
  confirmar(por: UsuarioId): Result<void, DomainError>
  registrarPendencia(texto: string, por: UsuarioId): Result<Pendencia, DomainError>
  responderPendencia(id: PendenciaId, texto: string, por: UsuarioId): Result<void, DomainError>
  estornar(motivo: string, por: UsuarioId): Result<Lancamento, DomainError>
  vincularAEvento(eventoId: EventoId): Result<void, DomainError>
  anexar(anexo: Anexo): void
  conciliar(linhaExtrato: LinhaExtratoId): void
}
```

**Regime contábil: competência.** `dataCompetencia` é obrigatória e é o eixo dos relatórios; `dataCaixa` é registrada quando conhecida e alimenta o fluxo de caixa. Corrige o problema em que despesa de fevereiro aparece em junho por ter sido comunicada com atraso. O próprio grupo já sinaliza a data real entre parênteses nas mensagens ("ração cavalos (23/02)"), o que mostra que a intenção sempre foi competência.

**Invariantes**

| # | Regra | Problema que resolve |
|---|---|---|
| L1 | `valor > 0`. O sinal nunca é embutido no valor — vem de `natureza`. | Categoria como *Doação CDD* aparecendo ora como entrada, ora como saída |
| L2 | Lançamento `CONFIRMADO` é **imutável**. Correção só via estorno + novo lançamento. | Edição na planilha não deixa rastro |
| L3 | `natureza` sempre igual à da `Categoria`. Não é campo independente. | Ambiguidade de natureza |
| L4 | `categoriaId` deve pertencer ao plano ativo e permitir o regime da `unidadeId` (C3). | Lançar "venda" no CDD ou "contribuição" na Lojinha |
| L5 | Lançamento em `PeriodoContabil` fechado não pode ser criado nem estornado sem reabertura registrada. | Ajuste silencioso em mês fechado |
| L6 | `dataCaixa >= dataCompetencia` quando ambas presentes. | Caixa antes do fato gerador |
| L7 | Só é confirmável com `categoriaId`, `contaId`, `unidadeId`, `valor` e `dataCompetencia` preenchidos. `A_CONFERIR` admite lacuna; confirmado não. | Lançamento incompleto virando definitivo |
| L8 | Lançamento de origem `INTEGRACAO_EVENTOS` não é editável por comando manual — só pelo fluxo que o gerou. | Divergência entre inscrição e lançamento |
| L9 | Estorno herda `dataCompetencia` do original, salvo decisão explícita registrada no motivo. | Estorno "consertando" competência sem registro |
| L10 | Pendência só se abre em lançamento `A_CONFERIR`, e seu `destinatario` é sempre o `registradoPor`. **Resolver pendência não altera `status`.** | Pendência virando um quarto estado por acidente |
| L11 | Só responde à pendência o próprio `destinatario`. Quem confere pode reabrir a pergunta, não respondê-la por ele. | Conferência "resolvendo" a lacuna por suposição — que é a origem do dado errado que ninguém rastreia |

**Sobre L10 e L11 — por que a pendência não é um estado.** A tentação é criar `DEVOLVIDO` como quarto valor de `StatusLancamento`. Seria errado: o lançamento devolvido continua exatamente onde estava — aguardando conferência — e a única diferença é *de quem* o sistema espera uma ação. Estado descreve o lançamento; pendência descreve uma conversa sobre ele. Modelar a conversa como estado faria o fechamento de período (P1) e a fila de conferência terem de conhecer os dois valores para dizer a mesma coisa.

L11 é a que carrega mais peso. Quem confere **não sabe** para que foi a compra; se pudesse responder no lugar de quem gastou, preencheria por suposição — e suposição confirmada é indistinguível de fato registrado. É a mesma razão de L8, aplicada na direção oposta: cada um afirma apenas o que de fato sabe.

**Sobre L8 e a fronteira do Acolhimento.** Quando o Acolhimento marca o pagamento de uma inscrição, o sistema gera um `Lancamento` com `origem = INTEGRACAO_EVENTOS`. Isso **não** significa que o Acolhimento tenha permissão financeira: ele registra um **fato de domínio** ("fulano pagou a contribuição"), e a consequência financeira é derivada pelo sistema, não composta por ele. Ele não escolhe conta, nem categoria, nem competência — tudo vem da configuração do evento. E não pode editar nem estornar o lançamento resultante. Detalhe em Doc 3 §7.3.

## 1.4 `Transferencia` (raiz de agregado)

Resolve a categoria *Movimentação* e as transferências entre contas ("3840 movim. Ayahuasca pra caixinha, Cora para Nubank Paty").

```typescript
class Transferencia {
  readonly id: TransferenciaId;
  readonly contaOrigemId: ContaId;
  readonly contaDestinoId: ContaId;
  readonly valor: Dinheiro;
  readonly data: DataLocal;
  readonly descricao: string;
  readonly registradoPor: UsuarioId;
  readonly finalidade: FinalidadeTransferencia;
}

type FinalidadeTransferencia =
  | 'MOVIMENTACAO_SIMPLES'
  | 'APORTE_A_FUNDO'
  | 'PAGAMENTO_DE_FATURA'
  | 'RESSARCIMENTO_DE_ADIANTAMENTO'
  | 'CONCESSAO_DE_EMPRESTIMO'
  | 'DEVOLUCAO_DE_EMPRESTIMO'
  | 'REPASSE_ENTRE_UNIDADES';
```

**Invariantes**

| # | Regra |
|---|---|
| T1 | **Transferência não afeta resultado do período.** Move saldo entre contas. Hoje, R$ 3.840 de movimentação para a caixinha entram como se fossem despesa. |
| T2 | `contaOrigemId ≠ contaDestinoId`. |
| T3 | `finalidade` determina o agregado correlato obrigatório: `APORTE_A_FUNDO` exige `FundoId`; `PAGAMENTO_DE_FATURA` exige `FaturaId`; e assim por diante. |
| T4 | Transferência em período fechado segue L5. |

> `finalidade` é novidade da v2.0. Sem ela, toda transferência parece igual, e a conciliação não consegue distinguir "pagamento de fatura" de "movimentação para o fundo" — que se comportam de forma diferente no fluxo de caixa.

## 1.5 `Conta` (raiz de agregado)

```typescript
type TipoConta = 'CONTA_CORRENTE' | 'CARTAO_CREDITO' | 'DINHEIRO' | 'FUNDO';
type Titularidade = 'INSTITUCIONAL' | 'PESSOAL_DE_TERCEIRO';

class Conta {
  readonly id: ContaId;
  private nome: string;                        // "CC Cora CDD"
  readonly tipo: TipoConta;
  readonly titularidade: Titularidade;
  readonly pessoaTitularId: PessoaId | null;
  private unidadePadraoId: UnidadeId | null;
  private saldoInicial: Dinheiro;
  private identificadorBancario: string | null;  // banco+agência+conta, para casar OFX
  private ativa: boolean;
}
```

**Invariantes**

| # | Regra |
|---|---|
| CT1 | `titularidade === PESSOAL_DE_TERCEIRO` exige `pessoaTitularId`. |
| CT2 | Despesa lançada em conta pessoal **deve** ter `Adiantamento` correspondente (§1.8). Não existe despesa em conta de terceiro sem adiantamento. |
| CT3 | Conta com saldo diferente de zero não pode ser inativada. |
| CT4 | `identificadorBancario` é único quando preenchido — evita importar o mesmo extrato em duas contas. |

**Ponto de atenção real:** das 9 contas em uso, várias são pessoais (Cartão Paty Itaú, CC Itaú Paty, CC Nubank Paty, CC C6 Paty, CC Caixa Carlão, CC Nubank Carlão). Pessoas físicas financiam o centro e depois são ressarcidas. `titularidade` torna isso explícito e habilita o controle de reembolso — hoje inexistente e origem de lançamentos ambíguos ("estorno compras cartão crédito Paty", R$ 1.067,67 + R$ 1.700,86).

## 1.6 `Fatura` (raiz de agregado)

Aplica-se a contas `CARTAO_CREDITO`. Agrupa compras de um ciclo; o pagamento é uma `Transferencia`, **não** uma despesa.

```typescript
class Fatura {
  readonly id: FaturaId;
  readonly contaId: ContaId;
  readonly competencia: Competencia;
  readonly dataVencimento: DataLocal;
  private lancamentos: LancamentoId[];
  private status: 'ABERTA' | 'FECHADA' | 'PAGA';
  private transferenciaPagamentoId: TransferenciaId | null;

  get total(): Dinheiro
  fechar(por: UsuarioId): Result<void, DomainError>
  registrarPagamento(transferenciaId: TransferenciaId): Result<void, DomainError>
}
```

**Invariantes**

| # | Regra |
|---|---|
| F1 | Só recebe lançamento cuja `contaId` seja a do cartão. |
| F2 | Fatura `FECHADA` não aceita novo lançamento. |
| F3 | Pagamento exige `Transferencia` com `finalidade = PAGAMENTO_DE_FATURA` e valor igual ao total. |
| F4 | Pagamento de fatura **nunca** gera `Lancamento` de despesa. |

**Resolve a dupla contagem identificada na migração** (~R$ 3,5 mil): compras individuais entram como despesa; o pagamento apenas quita o passivo.

## 1.7 `Emprestimo` (raiz de agregado)

Cobre "empréstimo Zé aluguel R$ 4.800" (concedido e devolvido) e "empréstimo Érico R$ 6.000" (concedido, devolução parcial de R$ 562,40).

```typescript
class Emprestimo {
  readonly id: EmprestimoId;
  readonly direcao: 'CONCEDIDO' | 'RECEBIDO';
  readonly contraparteId: PessoaId;
  readonly valorPrincipal: Dinheiro;
  readonly dataConcessao: DataLocal;
  readonly transferenciaConcessaoId: TransferenciaId;
  private devolucoes: Devolucao[];             // entidades internas

  get saldoDevedor(): Dinheiro
  get quitado(): boolean
  registrarDevolucao(valor: Dinheiro, data: DataLocal, transferenciaId): Result<void, DomainError>
}
```

**Invariantes**

| # | Regra |
|---|---|
| E1 | Empréstimo **não** é receita nem despesa — é movimentação patrimonial. |
| E2 | A soma das devoluções nunca excede o principal. |
| E3 | Toda devolução tem `Transferencia` correspondente. |

## 1.8 `Adiantamento` (raiz de agregado)

Formaliza a prática — hoje informal — de pessoas físicas custearem despesas do centro com recursos próprios.

```typescript
class Adiantamento {
  readonly id: AdiantamentoId;
  readonly pessoaId: PessoaId;                 // quem adiantou
  readonly contaOrigemId: ContaId;             // conta pessoal utilizada
  readonly valor: Dinheiro;
  readonly dataDespesa: DataLocal;
  readonly lancamentoId: LancamentoId;         // a despesa em si
  readonly autorizadoPor: UsuarioId;
  readonly autorizadoEm: DateTime;
  private ressarcimento: Ressarcimento | null;

  get pendenteDeRessarcimento(): boolean
  registrarRessarcimento(transferenciaId: TransferenciaId, data: DataLocal): Result<void, DomainError>
}
```

**Invariantes**

| # | Regra |
|---|---|
| A1 | **Autorização por vínculo.** Só é criável se o `UsuarioId` autorizador estiver associado a uma `Pessoa` com vínculo ativo `PADRINHO` ou `MADRINHA` na data. É invariante de domínio, verificada no agregado — não é regra de tela nem permissão de grupo. Ver Doc 3 §8. |
| A2 | `contaOrigemId` deve ter `titularidade = PESSOAL_DE_TERCEIRO`. |
| A3 | `pessoaId` deve ser a titular da conta de origem. |
| A4 | O ressarcimento exige `Transferencia` com `finalidade = RESSARCIMENTO_DE_ADIANTAMENTO` e valor igual ao adiantado. |
| A5 | Ressarcimento não gera `Lancamento` — a despesa já foi lançada. |

Alimenta o read model de **reembolsos pendentes**, que dá visibilidade a algo que hoje só existe na memória das pessoas envolvidas.

## 1.9 `Fundo` (raiz de agregado)

A Caixinha Ayahuasca é fundo com destinação vinculada, não conta de livre movimentação.

```typescript
class Fundo {
  readonly id: FundoId;
  readonly codigoSistema: string;                    // 'FUNDO_AYAHUASCA'
  private nome: string;                              // "Caixinha Ayahuasca"
  readonly contaVinculadaId: ContaId;
  private categoriasPermitidas: CategoriaId[];       // aquisição de daime, custo de feitio
  private saldo: Dinheiro;

  aportar(valor: Dinheiro, transferenciaId: TransferenciaId): Result<void, DomainError>
  aplicar(valor: Dinheiro, lancamentoId: LancamentoId): Result<void, DomainError>
}
```

**Invariantes**

| # | Regra |
|---|---|
| FD1 | Saída só para categoria em `categoriasPermitidas`, referenciada por `codigoSistema`. |
| FD2 | Saldo nunca negativo. |
| FD3 | Aporte é `Transferencia` com `finalidade = APORTE_A_FUNDO` (ex.: os R$ 3.840 de "movim. Ayahuasca pra caixinha"), nunca despesa. |

> **Nota de modelagem:** o fundo é conceito *lógico* sobreposto a uma conta física. Se a caixinha do Nubank virar conta separada, muda só `contaVinculadaId` — as regras de destinação permanecem.

## 1.10 `PeriodoContabil` (raiz de agregado)

```typescript
class PeriodoContabil {
  readonly unidadeId: UnidadeId;
  readonly competencia: Competencia;
  private status: 'ABERTO' | 'FECHADO';
  private fechadoPor: UsuarioId | null;
  private fechadoEm: DateTime | null;
  private hashFechamento: string | null;
  private reaberturas: Reabertura[];           // { por, em, motivo }

  fechar(por: UsuarioId): Result<HashFechamento, DomainError>
  reabrir(por: UsuarioId, motivo: string): Result<void, DomainError>
}
```

**Invariantes**

| # | Regra |
|---|---|
| P1 | Fechamento exige zero lançamentos em `A_CONFERIR` na competência — incluindo os que aguardam resposta a pendência (L10). |
| P2 | Fechamento calcula e grava hash do conjunto de lançamentos — dá base à exportação verificável. |
| P3 | Reabertura exige motivo textual e fica registrada permanentemente. Reabertura silenciosa não existe. |
| P4 | Não se fecha competência com competência anterior aberta. |

A mesma disciplina que a tesouraria hoje tenta manter no grito ("Todos até aqui lançados", 15/03).

## 1.11 Importação e conciliação (v2.0)

```typescript
class ImportacaoDeExtrato {
  readonly id: ImportacaoId;
  readonly contaId: ContaId;
  readonly arquivo: Anexo;                     // OFX ou CSV original
  readonly periodo: IntervaloDeData;
  readonly importadoPor: UsuarioId;
  readonly importadoEm: DateTime;
  private linhas: LinhaExtrato[];
}

class LinhaExtrato {
  readonly id: LinhaExtratoId;
  readonly identificadorExterno: string;       // FITID do OFX — chave de idempotência
  readonly data: DataLocal;
  readonly valor: Dinheiro;
  readonly sinal: 'CREDITO' | 'DEBITO';
  readonly descricaoBanco: string;
  private status: 'NAO_CONCILIADA' | 'CONCILIADA' | 'IGNORADA';
  private lancamentoId: LancamentoId | null;
  private transferenciaId: TransferenciaId | null;
}
```

**Invariantes**

| # | Regra |
|---|---|
| I1 | `identificadorExterno` é único por conta. Reimportar o mesmo arquivo não duplica linha. |
| I2 | Uma linha concilia com **no máximo um** lançamento ou transferência. |
| I3 | Conciliar preenche `dataCaixa` do lançamento com a data do extrato — nunca o contrário. |
| I4 | Linha `IGNORADA` exige motivo (tarifa bancária irrelevante, movimentação pessoal em conta de terceiro etc.). |

**Motor de sugestão.** O casamento é proposto por valor + proximidade de data + conta, e **sempre confirmado por humano**. Linha sem lançamento correspondente vira item da fila de trabalho: *"saiu dinheiro que ninguém registrou"* — que é exatamente o problema de omissão hoje invisível.

## 1.12 Value Objects

| VO | Descrição |
|---|---|
| `Dinheiro` | Inteiro de centavos + moeda. Nunca `float`. Soma e subtração verificam a moeda. |
| `DataLocal` | Data sem fuso, para competência e caixa. |
| `Competencia` | Ano + mês. Ordenável e comparável. |
| `IntervaloDeCompetencia` | Par de competências, para relatório. |
| `Natureza` | `RECEITA` \| `DESPESA`. |
| `Titularidade` | `INSTITUCIONAL` \| `PESSOAL_DE_TERCEIRO`. |
| `Anexo` | Chave no storage, MIME, hash, tamanho. Acesso por URL assinada de curta duração. |
| `Vocabulario` | Conjunto de rótulos derivado do regime da unidade (contribuição × comercial). |
| `HashFechamento` | Hash do conjunto de lançamentos de um período fechado. |

## 1.13 Eventos de domínio — Financeiro

| Evento | Assinantes |
|---|---|
| `LancamentoRegistrado` | Fila de conferência |
| `PendenciaRegistrada` | Fila de trabalho de quem registrou o lançamento |
| `PendenciaRespondida` | Fila de conferência |
| `LancamentoConfirmado` | Read models de relatório; Estoque (se categoria de insumo) |
| `LancamentoEstornado` | Read models; auditoria |
| `TransferenciaRealizada` | Saldos de conta e de fundo |
| `FaturaFechada` | Fila de trabalho (tesouraria) |
| `FaturaPaga` | Baixa de passivo |
| `EmprestimoConcedido` / `EmprestimoQuitado` | Controle de recebíveis |
| `AdiantamentoAutorizado` | Read model de reembolsos pendentes |
| `AdiantamentoRessarcido` | Baixa do reembolso |
| `FundoAplicado` / `FundoAportado` | Saldo do fundo |
| `PeriodoFechado` / `PeriodoReaberto` | Congela/descongela read models; auditoria |
| `ExtratoImportado` | Fila de conciliação |
| `LinhaExtratoConciliada` | Fluxo de caixa |

> **Nenhum destes eventos tem assinante de notificação** (Doc 1 §5.4). Todos alimentam projeção ou auditoria.

## 1.14 Read models — Financeiro

| Read model | Conteúdo | Permissão |
|---|---|---|
| **DRE por período** | Por unidade, categoria, linha de relatório e mês. Reproduz a aba `DRE`. | `financeiro.dre.ler` |
| **Fluxo de caixa por conta** | Saldo e extrato, por `dataCaixa`. | `financeiro.fluxo_caixa.ler` |
| **Resultado por cerimônia** | Receitas de contribuição − despesas com `eventoId`. É a "terceira tabela" hoje montada à mão. | `financeiro.resultado_evento.ler` |
| **Ponto de equilíbrio do evento** | Custo previsto × arrecadação × inscrições confirmadas. | `financeiro.resultado_evento.ler` |
| **Resultado por fornecedor/prestador** | Bloco "Por Fornecedor" do DRE. | `financeiro.dre.ler` |
| **Reembolsos pendentes** | Adiantamentos não ressarcidos, por pessoa e idade. | `financeiro.reembolsos.ler` |
| **Fila de conferência** | Lançamentos em `A_CONFERIR`, por origem e idade, com as pendências abertas de cada um. | `financeiro.lancamento.confirmar` |
| **Meus registros** | Lançamentos com `registradoPor = usuárioAtual`: valor, descrição, data, status, pendências, anexos. **Nunca agrega** — sem totais, somas ou filtro por período. | `financeiro.lancamento.ler_proprios` |
| **Fila de conciliação** | Linhas de extrato sem lançamento e lançamentos sem linha. | `financeiro.conciliacao.executar` |
| **Faturamento por unidade comercial** | Acumulado no ano-calendário contra o teto. | `financeiro.dre.ler` |
| **Saldo e movimentação do Fundo** | Aportes, aplicações, saldo. | `financeiro.dre.ler` |

---

# 2. Contexto Eventos

Core domain. Módulo `eventos`, schema `eventos`.

## 2.1 Visão do contexto

O contexto cobre três coisas que a v1.1 tratava como uma só:

1. **Comercialização** — quem se inscreve, quanto contribui, quem pagou. Ou, no evento contratado, quem contratou e por quanto.
2. **Operação** — onde cada um dorme, quantas refeições preparar, quanto sacramento será necessário.
3. **Realização** — o evento aconteceu, com quais consequências para estoque e financeiro.

A operação (item 2) é escopo novo na v2.0 e é onde está a maior parte do trabalho manual que ninguém contabiliza.

## 2.2 `Evento` (raiz de agregado)

```typescript
type TipoEvento =
  | 'CERIMONIA' | 'FEITIO' | 'TEMAZCAL'
  | 'JORNADA' | 'APRESENTACAO' | 'ENCONTRO';

type RegimeDeReceita =
  | 'CONTRIBUICAO'    // inscrições e tabela de contribuição
  | 'CONTRATADO'      // valor acordado com um contratante externo
  | 'INTERNO';        // sem receita própria (feitio, encontro)

type StatusEvento =
  | 'PLANEJADO' | 'INSCRICOES_ABERTAS' | 'INSCRICOES_ENCERRADAS'
  | 'REALIZADO' | 'CANCELADO';

class Evento {
  readonly id: EventoId;
  readonly nome: string;                       // "Lua Cheia"
  readonly tipo: TipoEvento;
  readonly regimeDeReceita: RegimeDeReceita;
  readonly dataInicio: DataLocal;
  readonly dataFim: DataLocal;
  readonly local: Local;                       // sede, Chácara, Instituto Terra (SP)
  readonly unidadeId: UnidadeId;
  private capacidade: number | null;
  private tabelaDeContribuicao: TabelaDeContribuicao | null;   // só CONTRIBUICAO
  private contratacao: Contratacao | null;                     // só CONTRATADO
  private inscricoes: Inscricao[];                             // entidades internas
  private mapaDeLeitos: MapaDeLeitos | null;
  private status: StatusEvento;

  abrirInscricoes(): Result<void, DomainError>
  encerrarInscricoes(): Result<void, DomainError>
  inscrever(pessoaId, tipoParticipacao, opcoes): Result<Inscricao, DomainError>
  cancelarInscricao(inscricaoId, motivo): Result<DevolucaoDevida | null, DomainError>
  realizar(por: UsuarioId): Result<void, DomainError>
  cancelar(motivo: string, por: UsuarioId): Result<void, DomainError>

  get totalArrecadado(): Dinheiro
  get vagasDisponiveis(): number | null
  get demandaDeRefeicoes(): DemandaDeRefeicoes
}
```

**Identidade do evento:** nome + data. A decisão veio da modelagem das planilhas, justamente porque ocorrem duas cerimônias no mesmo mês. O sistema mantém `id` técnico, mas a chave natural exibida é `"Lua Cheia — 15/01/2026"`.

**Invariantes por regime de receita** — o coração da mudança da v2.0:

| # | Regra |
|---|---|
| EV1 | `CONTRIBUICAO` **exige** `tabelaDeContribuicao` e **admite** inscrições. `contratacao` deve ser nula. |
| EV2 | `CONTRATADO` **exige** `contratacao` e **rejeita** inscrições. `tabelaDeContribuicao` deve ser nula. |
| EV3 | `INTERNO` rejeita ambos. Admite participantes registrados como `EQUIPE`. |
| EV4 | `CONTRATADO` só é permitido em unidade de regime `COMERCIAL`. Cerimônia contratada é operação da Munay, não do CDD. |
| EV5 | `regimeDeReceita` é imutável após a criação. Trocar regime muda quais agregados são obrigatórios; a operação correta é cancelar e recriar. |

Isso mata na raiz a tela que ofereceria "abrir inscrições" para um show contratado — e o inverso, cobrar cachê de uma cerimônia do centro.

**Invariantes gerais**

| # | Regra |
|---|---|
| EV6 | Inscrição só em evento com status `INSCRICOES_ABERTAS`. |
| EV7 | Inscrições confirmadas ≤ `capacidade`, quando definida. |
| EV8 | Evento `REALIZADO` não aceita nova inscrição nem alteração de contribuição. |
| EV9 | Cancelar evento com pagamento confirmado gera `DevolucaoDevida` para cada inscrição paga. |
| EV10 | `realizar()` exige que a data de início já tenha passado. |
| EV11 | `dataFim >= dataInicio`. |

## 2.3 `Contratacao` (entidade dentro de `Evento`) — v2.0

Cobre a cerimônia ou apresentação conduzida pela Munay em outra instituição.

```typescript
class Contratacao {
  readonly contratanteId: PessoaId;            // pessoa JURIDICA, tipicamente
  readonly valorAcordado: Dinheiro;
  readonly formaPagamento: 'ANTECIPADO' | 'NO_ATO' | 'FATURADO';
  readonly dataPrevistaPagamento: DataLocal | null;
  private status: 'PROPOSTA' | 'CONFIRMADA' | 'REALIZADA' | 'CANCELADA';
  private lancamentoReceitaId: LancamentoId | null;
  private observacoes: string;

  confirmar(): Result<void, DomainError>
  registrarRecebimento(data: DataLocal, contaId: ContaId): Result<void, DomainError>
}
```

**Invariantes**

| # | Regra |
|---|---|
| CN1 | O evento continua sendo evento: tem data, local, equipe e **custos apurados por `eventoId`** — deslocamento, alimentação, hospedagem dos músicos. O resultado por evento vale igual. |
| CN2 | O recebimento gera `Lancamento` com categoria `CACHE_RECEBIDO` (receita), vinculado ao `eventoId`. |
| CN3 | Os cachês pagos aos músicos são lançamentos `CACHE_PAGO` (despesa), também vinculados ao mesmo `eventoId`. **Mesmo evento, duas naturezas opostas.** |
| CN4 | Contratação `CANCELADA` com valor já recebido gera `DevolucaoDevida` ao contratante. |

> **Por que `Contratacao` é entidade e não agregado próprio:** seu ciclo de vida é o do evento. Não existe contratação sem evento, e a consistência entre "evento realizado" e "contratação realizada" precisa ser transacional.

## 2.4 `Inscricao` (entidade dentro de `Evento`)

Deriva das colunas observadas nas abas de cerimônia.

```typescript
type TipoParticipacao = 'PARTICIPANTE' | 'CRIANCA_ESTELAR' | 'EQUIPE' | 'CONVIDADO';
type ModalidadeCrianca = 'PARTICIPA_RITUAL' | 'PERMANECE_SOB_SUPERVISAO';
type StatusInscricao = 'PENDENTE' | 'CONFIRMADA' | 'CANCELADA';
type StatusAnamnese = 'PENDENTE' | 'OK' | 'VENCIDA' | 'NAO_APLICAVEL';

class Inscricao {
  readonly id: InscricaoId;
  readonly pessoaId: PessoaId;
  readonly tipoParticipacao: TipoParticipacao;
  readonly modalidadeCrianca: ModalidadeCrianca | null;
  readonly primeiraVez: boolean;               // v2.0 — dispara acolhimento
  private consagra: boolean;                   // v2.1 — base da estimativa de consumo
  private valorDevido: Dinheiro;
  private hospedagem: Hospedagem | null;       // BELICHE | QUARTO | SEM_HOSPEDAGEM
  private diasHospedagem: number;
  private refeicoes: Refeicao[];               // CEIA, CAFE, ALMOCO, DOMINGO
  private restricoesAlimentares: string | null;
  readonly responsavelId: PessoaId | null;     // obrigatório se CRIANCA_ESTELAR
  private contatoEmergencia: Contato;
  private statusAnamnese: StatusAnamnese;
  private statusAcolhimento: StatusAcolhimento; // v2.0
  private pagamentos: Pagamento[];
  private status: StatusInscricao;

  get saldoAPagar(): Dinheiro
  get quitada(): boolean
  registrarPagamento(valor, data, meio, por: UsuarioId): Result<void, DomainError>
  definirHospedagem(hospedagem, dias): Result<void, DomainError>
  definirRefeicoes(refeicoes: Refeicao[]): Result<void, DomainError>
  confirmar(por: UsuarioId): Result<void, DomainError>
  cancelar(motivo: string, por: UsuarioId): Result<DevolucaoDevida | null, DomainError>
}

type StatusAcolhimento =
  | 'NAO_NECESSARIO'      // já participou antes
  | 'PENDENTE'            // primeira vez, conversa não realizada
  | 'REALIZADO';          // conversa feita, com registro
```

**Invariantes**

| # | Regra |
|---|---|
| IN1 | `EQUIPE` não gera `valorDevido`. Resolve a lista de staff que hoje fica colada abaixo dos participantes e polui a soma. |
| IN2 | `CRIANCA_ESTELAR` exige `responsavelId` **e** `modalidadeCrianca`, além de `AutorizacaoDeResponsavel` vigente para aquele evento e modalidade. |
| IN3 | Anamnese é exigida de quem consagra: `PARTICIPANTE`, `CONVIDADO` e `CRIANCA_ESTELAR` com `PARTICIPA_RITUAL`. Para `PERMANECE_SOB_SUPERVISAO`, `statusAnamnese = NAO_APLICAVEL`. |
| IN4 | **Contato de emergência e restrições alimentares são obrigatórios sempre**, inclusive para quem não consagra. |
| IN5 | Confirmação exige `statusAnamnese === 'OK'` quando aplicável. **É regra de segurança, não burocrática** — a anamnese identifica medicações e condições incompatíveis com a consagração. |
| IN6 | `primeiraVez === true` exige `statusAcolhimento === 'REALIZADO'` para confirmar. **Novo na v2.0.** Formaliza a conversa que hoje acontece informalmente e não deixa registro. |
| IN7 | `valorDevido` é calculado pela `TabelaDeContribuicao` do evento; alteração manual exige justificativa registrada. |
| IN8 | Inscrição em evento `CONTRATADO` é rejeitada (EV2). |
| IN9 | `hospedagem` diferente de `SEM_HOSPEDAGEM` exige alocação no `MapaDeLeitos` antes da confirmação. |
| IN10 | Pagamento não pode exceder `valorDevido`, salvo se `TabelaDeContribuicao.permiteValorLivre`. |
| IN11 | `consagra` tem valor padrão derivado — `PARTICIPANTE`, `CONVIDADO` e `EQUIPE` são `true`; `CRIANCA_ESTELAR` é `true` apenas com `PARTICIPA_RITUAL` — e **é editável**, porque alguém pode estar presente sem consagrar. |
| IN12 | `consagra === false` implica `statusAnamnese = NAO_APLICAVEL`. A recíproca não vale (ver nota abaixo). |

**Sobre IN6.** O centro já faz isso — alguém conversa com quem vem pela primeira vez. O que não existe é o registro de que a conversa aconteceu. Modelar como invariante transforma prática tácita em garantia, e dá ao Acolhimento uma fila de trabalho concreta: *"três pessoas de primeira vez ainda sem conversa"*.

**Sobre IN11 e IN12 — por que `consagra` é campo e não derivação.** A v2.0 derivava "quem consagra" da regra de anamnese (IN3). Não funciona: **a equipe consagra e não faz anamnese**. Se `consagra` fosse derivado de IN3, a estimativa de consumo (§4.5) ignoraria guardiões, cuidadoras e músicos — que estão entre os que mais tempo passam no trabalho. Daí o campo explícito.

Isso expõe uma pergunta que o modelo não decide sozinho e que vale levar à coordenação: **a equipe consagra e não preenche anamnese — é intencional?** A justificativa provável é que são pessoas conhecidas, de participação contínua. É defensável, e é diferente de ser acidental. Registrado como questão aberta em Doc 1 §10.3.

## 2.5 `TabelaDeContribuicao` (value object)

Os valores observados (R$ 100, 160, 170, 180, 200, 229) sugerem faixas com isenções e adicionais, não preço único.

```typescript
class TabelaDeContribuicao {
  readonly valorBase: Dinheiro;
  readonly adicionalHospedagem: Map<Hospedagem, Dinheiro>;   // beliche: R$ 50/dia
  readonly adicionalRefeicao: Map<Refeicao, Dinheiro>;
  readonly isencoes: TipoParticipacao[];                      // EQUIPE, CRIANCA_ESTELAR
  readonly permiteValorLivre: boolean;

  calcularPara(tipo, hospedagem, dias, refeicoes): Dinheiro
}
```

`permiteValorLivre` é importante: contribuição em centro religioso frequentemente admite valor a critério do participante, e o sistema não pode impedir isso.

## 2.6 `MapaDeLeitos` (entidade dentro de `Evento`) — v2.0

`hospedagem = BELICHE` só faz sentido se houver beliche. Dormitórios é unidade com receita própria, logo tem leitos finitos.

```typescript
class MapaDeLeitos {
  readonly eventoId: EventoId;
  private alocacoes: AlocacaoDeLeito[];

  alocar(inscricaoId, leitoId, noites: IntervaloDeData): Result<void, DomainError>
  desalocar(inscricaoId): void
  get leitosLivres(): LeitoId[]
  get ocupacao(): number                       // percentual
}

class AlocacaoDeLeito {
  readonly inscricaoId: InscricaoId;
  readonly leitoId: LeitoId;
  readonly noites: IntervaloDeData;
}
```

Suportado por um cadastro simples, fora do evento:

```typescript
class Dormitorio {                             // agregado de cadastro
  readonly id: DormitorioId;
  readonly unidadeId: UnidadeId;
  private nome: string;                        // "Dormitório Masculino"
  private leitos: Leito[];                     // { id, identificacao, tipo }
  private ativo: boolean;
}

type TipoLeito = 'BELICHE_SUPERIOR' | 'BELICHE_INFERIOR' | 'CAMA_SOLTEIRO' | 'QUARTO_PRIVATIVO';
```

**Invariantes**

| # | Regra |
|---|---|
| ML1 | Um leito não pode ter duas alocações com noites sobrepostas **no mesmo evento**. |
| ML2 | Alocação exige inscrição com `hospedagem ≠ SEM_HOSPEDAGEM`. |
| ML3 | Cancelar inscrição libera o leito automaticamente. |
| ML4 | `noites` deve estar contida no intervalo do evento. |

> **Limitação assumida.** A checagem de conflito entre **eventos simultâneos no mesmo local** não é invariante do agregado — a fronteira transacional é o evento. É verificada por serviço de domínio (`VerificadorDeDisponibilidadeDeLeito`) contra um read model de ocupação, com aviso na tela. Dois eventos simultâneos no mesmo local são raros o bastante para não justificar um agregado de ocupação global, que seria ponto de contenção. **Se passar a acontecer, revisitar.**

## 2.7 `DemandaDeRefeicoes` — read model

A soma das refeições das inscrições confirmadas **é** a lista de compras da cerimônia.

```typescript
interface DemandaDeRefeicoes {
  eventoId: EventoId;
  porRefeicao: Map<Refeicao, number>;          // { CEIA: 34, CAFE: 41, ... }
  restricoes: RestricaoAgregada[];             // { descricao, quantidade }
  atualizadoEm: DateTime;
}
```

Read model de três linhas que substitui uma conversa inteira no WhatsApp — e é o único jeito de o custo de alimentação bater com o número de pessoas. Alimenta também a comparação entre demanda prevista e despesa efetiva com alimentação no evento.

## 2.8 Escala — fora de escopo (v2.1)

A v2.0 modelava uma `Escala` com atribuição nominal de função e turno, e uma invariante ligando cada função ao vínculo correspondente. **Foi removida.**

**Motivo, que é de domínio e não de esforço:** os guardiões são poucos e **revezam as funções dentro da mesma cerimônia**. Não existe "o guardião do turno da madrugada" — existe um grupo pequeno que se alterna conforme o trabalho pede. Atribuir pessoa × função × turno impõe uma estrutura que não corresponde ao modo real de operar, e um modelo que não corresponde ao domínio é pior que a ausência dele: gera trabalho de preenchimento, envelhece mal e passa a ser ignorado.

**O que permanece cobrindo a necessidade real:**

| Necessidade | Como fica atendida |
|---|---|
| Saber quem era da equipe no trabalho | `Inscricao` com `tipoParticipacao = EQUIPE` |
| Registro histórico de quem serviu | Histórico de participação da pessoa (§3.7) |
| Equipe não contribui financeiramente | Invariante IN1 |
| Equipe conta para refeições e leitos | `Inscricao` já carrega ambos |
| Equipe conta para o consumo de daime | `consagra = true` por padrão (IN11) |

**Quando revisitar.** Se o grupo crescer a ponto de a alternância deixar de ser informal, ou se outra instituição usar o sistema com estrutura de escala formal, o agregado volta — e volta barato, porque nada do que ficou depende de sua ausência. A modelagem da v2.0 fica registrada no histórico do documento para esse caso.

## 2.9 `DevolucaoDevida` (entidade)

**Decisão mantida:** a contribuição é 100% reembolsável quando o participante falta e solicita.

```typescript
class DevolucaoDevida {
  readonly id: DevolucaoId;
  readonly inscricaoId: InscricaoId | null;    // null se devolução a contratante
  readonly eventoId: EventoId;
  readonly pessoaId: PessoaId;
  readonly valor: Dinheiro;                    // integral
  readonly solicitadaEm: DataLocal;
  readonly solicitadaPor: UsuarioId;
  private status: 'PENDENTE' | 'PAGA' | 'CANCELADA';
  private transferenciaId: TransferenciaId | null;

  efetivar(transferenciaId, por: UsuarioId): Result<void, DomainError>
}
```

**Invariantes**

| # | Regra |
|---|---|
| DV1 | O cancelamento **não** devolve automaticamente: gera devolução `PENDENTE`. A devolução exige solicitação — quem falta e não pede, não recebe. |
| DV2 | Valor igual ao efetivamente pago. |
| DV3 | **Solicitar e efetivar são atos distintos, de permissões distintas.** O Acolhimento registra a solicitação; a Tesouraria efetiva. Esta separação materializa a fronteira "sem acesso a saídas financeiras do evento" (Doc 3 §7). |
| DV4 | Efetivar emite evento que gera lançamento de saída vinculado ao mesmo `eventoId`. |

## 2.10 Eventos de domínio — Eventos

| Evento | Assinantes |
|---|---|
| `EventoCriado` | — |
| `InscricoesAbertas` / `InscricoesEncerradas` | Read models |
| `InscricaoRealizada` | Pessoas (histórico de participação) |
| `InscricaoConfirmada` | Read models de operação (leitos, refeições) |
| `PagamentoDeContribuicaoConfirmado` | **Financeiro** (gera `Lancamento` de receita) |
| `InscricaoCancelada` | Gera `DevolucaoDevida` se houver pagamento; libera leito |
| `DevolucaoSolicitada` | Fila de trabalho (tesouraria) |
| `DevolucaoPaga` | **Financeiro** (lançamento de saída vinculado ao evento) |
| `ContratacaoConfirmada` | Read models |
| `ContratacaoRecebida` | **Financeiro** (lançamento `CACHE_RECEBIDO`) |
| `LeitoAlocado` / `LeitoLiberado` | Read model de ocupação |
| `AcolhimentoRealizado` | Read model de pendências |
| `EventoRealizado` | **Estoque** (pendência de consumo); **Financeiro** (fecha apuração) |
| `EventoCancelado` | Gera devoluções pendentes |

## 2.11 Read models — Eventos

| Read model | Conteúdo | Permissão |
|---|---|---|
| **Painel de arrecadação do evento** | Inscritos, confirmados, pagos, pendentes, **total arrecadado**. Sem qualquer custo. | `eventos.arrecadacao.ler` |
| **Lista de participantes** | Nome, tipo, hospedagem, refeições, status de anamnese e acolhimento. | `eventos.inscricao.ler` |
| **Demanda de refeições** | §2.7. | `eventos.operacao.ler` |
| **Mapa de ocupação de leitos** | Alocação por dormitório e noite. | `eventos.operacao.ler` |
| **Consumo estimado de daime** | Volume projetado pelo número de consagrantes × saldo disponível. | `eventos.operacao.ler` |
| **Pendências de acolhimento** | Anamnese pendente, autorização faltante, primeira vez sem conversa. | `eventos.inscricao.ler` |
| **Histórico de participação da pessoa** | Eventos de que participou. | `pessoas.pessoa.ler` |

> **Nota de fronteira.** Nenhum read model deste contexto contém custo, despesa ou resultado. Isso não é acidente: é o que permite dar ao Acolhimento acesso amplo a Eventos sem lhe dar acesso financeiro. Ver §5.3.

---

# 3. Contexto Pessoas

Core domain com partes genéricas. Módulo `pessoas`, schema `pessoas`.

## 3.1 `Pessoa` (raiz de agregado)

```typescript
type TipoPessoa = 'FISICA' | 'JURIDICA';       // v2.0

class Pessoa {
  readonly id: PessoaId;
  readonly tipo: TipoPessoa;
  private nomeCompleto: string;                // ou razão social
  private nomeSocial: string | null;           // ou nome fantasia
  private documento: CPF | CNPJ | null;
  private dataNascimento: DataLocal | null;    // só FISICA
  private contatos: Contato[];
  private endereco: Endereco | null;
  private vinculos: Vinculo[];
  private consentimentos: Consentimento[];
  private ativa: boolean;

  get ehMenorDeIdade(): boolean                // false para JURIDICA
  get nomeExibicao(): string
  atribuirVinculo(papel: Papel, desde: DataLocal, unidadeId?): Result<void, DomainError>
  encerrarVinculo(papel: Papel, ate: DataLocal): Result<void, DomainError>
  get papeisAtivos(): Papel[]
  temPapelAtivoEm(papel: Papel, data: DataLocal): boolean
}
```

**Invariantes**

| # | Regra |
|---|---|
| PE1 | `JURIDICA` não admite `dataNascimento`, nem papéis de participação ritual (`PARTICIPANTE`, `GUARDIAO`, `CUIDADORA`, `CRIANCA_ESTELAR`). Admite `FORNECEDOR` e `CONTRATANTE`. |
| PE2 | `documento` único por tipo na instituição, quando preenchido. Base para deduplicação. |
| PE3 | Pessoa com lançamento, inscrição ou vínculo histórico não pode ser excluída — apenas inativada ou anonimizada. |
| PE4 | Anonimização preserva os IDs referenciados; substitui nome, documento, contatos e endereço por marcadores. O histórico contábil permanece íntegro. |

**Por que pessoa jurídica entra na v2.0:** o contratante da Munay é outro centro, não uma pessoa física. E a nota fiscal de material de construção não vem de um CPF. Já era necessário para fornecedores; a contratação apenas tornou o buraco visível.

## 3.2 `Vinculo` (entidade) e `Papel`

```typescript
type Papel =
  // Governança espiritual
  | 'MADRINHA' | 'PADRINHO'
  // Atuação no trabalho — não remunerada
  | 'GUARDIAO' | 'CUIDADORA' | 'ACOLHIMENTO' | 'VOLUNTARIO'
  // Remunerados
  | 'MUSICO'                                   // Munay — cachê
  | 'PRESTADOR'                                // diarista, jardineiro — por serviço
  | 'FORNECEDOR'
  | 'CONTRATANTE'                              // v2.0 — quem contrata a Munay
  // Participação e apoio
  | 'PARTICIPANTE' | 'APOIADOR';

class Vinculo {
  readonly papel: Papel;
  readonly desde: DataLocal;
  private ate: DataLocal | null;
  readonly unidadeId: UnidadeId | null;        // músico da Munay, voluntário do CDD
  get remunerado(): boolean                    // derivado do papel, não editável
  get ativo(): boolean
  vigenteEm(data: DataLocal): boolean
}
```

**Regra de remuneração:** apenas `MUSICO` (cachê), `PRESTADOR` e `FORNECEDOR` (por serviço ou bem) geram pagamento. `GUARDIAO`, `CUIDADORA`, `ACOLHIMENTO` e `VOLUNTARIO` são funções exercidas sem remuneração — o modelo não prevê cachê para elas.

**Invariantes**

| # | Regra |
|---|---|
| V1 | Uma pessoa acumula papéis. O mesmo indivíduo pode ser voluntário, participante e prestador. Modelar papel como vínculo (não como subtipo de `Pessoa`) evita a duplicação de cadastro, que é o erro clássico neste domínio. |
| V2 | Não há dois vínculos ativos do mesmo papel na mesma unidade. |
| V3 | `ate >= desde`. |
| V4 | `remunerado` é derivado e não editável. |
| V5 | Papéis `MADRINHA` e `PADRINHO` habilitam a autorização de adiantamento (§1.8, A1) e **não podem ser concedidos por tela de administração de acesso** — são vínculo de domínio, atribuídos no cadastro de pessoas. Ver Doc 3 §8. |

**`FORNECEDOR` e `PRESTADOR` vivem aqui**, não no Financeiro. Resolve o campo *Fornecedor/Prestador* hoje quase sempre vazio na planilha, apesar de existir um bloco "Por Fornecedor" no DRE.

`ACOLHIMENTO` como papel é novidade da v2.0 e é **distinto do grupo de acesso homônimo**: o papel diz que a pessoa exerce a função no centro; o grupo diz que o usuário tem as permissões correspondentes no sistema. Normalmente andam juntos, mas são eixos independentes (Doc 3 §2).

## 3.3 `AutorizacaoDeResponsavel` (raiz de agregado)

Necessária para a participação de menores.

```typescript
class AutorizacaoDeResponsavel {
  readonly id: AutorizacaoId;
  readonly criancaId: PessoaId;
  readonly responsavelId: PessoaId;
  readonly eventoId: EventoId;
  readonly modalidade: ModalidadeCrianca;
  readonly concedidaEm: DateTime;
  readonly registradaPor: UsuarioId;
  readonly documentoAnexo: Anexo | null;       // termo assinado
}
```

**Invariantes**

| # | Regra |
|---|---|
| AR1 | Menor de idade não tem inscrição confirmada sem autorização vigente **para aquele evento e aquela modalidade**. |
| AR2 | Autorização é por evento. Não há autorização genérica. |
| AR3 | Mudança de modalidade (de supervisão para participação no ritual) exige nova autorização. |
| AR4 | `responsavelId` deve ser pessoa física maior de idade. |

## 3.4 Anamnese — formulário versionado com resposta incremental

A ficha de saúde não é um conjunto fixo de campos: é um **formulário que evolui**. Quando a coordenação publica nova versão, quem já respondeu deve responder **apenas o que mudou**.

Isso separa o problema em dois agregados: a **definição** e as **respostas**.

### 3.4.1 `FormularioDeAnamnese` (raiz de agregado — a definição)

```typescript
class FormularioDeAnamnese {
  readonly id: FormularioId;
  readonly versao: number;
  private perguntas: Pergunta[];
  private status: 'RASCUNHO' | 'PUBLICADA' | 'SUPERSEDIDA';
  private publicadaEm: DateTime | null;
  private publicadaPor: UsuarioId | null;
  private validadeEmMeses: number;             // sugestão inicial: 12

  publicar(por: UsuarioId): Result<void, DomainError>
  criarNovaVersao(): FormularioDeAnamnese      // clona perguntas, status RASCUNHO
  adicionarPergunta(p: Pergunta): void
  removerPergunta(id: PerguntaId): void
  corrigirRedacao(id: PerguntaId, novoEnunciado: string): void      // mantém o ID
  substituirPergunta(antiga: PerguntaId, nova: Pergunta): void      // gera novo ID
  simularImpacto(): ImpactoDaPublicacao        // quantas pessoas ficarão pendentes
}

class Pergunta {
  readonly id: PerguntaId;        // ⚠️ ESTÁVEL entre versões — viabiliza o delta
  readonly codigo: string;        // 'usa_medicacao_psiquiatrica'
  private enunciado: string;
  readonly tipo: TipoPergunta;    // BOOLEANO | TEXTO | ESCOLHA_UNICA | ESCOLHA_MULTIPLA | DATA | NUMERO
  readonly opcoes: string[];
  readonly obrigatoria: boolean;
  readonly sensivel: boolean;     // marca para acesso restrito e log
  readonly regraDeAlerta: RegraDeAlerta | null;
  readonly condicionadaA: CondicaoExibicao | null;
}
```

> **Nota de vocabulário (v2.2).** O `RASCUNHO` deste agregado é intencional e **não** foi renomeado junto com o de `Lancamento` (§1.3). Aqui a coordenação está de fato rascunhando: a versão existe, é editável e ainda não vale para ninguém. Lá, alguém afirmava um fato consumado que apenas aguardava conferência. Os dois nunca foram o mesmo conceito, e a renomeação de um deles é o que torna isso visível.

**Regra de identidade das perguntas — o coração do mecanismo:**

| Tipo de alteração | Ação | Efeito para quem já respondeu |
|---|---|---|
| Correção cosmética (typo, redação mais clara, mesma semântica) | `corrigirRedacao` — mantém o `PerguntaId` | Nada a responder |
| Alteração material (muda o que se pergunta ou invalida a resposta anterior) | `substituirPergunta` — gera novo `PerguntaId` | Entra como pendência |
| Pergunta nova | Novo `PerguntaId` | Entra como pendência |
| Pergunta removida | Some da versão nova | Resposta antiga preservada no histórico, ignorada na vigente |

**Invariantes**

| # | Regra |
|---|---|
| FA1 | Formulário `PUBLICADA` é imutável. Alteração exige nova versão. |
| FA2 | Publicar uma versão marca a anterior como `SUPERSEDIDA`. |
| FA3 | Há no máximo uma versão `PUBLICADA` por instituição. |
| FA4 | `PerguntaId` é imutável e nunca reutilizado. |
| FA5 | `simularImpacto()` deve ser exibido antes de publicar — a tela mostra quantas pessoas passarão a ter pendência. |

FA5 existe por causa de um risco concreto: uma edição descuidada pode gerar pendência para a base inteira às vésperas de uma cerimônia.

### 3.4.2 `RespostaDeAnamnese` (raiz de agregado — as respostas de uma pessoa)

```typescript
class RespostaDeAnamnese {
  readonly id: RespostaId;
  readonly pessoaId: PessoaId;
  private formularioVersao: number;
  private respondidaEm: DataLocal;
  private validaAte: DataLocal;
  private valores: Map<PerguntaId, Valor>;
  private contatoEmergencia: Contato;
  private acessos: RegistroDeAcesso[];         // log — v2.0, desde a v1

  get vigente(): boolean
  get alertas(): Alerta[]
  registrarComplemento(respostas: Map<PerguntaId, Valor>, versaoAlvo: number): Result<void, DomainError>
  registrarAcesso(por: UsuarioId, em: DateTime): void
}
```

**Invariantes**

| # | Regra |
|---|---|
| RA1 | Resposta vencida (`validaAte` no passado) exige revalidação completa, não incremental — condição de saúde muda com o tempo. |
| RA2 | Complemento só aceita perguntas presentes na versão alvo. |
| RA3 | Toda leitura de resposta registra acesso (`registrarAcesso`). Não há leitura silenciosa de dado de saúde. |
| RA4 | Valor de pergunta `obrigatoria` não pode ser vazio. |

### 3.4.3 Serviço de domínio — cálculo de pendências

```typescript
class CalculadoraDePendenciasDeAnamnese {
  calcular(
    resposta: RespostaDeAnamnese | null,
    formularioVigente: FormularioDeAnamnese
  ): Pergunta[] {
    // sem resposta prévia        → formulário inteiro
    // resposta vencida           → formulário inteiro
    // com resposta vigente       → perguntas do formulário vigente cujo
    //                              PerguntaId não conste em resposta.valores
  }
}
```

**Comportamento do ponto de vista do participante:**

- Primeira vez: responde o formulário completo.
- Formulário evoluiu de v1 para v3 desde então: responde só o que foi acrescentado ou substituído em v2 e v3 — mesmo tendo pulado a v2.
- Resposta vencida: revalidação completa.

### 3.4.4 Alertas e decisão humana

`alertas` existe para dar suporte à decisão humana. **O sistema não decide automaticamente quem pode ou não participar**; ele sinaliza para que o acolhimento avalie caso a caso. Uma `RegraDeAlerta` produz um sinal ("declarou uso de medicação psiquiátrica"), nunca um veredito.

> **Reaproveitamento.** O mesmo mecanismo de formulário versionado serve ao termo de consentimento LGPD e ao termo de autorização de menores. Vale construí-lo como capacidade genérica (`Formulario` + `Resposta`) e especializar por finalidade, em vez de resolver só a anamnese.

## 3.5 `Consentimento` (entidade)

Modelado na v1 mesmo sem o termo redigido (Doc 1 §5.6).

```typescript
class Consentimento {
  readonly id: ConsentimentoId;
  readonly pessoaId: PessoaId;
  readonly finalidade: FinalidadeTratamento;
  readonly versaoTermo: string;
  readonly concedidoEm: DateTime;
  readonly concedidoPor: PessoaId;             // o titular, ou o responsável se menor
  private revogadoEm: DateTime | null;
  readonly documentoAnexo: Anexo | null;

  get vigente(): boolean
  revogar(em: DateTime): void
}

type FinalidadeTratamento =
  | 'CADASTRO_E_PARTICIPACAO'
  | 'DADOS_DE_SAUDE'
  | 'IMAGEM'
  | 'COMUNICACAO';
```

**Invariante:** consentimento de titular menor de idade exige `concedidoPor` sendo o responsável — é registro distinto da `AutorizacaoDeResponsavel`, que trata da participação no trabalho, não do tratamento de dados.

## 3.6 Eventos de domínio — Pessoas

| Evento | Assinantes |
|---|---|
| `PessoaCadastrada` | — |
| `VinculoAtribuido` / `VinculoEncerrado` | Financeiro (habilita autorização de adiantamento) |
| `FormularioDeAnamnesePublicado` | Recalcula pendências da base |
| `AnamneseRespondida` | Eventos (habilita confirmação de inscrição) |
| `AnamneseComplementada` | Eventos (resolve pendência) |
| `AnamneseAcessada` | Auditoria |
| `AutorizacaoDeResponsavelConcedida` | Eventos (habilita inscrição de menor) |
| `ConsentimentoRegistrado` / `ConsentimentoRevogado` | Auditoria |
| `PessoaAnonimizada` | Read models (substitui exibição) |

## 3.7 Read models — Pessoas

| Read model | Conteúdo | Permissão |
|---|---|---|
| **Diretório de pessoas** | Nome, tipo, papéis ativos, contato. Sem dado de saúde. | `pessoas.pessoa.ler` |
| **Ficha da pessoa** | Cadastro + histórico de participação + vínculos. | `pessoas.pessoa.ler` |
| **Pendências de anamnese** | Quem deve responder o quê. | `pessoas.anamnese.ler` |
| **Alertas de anamnese por evento** | Sinais para avaliação do acolhimento. | `pessoas.anamnese.analisar` |
| **Log de acesso a dado sensível** | Quem leu qual anamnese e quando. | `sistema.auditoria.ler` |

---

# 4. Contexto Estoque

Supporting. Módulo `estoque`, schema `estoque`.

Escopo deliberadamente estreito: rastrear daime e insumos de cerimônia. **Não** é WMS, não tem código de barras, não tem endereçamento.

## 4.1 `Item` (raiz de agregado)

```typescript
type CategoriaItem =
  | 'DAIME' | 'INSUMO_CERIMONIA' | 'ALIMENTO'
  | 'MANUTENCAO' | 'PRODUTO_LOJINHA';

class Item {
  readonly id: ItemId;
  private nome: string;
  readonly categoria: CategoriaItem;
  readonly unidadeMedida: UnidadeMedida;       // LITRO, UNIDADE, KG
  private estoqueMinimo: Quantidade | null;
  private ativo: boolean;

  get saldoAtual(): Quantidade
}
```

## 4.2 `Lote` (entidade, relevante sobretudo para daime)

```typescript
type OrigemLote = 'FEITIO_PROPRIO' | 'AQUISICAO' | 'DOACAO';

class Lote {
  readonly id: LoteId;
  readonly itemId: ItemId;
  readonly origem: OrigemLote;
  readonly feitioId: FeitioId | null;
  readonly fornecedorId: PessoaId | null;      // "Céu Sagrado", "Acre"
  readonly dataEntrada: DataLocal;
  readonly quantidadeInicial: Quantidade;
  readonly forca: string | null;               // graduação/concentração
  private saldo: Quantidade;
}
```

**Rastreabilidade por lote é requisito real**, não sofisticação: identifica origem e força do sacramento consagrado em cada trabalho. Os registros mostram aquisições distintas (Céu Sagrado, Acre) e produção própria.

**Invariantes:** `origem = FEITIO_PROPRIO` exige `feitioId`; `origem = AQUISICAO` exige `fornecedorId`; saldo nunca negativo.

## 4.3 `Feitio` (raiz de agregado)

Processo produtivo. Une evento, custo e estoque.

```typescript
class Feitio {
  readonly id: FeitioId;
  readonly eventoId: EventoId;                 // feitio também é evento
  readonly dataInicio: DataLocal;
  private dataFim: DataLocal | null;
  private materiaPrima: ConsumoMateriaPrima[]; // folha, cipó, lenha
  private participantes: PessoaId[];
  private loteProduzido: LoteId | null;

  registrarConsumo(itemId, quantidade): Result<void, DomainError>
  concluir(quantidadeProduzida: Quantidade, forca: string): Result<Lote, DomainError>
  get custoTotal(): Dinheiro                   // via porta de consulta ao Financeiro
  get custoPorLitro(): Dinheiro
}
```

O feitio de março/2026 consumiu R$ 11.200 em matéria-prima (folhas) + R$ 1.700 de mão de obra, além de alimentação e diesel. Hoje isso é despesa dispersa; o agregado permite apurar **custo por litro produzido** e comparar com o custo de aquisição externa — que é a decisão econômica real por trás do feitio.

**Invariantes:** `concluir` exige `dataFim` e gera exatamente um `Lote`; o evento associado deve ser de tipo `FEITIO`; feitio concluído não aceita novo consumo.

## 4.4 `MovimentoDeEstoque` (raiz de agregado)

```typescript
type TipoMovimento =
  | 'ENTRADA_COMPRA' | 'ENTRADA_PRODUCAO' | 'ENTRADA_DOACAO'
  | 'SAIDA_CONSUMO'  | 'SAIDA_VENDA' | 'SAIDA_PERDA'
  | 'AJUSTE_INVENTARIO';

class MovimentoDeEstoque {
  readonly id: MovimentoId;
  readonly itemId: ItemId;
  readonly loteId: LoteId | null;
  readonly tipo: TipoMovimento;
  readonly quantidade: Quantidade;
  readonly data: DataLocal;
  readonly eventoId: EventoId | null;
  readonly lancamentoId: LancamentoId | null;
  readonly justificativa: string | null;
  readonly registradoPor: UsuarioId;
}
```

**Invariantes:** saldo de lote nunca negativo; saída exige lote com saldo suficiente; `AJUSTE_INVENTARIO` exige justificativa; `SAIDA_VENDA` só para item `PRODUTO_LOJINHA` em unidade de regime `COMERCIAL`.

## 4.5 `ConsumoDeCerimonia` (raiz de agregado)

O consumo é registrado por **volume total da cerimônia, discriminado por lote**. Uma cerimônia pode servir mais de um lote. **Não** há registro por participante nem por dose.

```typescript
class ConsumoDeCerimonia {
  readonly id: ConsumoId;
  readonly eventoId: EventoId;
  readonly registradoEm: DataLocal;
  readonly registradoPor: UsuarioId;
  private consumoPorLote: Map<LoteId, Quantidade>;

  get volumeTotal(): Quantidade
  adicionarLote(loteId: LoteId, volume: Quantidade): Result<void, DomainError>
  confirmar(): Result<MovimentoDeEstoque[], DomainError>
}
```

**Invariantes:** pelo menos um lote; volume informado não excede o saldo do lote; confirmar emite um `SAIDA_CONSUMO` por lote.

Mantém a rastreabilidade sacramental (qual daime foi servido em qual trabalho) sem impor à cuidadora ou ao dirigente um controle individualizado inviável durante o ritual.

### 4.5.1 `EstimativaDeConsumo` (value object) — v2.1

Antes do trabalho, é preciso saber se há sacramento suficiente. Depois, é preciso saber quanto realmente saiu. **São duas coisas diferentes, e só a segunda mexe no estoque.**

```typescript
class EstimativaDeConsumo {
  readonly eventoId: EventoId;
  readonly consagrantes: number;               // inscrições confirmadas com consagra = true
  readonly consumoMedioPorConsagrante: Quantidade;   // parâmetro da instituição
  readonly calculadaEm: DateTime;

  get volumeEstimado(): Quantidade             // consagrantes × consumoMedio
  get saldoDisponivel(): Quantidade            // soma dos lotes de DAIME
  get suficiente(): boolean
  get margemEmLitros(): Quantidade
}
```

**Regras**

| # | Regra |
|---|---|
| EC1 | **A estimativa nunca gera `MovimentoDeEstoque`.** Nenhum saldo é alterado por projeção. A decisão da v1.1 permanece intacta: movimento a partir de suposição corrompe o saldo. |
| EC2 | É recalculada a cada confirmação ou cancelamento de inscrição. É projeção, não estado persistido. |
| EC3 | `consumoMedioPorConsagrante` é **parâmetro da instituição**, editável, com valor inicial arbitrado pela coordenação. |
| EC4 | A partir de um mínimo de cerimônias com consumo real registrado, o sistema oferece a **média histórica** como sugestão de recalibragem do parâmetro. Sugere; não altera sozinho. |
| EC5 | Estimativa acima do saldo disponível vira item da fila de trabalho: *"o próximo trabalho pede mais daime do que há em estoque"*. Sem notificação (Doc 1 §5.4). |

**Papel da estimativa no registro real.** Ao abrir a tela de registro de consumo, o volume estimado aparece **pré-preenchido e editável**, com o rótulo indicando que é estimativa. Quem registra confirma ou corrige. Isso reduz o atrito do registro sem transformar suposição em fato: o campo só vira `MovimentoDeEstoque` depois de alguém olhar e confirmar.

**Por que a estimativa vale a pena mesmo sendo imprecisa.** A pergunta que ela responde não é "quanto vai ser servido" — é "**dá?**". Para essa pergunta, uma estimativa com 20% de erro é suficiente, e é a diferença entre decidir um feitio com dois meses de antecedência e descobrir o problema na véspera. A precisão vem depois, com EC4.

## 4.6 Eventos e read models — Estoque

**Eventos:** `ItemCadastrado`, `LoteCriado`, `MovimentoRegistrado`, `FeitioConcluido`, `ConsumoRegistrado`, `EstoqueMinimoAtingido`, `EstimativaAcimaDoSaldo` (todos alimentam a fila de trabalho, não notificação).

**Read models:** saldo por item e lote; consumo estimado × saldo do próximo evento; consumo real de daime por cerimônia; **estimado × realizado, para calibragem (EC4)**; custo por litro produzido × custo de aquisição; itens abaixo do mínimo.

---

# 5. Integração entre contextos

## 5.1 Fluxos

### 5.1.1 Receita de contribuição

```
[Eventos]   Inscricao.registrarPagamento(valor, data, meio, por)
              │  ← executado pelo ACOLHIMENTO
              ├─► emite PagamentoDeContribuicaoConfirmado
              │     { eventoId, inscricaoId, pessoaId, valor, data, meio, registradoPor }
              ▼
[Financeiro] handler cria Lancamento:
              natureza   = RECEITA
              categoria  = configurada no evento (CONTRIB_CDD)
              conta      = configurada no evento
              unidade    = unidade do evento
              eventoId   = <do evento>
              pessoaId   = <do participante>
              origem     = INTEGRACAO_EVENTOS
              status     = CONFIRMADO
              │
              ├─► entra na fila de CONCILIAÇÃO (não na de conferência)
              ▼
[Financeiro] casa com a linha de extrato quando o OFX for importado
```

**Por que `CONFIRMADO` e não `A_CONFERIR`:** o fato aconteceu — a pessoa pagou. Deixá-lo aguardando conferência faria a inscrição aparecer como paga enquanto o financeiro a ignora, o que é pior. O controle correto não é a conferência humana (o Acolhimento não compôs o lançamento; o sistema compôs), e sim a **conciliação bancária**: se entrou no sistema mas não entrou no banco, a fila de conciliação denuncia.

### 5.1.2 Receita de contratação

```
[Eventos]   Contratacao.registrarRecebimento(data, contaId)
              ├─► emite ContratacaoRecebida { eventoId, contratanteId, valor, data, contaId }
              ▼
[Financeiro] Lancamento: RECEITA, categoria CACHE_RECEBIDO, unidade Munay, eventoId
```

Os cachês pagos aos músicos são lançamentos independentes (`CACHE_PAGO`, despesa) com o mesmo `eventoId`. O read model **Resultado por cerimônia** funciona igual: receita − despesa, no mesmo evento.

### 5.1.3 Despesa vinculada a evento

```
[Financeiro] Lancamento criado com eventoId preenchido
              ├─► emite LancamentoConfirmado { eventoId, valor, categoria, natureza }
              ▼
[Financeiro] atualiza a projeção "Resultado por cerimônia" e "Ponto de equilíbrio"
```

> **Correção em relação à v1.1.** A v1.1 dizia, em §8.2, que Eventos atualizava a projeção de resultado — e, em §4.4, que o resultado por cerimônia era read model do Financeiro. Contradição. **A v2.0 resolve:** resultado e ponto de equilíbrio são do **Financeiro**, dono do custo. Eventos mantém apenas arrecadação. Isso, além de consistente, é o que viabiliza a fronteira de acesso do Acolhimento (§5.3).

### 5.1.4 Devolução

```
[Eventos]   Inscricao.cancelar()  → DevolucaoDevida PENDENTE
              │  ← ACOLHIMENTO solicita
              ├─► emite DevolucaoSolicitada → fila de trabalho da tesouraria
              ▼
[Eventos]   DevolucaoDevida.efetivar(transferenciaId)
              │  ← TESOURARIA efetiva
              ├─► emite DevolucaoPaga { eventoId, pessoaId, valor }
              ▼
[Financeiro] Lancamento de DESPESA vinculado ao mesmo eventoId
```

### 5.1.5 Consumo de daime

```
ANTES DO EVENTO
[Eventos]   InscricaoConfirmada / InscricaoCancelada
              ▼
[Estoque]   recalcula EstimativaDeConsumo (projeção — NÃO movimenta saldo)
              ├─► se estimado > saldo: item na fila de trabalho
              ▼
            usada para decidir feitio ou aquisição com antecedência

DEPOIS DO EVENTO
[Eventos]   Evento.realizar()
              ├─► emite EventoRealizado { eventoId, tipo, participantes }
              ▼
[Estoque]   cria PENDÊNCIA de registro de consumo real
              │   (formulário pré-preenchido com o volume estimado, editável)
              ▼
            ConsumoDeCerimonia.confirmar()
              ├─► ACOLHIMENTO ou ADMINISTRADOR confirma o volume por lote
              ▼
            MovimentoDeEstoque SAIDA_CONSUMO por lote  ← único ponto que baixa saldo
```

> **Decisão preservada e refinada (v2.1).** O consumo continua **não** sendo baixado por estimativa — a v1.1 estava certa e a regra permanece. O que a v2.1 acrescenta é o uso da estimativa **antes** do evento, para planejamento, e como **pré-preenchimento** do formulário de registro real. A projeção informa; a confirmação humana é que movimenta estoque. Quem confirma é o Acolhimento (que esteve no trabalho) ou o Administrador.

### 5.1.6 Custos do evento

```
[Eventos]   precisa exibir custo previsto (só para quem tem permissão financeira)
              ├─► chama a porta ConsultaDeCustosDoEvento (Open Host Service)
              ▼
[Financeiro] responde { totalPorCategoria, total, ultimaAtualizacao }
```

A porta é síncrona e explícita. Eventos não lê o banco do Financeiro. **A resposta só é solicitada quando o usuário tem permissão para ver custo** — a checagem ocorre na camada de aplicação, antes da chamada.

## 5.2 Anticorruption Layer

Cada módulo mantém, na sua infraestrutura, tradutores dos eventos externos para o próprio vocabulário. O Financeiro não conhece `Inscricao`: recebe um DTO e traduz para `Lancamento`. Se Eventos mudar seu modelo interno, o contrato do evento é o único ponto de acoplamento.

## 5.3 Fronteira entre arrecadação e resultado — decisão estrutural da v2.0

A restrição de acesso do Acolhimento — *"pode marcar pagamento, não pode ver movimentação financeira nem saídas do evento"* — mapeia exatamente sobre a fronteira dos bounded contexts:

| Natureza | Contexto dono | Read model | Quem vê |
|---|---|---|---|
| **Arrecadação** — quem se inscreveu, quem pagou, quanto entrou | **Eventos** | Painel de arrecadação | Acolhimento, Tesouraria, Governança, Administrador |
| **Custo e resultado** — despesas do evento, resultado, ponto de equilíbrio | **Financeiro** | Resultado por cerimônia, Ponto de equilíbrio | Tesouraria, Governança, Administrador |

Isso não foi desenhado para atender à restrição: é a fronteira natural entre os contextos, e a restrição coincide com ela. Quando uma regra de acesso coincide com uma fronteira de modelo, é sinal de que ambas estão certas — e a implementação fica trivial, porque basta não conceder a permissão do read model do outro lado. Nenhum campo precisa ser escondido em tela.

**Consequência prática para o design (Doc 1 §8.1):** a tela de evento do Acolhimento e a tela de evento da Tesouraria não são a mesma tela com campos ocultos. São duas telas, que consomem read models diferentes.

---

# 6. Apêndice — Agregados adiados

Modelados aqui para que a decisão de adiar seja consciente e para garantir que a v1 não crie dívida estrutural.

## 6.1 `Apoio` (recorrência de apoiador) — pós-v1

`APOIADOR` está no glossário e existe como `Papel`. É a única fonte de receita que o centro consegue **prever**, e o modelo hoje não a enxerga.

```typescript
class Apoio {
  readonly id: ApoioId;
  readonly pessoaId: PessoaId;
  readonly unidadeId: UnidadeId;
  private valorMensal: Dinheiro;
  private diaDoMes: number;
  readonly inicioEm: DataLocal;
  private encerradoEm: DataLocal | null;
  private recebimentos: Map<Competencia, LancamentoId>;

  get vigente(): boolean
  get competenciasEmAberto(): Competencia[]
  registrarRecebimento(competencia, lancamentoId): void
}
```

**Read models derivados:** receita recorrente projetada; apoios sem movimento; base para conversa sobre orçamento.

**Cuidado de domínio que deve ir junto quando for construído:** apoiador que falha **não é inadimplente**. Não há cobrança — há reaproximação. O read model se chama *"apoios sem movimento"*, nunca *"inadimplência"*, e a ação sugerida é contato, não cobrança. Isso é decisão de vocabulário, e vocabulário aqui é domínio.

**Por que adiar não gera dívida:** na v1, um apoio é apenas um `Lancamento` com `pessoaId` preenchido e categoria própria (`APOIO_RECORRENTE`). Quando o agregado vier, ele lê o histórico de lançamentos e reconstrói a recorrência. Nada precisa ser desfeito.

## 6.2 Ocupação global de leitos — se necessário

Ver a limitação assumida em §2.6. Só justifica agregado próprio se eventos simultâneos no mesmo local passarem a ser comuns.

## 6.3 Orçamento — pós-v1

Projeção de receita e despesa por unidade e competência, comparada ao realizado. Depende de `Apoio` para ter valor real, e de pelo menos um ano de histórico confiável no sistema. Naturalmente posterior.
