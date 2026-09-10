/** Contexto Financeiro — Doc 2 §1. */
import type {
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
  LancamentoId,
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
  readonly ativa: boolean;
}

export type Natureza = 'RECEITA' | 'DESPESA';
export type TipoCategoria = 'OPERACIONAL' | 'INVESTIMENTO' | 'MANUTENCAO' | 'PATRIMONIAL';

export interface Categoria {
  readonly id: CategoriaId;
  readonly codigoSistema: string;
  readonly nome: string;
  readonly natureza: Natureza;
  readonly tipo: TipoCategoria;
  readonly linhaRelatorio: string;
  readonly ativa: boolean;
}

/** "Grupo" na interface: onde o gasto aconteceu (Lojinha, Dormitório, Chácara...). */
export interface GrupoDeCusto {
  readonly codigoSistema: string;
  readonly nome: string;
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
  readonly responsavel: string;
  readonly saldo: Dinheiro;
  readonly ultimoMovimento: DataLocal | null;
  readonly conciliacao: SituacaoConciliacao;
  /** Aviso exibido em tooltip no cartão da conta. */
  readonly alerta: string | null;
  readonly ativa: boolean;
}

/** Fundo com destinação vinculada — parte do saldo, não conta separada (Doc 2 §1.9). */
export interface Fundo {
  readonly id: FundoId;
  readonly codigoSistema: string;
  readonly nome: string;
  /** O destino combinado da reserva, como aparece na tela. */
  readonly nota: string;
  readonly contaVinculadaId: ContaId;
  readonly valorReservado: Dinheiro;
  readonly meta: Dinheiro | null;
  readonly ativo: boolean;
}

export type StatusLancamento = 'A_CONFERIR' | 'CONFIRMADO' | 'ESTORNADO';

export type OrigemLancamento =
  | 'MANUAL'
  | 'IMPORTACAO_EXTRATO'
  | 'REGISTRO_RAPIDO'
  | 'COMPROVANTE_IA'
  | 'MIGRACAO';

export type TipoLancamento = 'ENTRADA' | 'SAIDA' | 'TRANSFERENCIA';

export interface Lancamento {
  readonly id: LancamentoId;
  readonly unidadeId: UnidadeId;
  readonly tipo: TipoLancamento;
  readonly natureza: Natureza;
  /** Sempre positivo; o sinal vem de `tipo`/`natureza`. */
  readonly valor: Dinheiro;
  readonly motivo: string;
  readonly categoriaIds: readonly CategoriaId[];
  readonly grupo: string | null;
  readonly contaId: ContaId;
  readonly contaDestinoId: ContaId | null;
  readonly contraparte: string | null;
  readonly formaPagamento: string | null;
  readonly eventoId: EventoId | null;
  readonly dataCompetencia: DataLocal;
  readonly dataCaixa: DataLocal;
  readonly competencia: Competencia;
  readonly status: StatusLancamento;
  readonly origem: OrigemLancamento;
  readonly registradoPor: UsuarioId;
  readonly registradoPorNome: string;
  readonly registradoEm: DataHora;
  readonly comprovante: Anexo | null;
  readonly reembolsoAId: PessoaId | null;
  readonly estornoDeId: LancamentoId | null;
}

export interface Transferencia {
  readonly id: TransferenciaId;
  readonly contaOrigemId: ContaId;
  readonly contaDestinoId: ContaId;
  readonly valor: Dinheiro;
  readonly data: DataLocal;
  readonly descricao: string;
  readonly registradoPor: UsuarioId;
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

export interface PeriodoContabil {
  readonly unidadeId: UnidadeId;
  readonly competencia: Competencia;
  readonly fechado: boolean;
  readonly fechadoPor: string | null;
  readonly fechadoEm: DataHora | null;
  readonly reaberturas: number;
  readonly hash: string | null;
}
