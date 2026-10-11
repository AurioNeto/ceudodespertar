import type { Comparacao } from '../tipos';

/** Texto do delta contra a base de comparação. */
export function textoDoDelta(atual: number, base: number | null, comparar: Comparacao): string {
  if (comparar === 'nenhum') return '';
  if (base == null || base === 0) return 'sem base de comparação';
  const p = ((atual - base) / Math.abs(base)) * 100;
  return `${p >= 0 ? '+' : ''}${p.toFixed(0)}% vs ${comparar === 'anterior' ? 'período anterior' : 'ano passado'}`;
}

export function corDoDelta(atual: number, base: number | null, bomSeSobe: boolean, comparar: Comparacao): string {
  if (comparar === 'nenhum' || base == null || base === 0) return 'var(--text-meta)';
  return atual >= base === bomSeSobe ? 'var(--color-confirmed)' : 'var(--color-attention)';
}
