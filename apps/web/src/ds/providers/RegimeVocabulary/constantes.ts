import type { RegimeDaUnidade } from '@cdd/contracts';
import type { Vocabulario } from './tipos';

export const VOCAB: Record<RegimeDaUnidade, Vocabulario> = {
  CONTRIBUICAO: {
    receita: 'contribuição',
    pessoa: 'participante',
    valor: 'valor sugerido',
    documento: 'recibo de contribuição',
  },
  COMERCIAL: {
    receita: 'venda',
    pessoa: 'cliente',
    valor: 'preço',
    documento: 'nota / comprovante de venda',
  },
};

export const REGIME_PADRAO: RegimeDaUnidade = 'CONTRIBUICAO';
