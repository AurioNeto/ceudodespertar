/** Contexto Estoque — Doc 2 §5. Deliberadamente simplificado. */
import type {
  DataLocal,
  EventoId,
  LancamentoId,
  LoteId,
  MovimentoId,
  PessoaId,
  UsuarioId,
} from './kernel.js';

export type OrigemLote = 'FEITIO_PROPRIO' | 'AQUISICAO' | 'DOACAO' | 'RECEBIMENTO_UNIDADE';
export type SituacaoLote = 'EM_USO' | 'LACRADO' | 'QUARENTENA' | 'ESGOTADO';

/** Litros — o daime é medido em volume. */
export type Litros = number;

export interface Lote {
  readonly id: LoteId;
  readonly nome: string;
  readonly origem: OrigemLote;
  readonly fornecedorId: PessoaId | null;
  readonly dataEntrada: DataLocal;
  readonly quantidadeInicial: Litros;
  readonly saldo: Litros;
  readonly forca: string | null;
  readonly local: string;
  readonly guardiao: string;
  readonly situacao: SituacaoLote;
  readonly envase: string | null;
  readonly analise: string | null;
}

export type TipoMovimento =
  | 'ENTRADA_FEITIO'
  | 'ENTRADA_AQUISICAO'
  | 'SAIDA_TRABALHO'
  | 'TRANSFERENCIA'
  | 'PERDA';

export interface MovimentoDeEstoque {
  readonly id: MovimentoId;
  readonly loteId: LoteId;
  readonly tipo: TipoMovimento;
  readonly quantidade: Litros;
  readonly data: DataLocal;
  readonly eventoId: EventoId | null;
  readonly lancamentoId: LancamentoId | null;
  readonly destino: string | null;
  readonly justificativa: string | null;
  readonly registradoPor: UsuarioId;
  readonly registradoPorNome: string;
}

/** Reserva separa do livre; a baixa só acontece no dia do trabalho. */
export interface ReservaDeEstoque {
  readonly eventoId: EventoId;
  readonly evento: string;
  readonly data: DataLocal;
  readonly litrosPrevistos: Litros;
  readonly reservado: boolean;
}

export interface SaldoDeEstoque {
  readonly emEstoque: Litros;
  readonly reservado: Litros;
  readonly livre: Litros;
  readonly previstoProximosTrabalhos: Litros;
}
