import { formatarBRL } from '@/pages/utils/formato';

export interface DadosDaFraseDoValor {
  isento: boolean;
  semValor: boolean;
  total: number;
}

export function fraseDoValorNoRecado({ isento, semValor, total }: DadosDaFraseDoValor): string {
  if (isento) return total > 0 ? `Isenta de contribuição. Devido: ${formatarBRL(total)}.` : 'Isenta de contribuição.';
  if (semValor) return 'Valor a combinar.';
  return `Devido: ${formatarBRL(total)}.`;
}
