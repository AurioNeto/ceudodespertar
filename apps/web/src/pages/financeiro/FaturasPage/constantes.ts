import type { StatusFatura } from '@cdd/contracts';
import type { BadgeTone } from '@/ds';

export const TOM: Record<StatusFatura, BadgeTone> = {
  ABERTA: 'royal',
  FECHADA: 'pending',
  PAGA: 'confirmed',
};

export const ROTULO: Record<StatusFatura, string> = {
  ABERTA: 'Aberta',
  FECHADA: 'Fechada, a pagar',
  PAGA: 'Paga',
};
