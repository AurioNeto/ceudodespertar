/** Contexto Financeiro — Doc 2 §1. */
import type {
  AdiantamentoId,
  Anexo,
  Competencia,
  ContaId,
  CategoriaId,
  DataHora,
  DataLocal,
  DevolucaoEmprestimoId,
  Dinheiro,
  EmprestimoId,
  EventoId,
  FaturaId,
  FundoId,
  GrupoDeCustoId,
  ImportacaoId,
  LancamentoId,
  LinhaExtratoId,
  PeriodoContabilId,
  PessoaId,
  TransferenciaId,
  UnidadeId,
  UsuarioId,
} from './kernel.js';

export type RegimeDaUnidade = 'CONTRIBUICAO' | 'COMERCIAL';

export interface Unidade {
  readonly id: UnidadeId;
  readonly codigoSistema: string;
  readonly nome: string;
  readonly regime: RegimeDaUnidade;
  readonly tetoAnual: Dinheiro | null;
  readonly ativa: boolean;
  readonly versao: number;
}

export type Natureza = 'RECEITA' | 'DESPESA';
export type TipoCategoria = 'OPERACIONAL' | 'INVESTIMENTO' | 'MANUTENCAO' | 'PATRIMONIAL';

export interface Categoria {
  readonly id: CategoriaId;
  readonly codigoSistema: string;
  readonly nome: string;
  readonly natureza: Natureza;
  readonly tipo: TipoCategoria;
  readonly regimesPermitidos: readonly RegimeDaUnidade[];
  readonly unidadePadraoId: UnidadeId | null;
  readonly linhaRelatorio: string;
  readonly ativa: boolean;
  readonly versao: number;
}

/** "Grupo" na interface: onde o gasto aconteceu (Lojinha, Dormitório, Chácara...). */
export interface GrupoDeCusto {
  readonly id: GrupoDeCustoId;
  readonly codigoSistema: string;
  readonly nome: string;
  readonly ativo: boolean;
  readonly versao: number;
}

export interface UnidadesDaCasa {
  readonly itens: readonly Unidade[];
}

export interface CategoriasDaCasa {
  readonly itens: readonly Categoria[];
}

export interface GruposDeCustoDaCasa {
  readonly itens: readonly GrupoDeCusto[];
}

export type TipoConta = 'CONTA_CORRENTE' | 'CARTAO_CREDITO' | 'DINHEIRO' | 'FUNDO';
export type Titularidade = 'INSTITUCIONAL' | 'PESSOAL_DE_TERCEIRO';
export type SituacaoConciliacao = 'CONCILIADA' | 'PENDENTE' | 'NAO_APLICAVEL';

export interface Conta {
  readonly id: ContaId;
  readonly nome: string;
  readonly descricao: string;
  readonly tipo: TipoConta;
  readonly titularidade: Titularidade;
  readonly pessoaTitularId: PessoaId | null;
  readonly identificadorBancario: string | null;
  readonly unidadeId: UnidadeId | null;
  readonly ativa: boolean;
  readonly versao: number;
}

/** Fundo com destinação vinculada — parte do saldo, não conta separada (Doc 2 §1.9). */
export interface Fundo {
  readonly id: FundoId;
  readonly codigoSistema: string;
  readonly nome: string;
  /** O destino combinado da reserva, como aparece na tela. */
  readonly nota: string;
  readonly contaVinculadaId: ContaId;
  readonly meta: Dinheiro | null;
  readonly categoriasPermitidas: readonly string[];
  readonly ativo: boolean;
  readonly versao: number;
}

export type StatusLancamento = 'A_CONFERIR' | 'CONFIRMADO' | 'ESTORNADO';

export type StatusGravadoDoLancamento = Exclude<StatusLancamento, 'ESTORNADO'>;

export const ORIGENS_DE_LANCAMENTO = [
  'MANUAL',
  'REGISTRO_RAPIDO',
  'COMPROVANTE_IA',
  'IMPORTACAO_EXTRATO',
  'IMPORTACAO_TEXTO',
  'INTEGRACAO_EVENTOS',
  'INTEGRACAO_ESTOQUE',
  'MIGRACAO',
] as const;

export type OrigemLancamento = (typeof ORIGENS_DE_LANCAMENTO)[number];

export type TipoLancamento = 'ENTRADA' | 'SAIDA' | 'TRANSFERENCIA';

export interface Etiqueta {
  readonly categoriaId: CategoriaId;
  readonly natureza: Natureza;
  readonly valor: Dinheiro;
}

export type ConfirmadoPor =
  | { readonly autorTipo: 'USUARIO'; readonly autorId: UsuarioId }
  | { readonly autorTipo: 'SISTEMA'; readonly autorId: null };

export interface Lancamento {
  readonly id: LancamentoId;
  readonly natureza: Natureza;
  readonly valor: Dinheiro;
  readonly motivo: string;
  readonly etiquetas: readonly Etiqueta[];
  readonly unidadeId: UnidadeId | null;
  readonly grupoDeCustoId: GrupoDeCustoId | null;
  readonly contaId: ContaId | null;
  readonly faturaId: FaturaId | null;
  readonly pessoaId: PessoaId | null;
  readonly contraparteTexto: string | null;
  readonly formaPagamento: string | null;
  readonly eventoId: EventoId | null;
  readonly competencia: Competencia | null;
  readonly dataCompetencia: DataLocal | null;
  readonly dataCaixa: DataLocal | null;
  readonly reembolsoAId: PessoaId | null;
  readonly comprovante: Anexo | null;
  readonly status: StatusGravadoDoLancamento;
  readonly origem: OrigemLancamento;
  readonly estornoDeId: LancamentoId | null;
  readonly estornadoPorId: LancamentoId | null;
  readonly registradoPor: UsuarioId;
  readonly registradoEm: DataHora;
  readonly confirmadoPor: ConfirmadoPor | null;
  readonly confirmadoEm: DataHora | null;
  readonly versao: number;
}

export const FINALIDADES_DE_TRANSFERENCIA = [
  'MOVIMENTACAO_SIMPLES',
  'APORTE_A_FUNDO',
  'PAGAMENTO_DE_FATURA',
  'RESSARCIMENTO_DE_ADIANTAMENTO',
  'CONCESSAO_DE_EMPRESTIMO',
  'DEVOLUCAO_DE_EMPRESTIMO',
  'REPASSE_ENTRE_UNIDADES',
] as const;

export type FinalidadeTransferencia = (typeof FINALIDADES_DE_TRANSFERENCIA)[number];

export interface Transferencia {
  readonly id: TransferenciaId;
  readonly finalidade: FinalidadeTransferencia;
  readonly valor: Dinheiro;
  readonly data: DataLocal;
  readonly contaOrigemId: ContaId | null;
  readonly contaDestinoId: ContaId | null;
  readonly unidadeId: UnidadeId;
  readonly unidadeDestinoId: UnidadeId | null;
  readonly fundoId: FundoId | null;
  readonly faturaId: FaturaId | null;
  readonly emprestimoId: EmprestimoId | null;
  readonly adiantamentoId: AdiantamentoId | null;
  readonly motivo: string;
  readonly status: StatusGravadoDoLancamento;
  readonly estornoDeId: TransferenciaId | null;
  readonly estornadaPorId: TransferenciaId | null;
  readonly registradoPor: UsuarioId;
  readonly registradoEm: DataHora;
  readonly confirmadoPor: UsuarioId | null;
  readonly confirmadoEm: DataHora | null;
  readonly versao: number;
}

/** Item da fila de verificação em lote — o sistema propõe, o humano confirma. */
export type OrigemCaptura = 'COMPROVANTE' | 'EXTRATO' | 'REGISTRO_RAPIDO';
export type Confianca = 'ALTA' | 'MEDIA' | 'BAIXA';

export interface ItemDeVerificacao {
  readonly id: LancamentoId;
  readonly origem: OrigemCaptura;
  readonly confianca: Confianca;
  readonly enviadoPor: string;
  readonly enviadoEm: DataHora;
  readonly proposta: Lancamento;
  readonly camposIncertos: readonly string[];
  readonly comprovante: Anexo | null;
}

/* ---------------------------------------------------------------------------
   Fatura de cartão — Doc 2 §1.6.

   Existe para resolver a dupla contagem: a compra no cartão é despesa, e o
   pagamento da fatura é **transferência**, não uma segunda despesa (F4). Sem o
   agregado, os dois entram como saída e o mês fecha com o dobro do que saiu —
   foram cerca de R$ 3,5 mil identificados assim na migração (Doc 1 §7.2).
   --------------------------------------------------------------------------- */

export type StatusFatura = 'ABERTA' | 'FECHADA' | 'PAGA';

/** A compra como a fatura a enxerga — o lançamento em si vive no livro geral. */
export interface CompraNaFatura {
  readonly id: LancamentoId;
  readonly data: DataLocal;
  readonly motivo: string;
  readonly categoria: string;
  readonly grupo: string | null;
  readonly valor: Dinheiro;
  readonly status: StatusLancamento;
  readonly registradoPorNome: string;
}

export interface Fatura {
  readonly id: FaturaId;
  /** Sempre uma conta de tipo `CARTAO_CREDITO` — invariante F1. */
  readonly contaId: ContaId;
  readonly competencia: Competencia;
  readonly dataFechamento: DataLocal;
  readonly dataVencimento: DataLocal;
  readonly status: StatusFatura;
  readonly compras: readonly CompraNaFatura[];
  /** Preenchidos no pagamento; a transferência é que quita (F3). */
  readonly pagaEm: DataLocal | null;
  readonly transferenciaPagamentoId: TransferenciaId | null;
  readonly contaPagamentoId: ContaId | null;
}

/* ---------------------------------------------------------------------------
   Empréstimo — Doc 2 §1.7.

   Cobre os dois casos reais: o de R$ 4.800 concedido e devolvido, e o de
   R$ 6.000 com devolução parcial de R$ 562,40. Existe em ambas as direções
   (Anexo A, regra 18).

   E1 é a razão de o agregado existir: empréstimo **não é receita nem despesa**,
   é movimentação patrimonial. Conceder e devolver são transferências; se
   entrarem como lançamento, o resultado do mês mente nas duas pontas.
   --------------------------------------------------------------------------- */

export type DirecaoEmprestimo = 'CONCEDIDO' | 'RECEBIDO';

/** Entidade interna do agregado — toda devolução tem transferência (E3). */
export interface DevolucaoDeEmprestimo {
  readonly id: DevolucaoEmprestimoId;
  readonly valor: Dinheiro;
  readonly data: DataLocal;
  readonly contaId: ContaId;
  readonly contaNome: string;
  readonly registradoPorNome: string;
}

export interface Emprestimo {
  readonly id: EmprestimoId;
  readonly direcao: DirecaoEmprestimo;
  readonly contraparteId: PessoaId;
  readonly contraparteNome: string;
  readonly valorPrincipal: Dinheiro;
  readonly dataConcessao: DataLocal;
  /** Conta de onde saiu, no concedido; onde entrou, no recebido. */
  readonly contaId: ContaId;
  readonly contaNome: string;
  readonly motivo: string;
  readonly devolucoes: readonly DevolucaoDeEmprestimo[];
  readonly observacao: string | null;
}

/* ---------------------------------------------------------------------------
   Adiantamento — Doc 2 §1.8.

   Formaliza a prática informal de pessoas físicas custearem despesa da casa
   com recurso próprio. A invariante que governa tudo é A1: **quem autoriza
   precisa de vínculo ativo de padrinho ou madrinha na data da despesa.** Não é
   permissão de grupo — é verificação no agregado (Doc 3 §8.1). Um
   administrador sem esse vínculo tem a permissão, abre a tela, e a operação
   falha no domínio.
   --------------------------------------------------------------------------- */

export type StatusAdiantamento = 'AGUARDANDO_AUTORIZACAO' | 'AUTORIZADO' | 'RECUSADO' | 'RESSARCIDO';

export interface Adiantamento {
  readonly id: AdiantamentoId;
  /** Quem tirou do próprio bolso. */
  readonly pessoaId: PessoaId;
  readonly pessoaNome: string;
  /** A2: sempre uma conta de titularidade `PESSOAL_DE_TERCEIRO`, e A3: dela. */
  readonly contaOrigemId: ContaId;
  readonly contaOrigemNome: string;
  readonly valor: Dinheiro;
  readonly dataDespesa: DataLocal;
  readonly motivo: string;
  readonly categoria: string;
  readonly grupo: string | null;
  /** A despesa em si já foi lançada; o adiantamento só a acompanha. */
  readonly lancamentoId: LancamentoId;
  readonly comprovante: Anexo | null;
  readonly status: StatusAdiantamento;
  readonly autorizadoPorNome: string | null;
  readonly autorizadoEm: DataLocal | null;
  readonly recusaMotivo: string | null;
  /** A4: o ressarcimento é transferência de valor igual; A5: não gera lançamento. */
  readonly ressarcidoEm: DataLocal | null;
  readonly contaRessarcimentoNome: string | null;
}

/* ---------------------------------------------------------------------------
   Importação e conciliação — Doc 2 §1.11.

   É o que o Doc 1 §5.3 chama de estratégia principal de captura, e o Doc 4 de
   "o que consolida a confiança": o extrato é a **verdade bancária**, e o
   registro humano é a **intenção**. Cruzar os dois faz aparecer o que hoje é
   invisível — o dinheiro que saiu e ninguém registrou.
   --------------------------------------------------------------------------- */

export type StatusLinhaExtrato = 'NAO_CONCILIADA' | 'CONCILIADA' | 'IGNORADA';

export interface LinhaExtrato {
  readonly id: LinhaExtratoId;
  /** FITID do OFX — chave de idempotência: reimportar não duplica (I1). */
  readonly identificadorExterno: string;
  readonly data: DataLocal;
  readonly valor: Dinheiro;
  readonly sinal: 'CREDITO' | 'DEBITO';
  readonly descricaoBanco: string;
  readonly status: StatusLinhaExtrato;
  /** I2: no máximo um dos dois, nunca os dois. */
  readonly lancamentoId: LancamentoId | null;
  readonly transferenciaId: TransferenciaId | null;
  readonly motivoIgnorada: string | null;
}

/** O lançamento como a conciliação o enxerga. */
export interface LancamentoAConciliar {
  readonly id: LancamentoId;
  readonly data: DataLocal;
  readonly motivo: string;
  readonly valor: Dinheiro;
  readonly natureza: Natureza;
  readonly conta: string;
  readonly registradoPorNome: string;
}

export type ForcaDaSugestao = 'ALTA' | 'MEDIA';

/** O motor propõe; o humano confirma — sempre (Doc 2 §1.11). */
export interface SugestaoDeCasamento {
  readonly linha: LinhaExtrato;
  readonly lancamento: LancamentoAConciliar;
  readonly forca: ForcaDaSugestao;
  /** Por que casou: mesmo valor, proximidade de data, mesma conta. */
  readonly porque: string;
}

export interface ImportacaoDeExtrato {
  readonly id: ImportacaoId;
  readonly contaId: ContaId;
  readonly contaNome: string;
  readonly arquivo: string;
  readonly periodo: { readonly de: DataLocal; readonly ate: DataLocal };
  readonly importadoPorNome: string;
  readonly importadoEm: DataHora;
  readonly linhasLidas: number;
  /** Quantas já existiam por FITID e foram descartadas na entrada (I1). */
  readonly linhasJaConhecidas: number;
}

export interface ReaberturaDePeriodo {
  readonly motivo: string;
  readonly reabertoPor: UsuarioId;
  readonly reabertoEm: DataHora;
  readonly hashAnterior: string;
}

export interface PeriodoContabil {
  readonly id: PeriodoContabilId;
  readonly unidadeId: UnidadeId;
  readonly competencia: Competencia;
  readonly fechado: boolean;
  readonly fechadoPor: UsuarioId | null;
  readonly fechadoEm: DataHora | null;
  readonly hash: string | null;
  readonly reaberturas: readonly ReaberturaDePeriodo[];
  readonly versao: number;
}
