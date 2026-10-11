import type { Periodo } from '../../tipos';

export const PERIODOS: readonly { valor: Periodo; label: string }[] = [
  { valor: 'mes', label: 'Mês' },
  { valor: 'trimestre', label: 'Trimestre' },
  { valor: 'ano', label: 'Ano' },
  { valor: 'personalizado', label: 'Personalizado' },
];
