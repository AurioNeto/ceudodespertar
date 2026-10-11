import type { BadgeTone } from '@/ds';
import type { SituacaoDaVersao } from './mocks/anamnese';

export const TOM_DA_SITUACAO: Record<SituacaoDaVersao, BadgeTone> = {
  rascunho: 'suggest',
  publicada: 'confirmed',
  arquivada: 'neutral',
};

export const rotuloLabel = {
  font: 'var(--text-label)',
  textTransform: 'uppercase',
  letterSpacing: 'var(--tracking-label)',
  color: 'var(--text-field-label)',
} as const;
