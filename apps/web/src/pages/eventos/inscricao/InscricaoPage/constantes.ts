import type { StatusAnamnese, TipoParticipacao } from '@cdd/contracts';

export const TIPO_ROTULO: Record<TipoParticipacao, string> = {
  PARTICIPANTE: 'Participante',
  CONVIDADO: 'Convidado',
  EQUIPE: 'Equipe',
  CRIANCA_ESTELAR: 'Criança estelar',
};

export const TIPO_EXPLICACAO: Record<TipoParticipacao, string> = {
  PARTICIPANTE: 'Quem vem participar do trabalho. Contribui e faz anamnese.',
  CONVIDADO: 'Convidado da casa ou de alguém da casa. Contribui e faz anamnese.',
  EQUIPE: 'Guardião, cuidadora, músico, cozinha. Não contribui — é isento, e isento não é zero.',
  CRIANCA_ESTELAR: 'Criança. Exige responsável, modalidade e autorização vigente para este trabalho.',
};

export const CONSAGRA_POR_PADRAO: Record<TipoParticipacao, boolean> = {
  PARTICIPANTE: true,
  CONVIDADO: true,
  EQUIPE: true,
  CRIANCA_ESTELAR: false,
};

export const ANAMNESE_ROTULO: Record<StatusAnamnese, string> = {
  OK: 'Em dia',
  PENDENTE: 'Pendente',
  VENCIDA: 'Vencida',
  NAO_APLICAVEL: 'Não se aplica',
};
