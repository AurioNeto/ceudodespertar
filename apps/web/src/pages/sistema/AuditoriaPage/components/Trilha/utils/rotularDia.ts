import { hoje } from '@/pages/mocks/relogio';
import { formatarData } from '@/pages/utils/formato';
import { MS_MINUTO } from '../../../utils/instante';

export function rotularDia(iso: string): string {
  if (iso === hoje) return 'hoje';
  const anterior = new Date(new Date(`${hoje}T12:00:00`).getTime() - 24 * 60 * MS_MINUTO);
  const ontem = anterior.toISOString().slice(0, 10);
  if (iso === ontem) return 'ontem';
  return formatarData(iso);
}
