import { hoje } from '@/pages/mocks/relogio';
import { formatarData } from '@/pages/utils/formato';

/** `2026-09-02T09:58:00-03:00` → `09:58`. As fixtures já vêm no fuso da casa. */
export const hora = (em: string): string => em.slice(11, 16);
export const dia = (em: string): string => em.slice(0, 10);

export const MS_MINUTO = 60_000;

export function rotularDia(iso: string): string {
  if (iso === hoje) return 'hoje';
  const anterior = new Date(new Date(`${hoje}T12:00:00`).getTime() - 24 * 60 * MS_MINUTO);
  const ontem = anterior.toISOString().slice(0, 10);
  if (iso === ontem) return 'ontem';
  return formatarData(iso);
}
