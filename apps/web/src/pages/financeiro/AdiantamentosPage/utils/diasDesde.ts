export const diasDesde = (iso: string, hoje: string): number => {
  const [a1, m1, d1] = iso.split('-').map(Number);
  const [a2, m2, d2] = hoje.split('-').map(Number);
  const de = Date.UTC(a1 ?? 1970, (m1 ?? 1) - 1, d1 ?? 1);
  const ate = Date.UTC(a2 ?? 1970, (m2 ?? 1) - 1, d2 ?? 1);
  return Math.max(0, Math.round((ate - de) / 86400000));
};
