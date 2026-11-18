import type { Natureza, OrigemLancamento, StatusLancamento, TipoCategoria, TipoConta, TipoLancamento, Titularidade } from './financeiro.js';
import type { ResumoDeEvento } from './eventos.js';
import type { AnexoId, Competencia, ContaId, DataHora, DataLocal, Dinheiro, EventoId, FundoId, GrupoDeCustoId, LancamentoId, PendenciaId, TransferenciaId, UnidadeId } from './kernel.js';

export interface PaginaFinanceira<Item> {
  readonly itens: readonly Item[];
  readonly proximaPagina: number | null;
}

export interface PendenciaNaConsulta {
  readonly id: PendenciaId;
  readonly texto: string;
}

export interface RegistroProprioNaConsulta {
  readonly id: LancamentoId;
  readonly tipo: Exclude<TipoLancamento, 'TRANSFERENCIA'>;
  readonly valor: Dinheiro;
  readonly motivo: string;
  readonly registradoEm: DataHora;
  readonly dataCompetencia: DataLocal | null;
  readonly status: StatusLancamento;
  readonly versao: number;
  readonly pendencia: PendenciaNaConsulta | null;
  readonly comprovanteId: AnexoId | null;
}

export interface ContaNaConsulta { readonly id: ContaId; readonly nome: string; }

export interface MovimentoNaConsulta extends Omit<RegistroProprioNaConsulta, 'id' | 'tipo'> {
  readonly id: LancamentoId | TransferenciaId;
  readonly tipo: TipoLancamento;
  readonly origem: OrigemLancamento;
  readonly dataCaixa: DataLocal | null;
  readonly formaPagamento: string | null;
  readonly contraparte: string | null;
  readonly estornoDeId: LancamentoId | TransferenciaId | null;
  readonly registradoPor: string | null;
  readonly unidadeId: UnidadeId | null;
  readonly unidadeDestinoId: UnidadeId | null;
  readonly competencia: Competencia | null;
  readonly conta: ContaNaConsulta | null;
  readonly contaDestino: ContaNaConsulta | null;
  readonly grupo: string | null;
  readonly categorias: readonly string[];
  readonly eventoId: EventoId | null;
  readonly cerimonia: string | null;
}

export type FaltaParaConferir = 'UNIDADE' | 'CONTA' | 'COMPETENCIA' | 'CATEGORIA' | 'PENDENCIA' | 'ETIQUETAS_NAO_FECHAM';
export interface MovimentoNaFila extends MovimentoNaConsulta {
  readonly faltas: readonly FaltaParaConferir[];
}

export interface SaldoDeConta extends ContaNaConsulta {
  readonly descricao: string;
  readonly tipo: TipoConta;
  readonly titularidade: Titularidade;
  readonly unidadeId: UnidadeId | null;
  readonly ativa: boolean;
  readonly saldo: Dinheiro;
  readonly ultimoMovimento: DataLocal | null;
}

export interface SaldoDeFundo {
  readonly id: FundoId;
  readonly codigoSistema: string;
  readonly nome: string;
  readonly nota: string;
  readonly contaVinculadaId: ContaId;
  readonly valorReservado: Dinheiro;
  readonly meta: Dinheiro | null;
  readonly ativo: boolean;
}

export interface TotaisDeResultado {
  readonly receitas: Dinheiro;
  readonly despesas: Dinheiro;
  readonly resultado: Dinheiro;
}

export interface LinhaDeResultado {
  readonly unidadeId: UnidadeId | null;
  readonly competencia: Competencia | null;
  readonly linhaRelatorio: string;
  readonly natureza: Natureza;
  readonly tipo: TipoCategoria;
  readonly valor: Dinheiro;
}

export interface DemonstrativoDeResultado extends TotaisDeResultado {
  readonly linhas: readonly LinhaDeResultado[];
}

export interface ResumoDeResultadoDeCerimonia extends TotaisDeResultado {
  readonly evento: ResumoDeEvento;
}

export interface ResultadoDeCerimonia extends DemonstrativoDeResultado, ResumoDeResultadoDeCerimonia {}

export interface ResultadoDeGrupo extends TotaisDeResultado {
  readonly grupoDeCustoId: GrupoDeCustoId | null;
  readonly nome: string | null;
}

export interface TotaisDeCaixa {
  readonly entradas: Dinheiro;
  readonly saidas: Dinheiro;
  readonly transferenciasLiquidas: Dinheiro;
  readonly liquido: Dinheiro;
}

export interface DiaDeCaixa extends TotaisDeCaixa {
  readonly data: DataLocal;
}

export interface FluxoDeCaixa extends TotaisDeCaixa {
  readonly dias: readonly DiaDeCaixa[];
}
