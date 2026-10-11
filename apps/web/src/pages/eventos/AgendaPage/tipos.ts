export type TipoDeTrabalho = 'Concentração' | 'Trabalho de cura' | 'Feitio' | 'Bailado' | 'Reunião do corpo';
export type SituacaoDoTrabalho = 'planejada' | 'confirmada' | 'realizada' | 'cancelada';

export interface TarefaDePreparo {
  titulo: string;
  responsavel: string;
}

export interface Trabalho {
  id: number;
  nome: string;
  tipo: TipoDeTrabalho;
  ano: number;
  mes: number;
  dia: number;
  horario: string;
  local: string;
  dirigente: string;
  previstos: number;
  confirmados: number;
  visitantes: number;
  litros: number;
  /** Opções de contribuição sugerida — quem se inscreve escolhe uma. */
  contribuicoes: readonly number[];
  situacao: SituacaoDoTrabalho;
  equipe: readonly (readonly [string, string])[];
  preparo: readonly TarefaDePreparo[];
  previstoGasto: number;
  realizadoGasto: number;
  arrecadado: number;
  observacoes: string;
}

export type EstadoDaAnamnese = 'em dia' | 'vencida' | 'ausente';

export interface ParticipanteDoTrabalho {
  nome: string;
  contato: string;
  vinculo: 'Fardado' | 'Visitante';
  situacao: 'confirmado' | 'espera';
  contribuicao: number;
  anamnese: EstadoDaAnamnese;
  respondida: string;
  atencao: string | null;
}
