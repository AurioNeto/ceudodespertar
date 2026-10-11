import type { BadgeTone } from '@/ds';
import type { EstadoDaAnamnese } from '../../../../tipos';

export const TOM_DA_ANAMNESE: Record<EstadoDaAnamnese, BadgeTone> = {
  'em dia': 'confirmed',
  vencida: 'suggest',
  ausente: 'pending',
};

export const TEXTO_DA_ANAMNESE: Record<EstadoDaAnamnese, string> = {
  'em dia': 'Anamnese em dia',
  vencida: 'Anamnese vencida',
  ausente: 'Sem anamnese',
};
