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

const REGIME_PADRAO: RegimeDaUnidade = 'CONTRIBUICAO';

const ehRegimeDoContrato = (regime: unknown): regime is RegimeDaUnidade =>
  typeof regime === 'string' && Object.hasOwn(VOCAB, regime);

const regimeEmUso = (regime: unknown): RegimeDaUnidade => (ehRegimeDoContrato(regime) ? regime : REGIME_PADRAO);

const Ctx = createContext<Vocabulario>(VOCAB[REGIME_PADRAO]);

export interface RegimeVocabularyProps {
  regime?: RegimeDaUnidade;
  children: ReactNode;
  style?: CSSProperties;
}

export function RegimeVocabulary({ regime = REGIME_PADRAO, children, style }: RegimeVocabularyProps) {
  const regimeAplicado = regimeEmUso(regime);

  return (
    <Ctx value={VOCAB[regimeAplicado]}>
      <div data-regime={regimeAplicado.toLowerCase()} style={style}>
        {children}
      </div>
    </Ctx>
  );
}

export const useTermo = (chave: keyof Vocabulario): string => use(Ctx)[chave];
