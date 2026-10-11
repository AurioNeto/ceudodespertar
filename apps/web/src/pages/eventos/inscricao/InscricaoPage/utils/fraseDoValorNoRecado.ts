import { formatarBRL } from '@/pages/utils/formato';
import { totalComContribuicaoACombinar } from '../../utils/totalComContribuicaoACombinar';

export interface DadosDaFraseDoValor {
  isento: boolean;
  semValor: boolean;
  total: number;
}

export function fraseDoValorNoRecado({ isento, semValor, total }: DadosDaFraseDoValor): string {
  if (isento) return total > 0 ? `Isenta de contribuição. Devido: ${formatarBRL(total)}.` : 'Isenta de contribuição.';
  if (semValor) return total > 0 ? `Devido: ${totalComContribuicaoACombinar(total)}.` : 'Valor a combinar.';
  return `Devido: ${formatarBRL(total)}.`;
}
