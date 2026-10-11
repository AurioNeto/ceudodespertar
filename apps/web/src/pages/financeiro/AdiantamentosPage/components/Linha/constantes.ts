import type { StatusAdiantamento } from '@cdd/contracts';
import type { BadgeTone } from '@/ds';

export const TOM: Record<StatusAdiantamento, BadgeTone> = {
  AGUARDANDO_AUTORIZACAO: 'pending',
  AUTORIZADO: 'royal',
  RECUSADO: 'attention',
  RESSARCIDO: 'confirmed',
};

export const ROTULO: Record<StatusAdiantamento, string> = {
  AGUARDANDO_AUTORIZACAO: 'Aguardando autorização',
  AUTORIZADO: 'A ressarcir',
  RECUSADO: 'Recusado',
  RESSARCIDO: 'Ressarcido',
};
