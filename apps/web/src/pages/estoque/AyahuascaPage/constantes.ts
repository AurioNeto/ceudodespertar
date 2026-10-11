import type { BadgeTone } from '@/ds';
import type { SituacaoDoLote, TipoDeMovimento } from './mocks/ayahuasca';

export const rotuloDoMovimento: Record<TipoDeMovimento, string> = {
  entrada: 'Entrada',
  saida: 'Saída para trabalho',
  transferencia: 'Transferência',
  perda: 'Perda',
};

export const SITUACAO: Record<SituacaoDoLote, { label: string; tone: BadgeTone }> = {
  'em uso': { label: 'Em uso', tone: 'confirmed' },
  lacrado: { label: 'Lacrado', tone: 'royal' },
  quarentena: { label: 'Quarentena', tone: 'pending' },
  esgotado: { label: 'Esgotado', tone: 'neutral' },
};

export const rotuloLabel = {
  font: 'var(--text-label)',
  textTransform: 'uppercase',
  letterSpacing: 'var(--tracking-label)',
  color: 'var(--text-field-label)',
} as const;

export const valorTabular = {
  font: 'var(--text-amount)',
  letterSpacing: 'var(--tracking-amount)',
  fontVariantNumeric: 'tabular-nums',
} as const;
