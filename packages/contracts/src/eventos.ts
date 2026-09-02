/** Contexto Eventos — Doc 2 §2. */
import type {
  Anexo,
  DataLocal,
  Dinheiro,
  EventoId,
  InscricaoId,
  PessoaId,
  TarefaId,
  UnidadeId,
} from './kernel.js';

export type TipoEvento = 'CERIMONIA' | 'FEITIO' | 'CONCENTRACAO' | 'CURA' | 'BAILADO' | 'REUNIAO' | 'TEMAZCAL' | 'JORNADA' | 'SHOW' | 'ENCONTRO';
export type RegimeDeReceita = 'CONTRIBUICAO' | 'CONTRATADO' | 'INTERNO';
export type StatusEvento = 'PLANEJADO' | 'CONFIRMADO' | 'REALIZADO' | 'CANCELADO';

export interface Evento {
  readonly id: EventoId;
  readonly nome: string;
  readonly tipo: TipoEvento;
  readonly regimeDeReceita: RegimeDeReceita;
  readonly status: StatusEvento;
  readonly dataInicio: DataLocal;
  readonly dataFim: DataLocal;
  readonly horaInicio: string;
  readonly horaAbertura: string | null;
  readonly local: string;
  readonly unidadeId: UnidadeId;
  readonly dirigente: string;
  readonly cartaz: Anexo | null;
  readonly capacidade: number;
  readonly leitos: number;
  readonly litrosPrevistos: number;
  /** Opções de contribuição sugerida — o participante escolhe (chat 3). */
  readonly contribuicoesSugeridas: readonly Dinheiro[];
  readonly permiteValorLivre: boolean;
  readonly observacoes: string | null;
  readonly versaoFormularioAnamnese: number;
}

export type TipoParticipacao = 'PARTICIPANTE' | 'CRIANCA_ESTELAR' | 'EQUIPE' | 'CONVIDADO';
export type StatusInscricao = 'PENDENTE' | 'CONFIRMADA' | 'CANCELADA';
export type StatusAnamnese = 'PENDENTE' | 'OK' | 'VENCIDA' | 'NAO_APLICAVEL';

export interface Inscricao {
  readonly id: InscricaoId;
  readonly eventoId: EventoId;
  readonly pessoaId: PessoaId;
  readonly nome: string;
  readonly tipoParticipacao: TipoParticipacao;
  readonly status: StatusInscricao;
  readonly primeiraVezNaCasa: boolean;
  readonly primeiraVezNaAyahuasca: boolean;
  /** Explícito, não derivado da regra de anamnese — v2.1 §18. */
  readonly consagra: boolean;
  readonly contribuicaoEscolhida: Dinheiro | null;
  readonly pago: boolean;
  readonly hospedagem: boolean;
  readonly anamnese: StatusAnamnese;
  readonly pontoDeAtencao: string | null;
}

/** Lista de preparo do trabalho — compartilhável por link e atualizável por webhook. */
export type OrigemMarcacao = 'SISTEMA' | 'LINK_PUBLICO' | 'WEBHOOK';

export interface TarefaDePreparo {
  readonly id: TarefaId;
  readonly eventoId: EventoId;
  readonly texto: string;
  readonly responsavel: string;
  readonly feita: boolean;
  readonly feitaEm: DataLocal | null;
  readonly origemMarcacao: OrigemMarcacao | null;
}

export interface ResumoFinanceiroDoEvento {
  readonly eventoId: EventoId;
  readonly custoPrevisto: Dinheiro;
  readonly custoLancado: Dinheiro;
  readonly contribuicoesEsperadas: Dinheiro;
  readonly contribuicoesRecebidas: Dinheiro;
  readonly resultado: Dinheiro;
  readonly pontoDeEquilibrio: number;
}
