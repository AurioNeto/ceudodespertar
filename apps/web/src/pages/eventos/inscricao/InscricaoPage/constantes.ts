import type { StatusAnamnese, TipoParticipacao } from '@cdd/contracts';
import type { BadgeTone } from '@/ds';

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

export const TOM_DA_ANAMNESE: Record<string, BadgeTone> = {
  OK: 'confirmed',
  PENDENTE: 'attention',
  VENCIDA: 'attention',
  NAO_APLICAVEL: 'neutral',
};
