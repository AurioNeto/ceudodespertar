/** Dias entre uma data `dd/mm/aaaa` e o hoje da tesouraria. */
export function diasEsperando(ddmmaaaa: string): number {
  const [d, m, a] = ddmmaaaa.split('/').map(Number);
  const quando = new Date(a ?? 1970, (m ?? 1) - 1, d ?? 1);
  const hoje = new Date(2026, 8, 11);
  return Math.max(0, Math.round((hoje.getTime() - quando.getTime()) / 86_400_000));
}
