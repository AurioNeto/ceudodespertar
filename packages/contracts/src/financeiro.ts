/** Contexto Financeiro — Doc 2 §1. */
import type {
  Anexo,
  Competencia,
  ContaId,
  CategoriaId,
  DataHora,
  DataLocal,
  Dinheiro,
  EventoId,
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

export interface PeriodoContabil {
  readonly unidadeId: UnidadeId;
  readonly competencia: Competencia;
  readonly fechado: boolean;
  readonly fechadoPor: string | null;
  readonly fechadoEm: DataHora | null;
  readonly reaberturas: number;
  readonly hash: string | null;
}
