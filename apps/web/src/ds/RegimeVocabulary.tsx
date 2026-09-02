import { createContext, use } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { RegimeDaUnidade } from '@cdd/contracts';

/**
 * O regime da unidade comuta o vocabulário; nenhum outro componente do
 * sistema pode ter palavra de negócio escrita dentro (Doc 1 §4.3).
 */
export interface Vocabulario {
  receita: string;
  pessoa: string;
  valor: string;
  documento: string;
}

const VOCAB: Record<RegimeDaUnidade, Vocabulario> = {
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

const Ctx = createContext<Vocabulario>(VOCAB.CONTRIBUICAO);

export interface RegimeVocabularyProps {
  regime?: RegimeDaUnidade;
  children: ReactNode;
  style?: CSSProperties;
}

export function RegimeVocabulary({ regime = 'CONTRIBUICAO', children, style }: RegimeVocabularyProps) {
  return (
    <Ctx value={VOCAB[regime]}>
      <div data-regime={regime.toLowerCase()} style={style}>
        {children}
      </div>
    </Ctx>
  );
}

export const useTermo = (chave: keyof Vocabulario): string => use(Ctx)[chave];
