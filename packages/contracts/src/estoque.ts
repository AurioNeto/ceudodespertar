/** Contexto Estoque — Doc 2 §5. Deliberadamente simplificado. */
import type {
  DataLocal,
  Dinheiro,
  EventoId,
  FeitioId,
  ItemId,
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

/* ---------------------------------------------------------------------------
   Feitio — Doc 2 §4.3 e Doc 4, S-04.

   Processo produtivo, e o único lugar do sistema onde **evento, custo e
   estoque** se encontram: o feitio é um evento (tem data, equipe, local), o
   que se gasta nele são lançamentos vinculados ao mesmo `eventoId`, e o que
   sai dele é um lote.

   O agregado existe por uma razão econômica, não contábil. Hoje o feitio é
   despesa dispersa — folha aqui, diesel ali, alimentação da equipe em outro
   lugar — e ninguém consegue responder **quanto custa o litro que a casa
   produz**. Sem esse número não dá para comparar com o custo de comprar de
   fora, que é a decisão real por trás de fazer feitio.
   --------------------------------------------------------------------------- */

export type StatusFeitio = 'EM_ANDAMENTO' | 'CONCLUIDO';

/** Folha, cipó, lenha — o que entra na panela, medido em unidade própria. */
export interface ConsumoDeMateriaPrima {
  readonly itemId: ItemId;
  readonly nome: string;
  readonly quantidade: number;
  readonly unidade: string;
  readonly custo: Dinheiro;
  readonly origem: string;
}

/** Custo do feitio que não é matéria-prima: mão de obra, diesel, comida. */
export interface CustoDoFeitio {
  readonly lancamentoId: LancamentoId;
  readonly descricao: string;
  readonly categoria: string;
  readonly valor: Dinheiro;
  /** Lançamento ainda na fila de verificação deixa o custo por litro parcial. */
  readonly confirmado: boolean;
}

export interface Feitio {
  readonly id: FeitioId;
  /** O evento associado é de tipo `FEITIO`. */
  readonly eventoId: EventoId;
  readonly nome: string;
  readonly dataInicio: DataLocal;
  readonly dataFim: DataLocal | null;
  readonly status: StatusFeitio;
  readonly participantes: readonly string[];
  readonly materiaPrima: readonly ConsumoDeMateriaPrima[];
  readonly custos: readonly CustoDoFeitio[];
  /** Existe depois de concluir, e é exatamente um. */
  readonly loteProduzidoId: LoteId | null;
  readonly litrosProduzidos: Litros | null;
  readonly forca: string | null;
}
