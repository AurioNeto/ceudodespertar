import { formatarBRL } from '@/pages/utils/formato';

export const totalComContribuicaoACombinar = (custoConhecido: number): string =>
  `${formatarBRL(custoConhecido)} + a combinar`;
