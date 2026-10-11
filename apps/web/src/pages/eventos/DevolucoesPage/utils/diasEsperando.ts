import { paraData } from '@/lib/formato';
import { hoje } from '@/pages/mocks/relogio';

/** Dias entre uma data `dd/mm/aaaa` e o hoje da tesouraria. */
export function diasEsperando(ddmmaaaa: string): number {
  const [d, m, a] = ddmmaaaa.split('/').map(Number);
  const quando = new Date(a ?? 1970, (m ?? 1) - 1, d ?? 1);
  return Math.max(0, Math.round((paraData(hoje).getTime() - quando.getTime()) / 86_400_000));
}
