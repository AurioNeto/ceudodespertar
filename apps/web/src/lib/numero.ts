const SEM_MILHAR = /^-?\d+(,\d+)?$/;
const COM_MILHAR = /^-?\d{1,3}(\.\d{3})+(,\d+)?$/;

export function lerValorDigitado(texto: string): number {
  const digitado = texto.trim();
  if (!SEM_MILHAR.test(digitado) && !COM_MILHAR.test(digitado)) return Number.NaN;
  return Number(digitado.replace(/\./g, '').replace(',', '.'));
}

const parcelaOuZero = (parcela: string): number => lerValorDigitado(parcela) || 0;

export const lerSoma = (texto: string): number =>
  texto.split('+').reduce((soma, parcela) => soma + parcelaOuZero(parcela), 0);
