import type { CSSProperties } from 'react';

export const rotuloVersalete: CSSProperties = {
  font: 'var(--text-label)',
  letterSpacing: 'var(--tracking-label)',
  color: 'var(--text-field-label)',
};

export const FUNDOS_DE_VIDRO: ReadonlySet<string> = new Set([
  'var(--bg-card)',
  'var(--bg-glass)',
  'var(--bg-rail)',
  'var(--color-royal-soft)',
  'var(--color-suggest-soft)',
]);

export const vidroLeve: CSSProperties = {
  backdropFilter: 'var(--glass-leve)',
  WebkitBackdropFilter: 'var(--glass-leve)',
};

export const fundoComVidro = (fundo: string): CSSProperties =>
  FUNDOS_DE_VIDRO.has(fundo) ? { background: fundo, ...vidroLeve } : { background: fundo };
