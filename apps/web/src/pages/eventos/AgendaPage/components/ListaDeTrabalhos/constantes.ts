import type { BadgeTone } from '@/ds';
import type { SituacaoDoTrabalho } from '../../tipos';

export const TOM_DA_SITUACAO: Record<SituacaoDoTrabalho, BadgeTone> = {
  planejada: 'pending',
  confirmada: 'royal',
  realizada: 'confirmed',
  cancelada: 'neutral',
};
