import { lerValorDigitado } from '@/lib/numero';

const SEPARADOR_DE_OPCOES = /\s*,\s+/;

export function contribuicoesDoTexto(texto: string): readonly number[] | null {
  const digitado = texto.trim();
  if (!digitado) return [];
  const valores = digitado.split(SEPARADOR_DE_OPCOES).map(lerValorDigitado);
  return valores.every(Number.isInteger) ? valores : null;
}
