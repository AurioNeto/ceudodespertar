import type { Filtros } from './tipos';

export const rotuloLabel = {
  font: 'var(--text-label)',
  textTransform: 'uppercase',
  letterSpacing: 'var(--tracking-label)',
  color: 'var(--text-field-label)',
} as const;

export const FILTROS_LIMPOS: Filtros = {
  grupo: 'todos',
  categoria: 'todas',
  conta: 'todas',
  tipo: 'todos',
  cerimonia: 'todas',
  situacao: 'todas',
};
