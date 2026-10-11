import type { BadgeTone, SheetOption } from '@/ds';
import type { EstadoDaAnamnese } from './mocks/pessoas';

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

export const OPCOES_DO_FILTRO: readonly SheetOption[] = [
  { value: 'todos', label: 'Todas' },
  { value: 'Fardado', label: 'Fardados' },
  { value: 'Frequentador', label: 'Frequentadores' },
  { value: 'Visitante', label: 'Visitantes' },
  { value: 'pendentes', label: 'Anamnese pendente' },
  { value: 'ativos', label: 'Somente ativas' },
];

export const rotuloLabel = {
  font: 'var(--text-label)',
  textTransform: 'uppercase',
  letterSpacing: 'var(--tracking-label)',
  color: 'var(--text-field-label)',
} as const;
