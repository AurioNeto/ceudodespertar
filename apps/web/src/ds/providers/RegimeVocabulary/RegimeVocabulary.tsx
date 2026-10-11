import type { CSSProperties, ReactNode } from 'react';
import type { RegimeDaUnidade } from '@cdd/contracts';
import { REGIME_PADRAO, VOCAB } from './constantes';
import { Ctx } from './hooks/useTermo';

const ehRegimeDoContrato = (regime: unknown): regime is RegimeDaUnidade =>
  typeof regime === 'string' && Object.hasOwn(VOCAB, regime);

const regimeEmUso = (regime: unknown): RegimeDaUnidade => (ehRegimeDoContrato(regime) ? regime : REGIME_PADRAO);

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
