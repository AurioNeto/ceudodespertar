/**
 * Read models — o que as telas consultam. Doc 1 §4.6: consultas vão direto a
 * um modelo de leitura, com os rótulos já resolvidos, em vez de montar o
 * agregado. É este o contrato que o front-end consome.
 */
import type {
  CategoriaId,
  Competencia,
  ContaId,
  DataLocal,
  Dinheiro,
  EventoId,
  FundoId,
  LancamentoId,
  PessoaId,
  UnidadeId,
} from './kernel.js';
import type {
  Confianca,
  Natureza,
  RegimeDaUnidade,
  SituacaoConciliacao,
  TipoCategoria,
  TipoConta,
  Titularidade,
  OrigemCaptura,
  OrigemLancamento,
  StatusLancamento,
  TipoLancamento,
} from './financeiro.js';

export interface LancamentoNaLista {
  readonly id: LancamentoId;
  readonly tipo: TipoLancamento;
  readonly motivo: string;
  readonly valor: Dinheiro;
  readonly data: DataLocal;
  readonly hora: string;
  readonly competencia: Competencia;
  readonly status: StatusLancamento;
  readonly origem: OrigemLancamento;
  /** Quem lançou — aparece no livro geral, não em "meus registros". */
  readonly registradoPor: string;
  readonly grupo: string | null;
  readonly categorias: readonly string[];
  readonly conta: string;
  readonly contaDestino: string | null;
  readonly formaPagamento: string;
  readonly contraparte: string | null;
  readonly cerimonia: string | null;
  readonly eventoId: EventoId | null;
  readonly comprovante: string | null;
  readonly versao?: number;
}

export interface EventoDoHistorico {
  readonly quando: string;
  readonly quem: string;
  readonly oQue: string;
}

/** Um item da fila de verificação em lote, como a tela o lê. */
export interface ItemNaFila {
  readonly id: LancamentoId;
  readonly origem: OrigemCaptura;
  readonly confianca: Confianca;
  readonly tipo: TipoLancamento;
  readonly valor: Dinheiro;
  readonly motivo: string;
  readonly data: DataLocal;
  readonly grupo: string | null;
  readonly categoria: string | null;
  readonly conta: string;
  readonly contaDestino: string | null;
  /** Quem mandou o comprovante ou fez o registro rápido; nulo no extrato. */
  readonly remetente: string | null;
  readonly anexo: string | null;
  readonly versao?: number;
}

export interface ContaComSaldo {
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
  readonly versao?: number;
}

export interface FundoComSaldo {
  readonly id: FundoId;
  readonly codigoSistema: string;
  readonly nome: string;
  readonly nota: string;
  readonly contaVinculadaId: ContaId;
  readonly valorReservado: Dinheiro;
  readonly meta: Dinheiro | null;
  readonly ativo: boolean;
  readonly versao?: number;
}

export interface CategoriaDoPlano {
  readonly id: CategoriaId;
  readonly codigoSistema: string;
  readonly nome: string;
  readonly natureza: Natureza;
  readonly tipo: TipoCategoria;
  readonly regimesPermitidos: readonly RegimeDaUnidade[];
  readonly linhaRelatorio: string | null;
  readonly ativa: boolean;
  readonly lancamentos: number;
  readonly nota: string | null;
}

export interface UnidadeDoPlano {
  readonly id: UnidadeId;
  readonly codigoSistema: string;
  readonly nome: string;
  readonly regime: RegimeDaUnidade | null;
  readonly documentoFiscal: string | null;
  readonly tetoFaturamentoAnual: Dinheiro | null;
  readonly faturamentoNoAno: Dinheiro | null;
  readonly ativa: boolean;
  readonly nota: string | null;
}
