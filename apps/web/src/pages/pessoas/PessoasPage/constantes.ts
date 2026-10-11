import type { SheetOption } from '@/ds';

export const OPCOES_DO_FILTRO: readonly SheetOption[] = [
  { value: 'todos', label: 'Todas' },
  { value: 'Fardado', label: 'Fardados' },
  { value: 'Frequentador', label: 'Frequentadores' },
  { value: 'Visitante', label: 'Visitantes' },
  { value: 'pendentes', label: 'Anamnese pendente' },
  { value: 'ativos', label: 'Somente ativas' },
];
