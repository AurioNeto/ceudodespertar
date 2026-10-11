export const paraNumero = (v: string): number => {
  const n = parseFloat(v.replace(/\./g, '').replace(',', '.'));
  return Number.isNaN(n) ? 0 : n;
};
