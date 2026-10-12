import { Fragment } from 'react';
import { rotuloVersalete } from '../../fundacao/estilos';
import { FONTE_DAS_LINHAS, RESPIRO_DA_LEGENDA } from './constantes';

export type TamanhoDaMarca = 'pequeno' | 'medio' | 'grande';

export interface MarcaProps {
  linhas: readonly string[];
  legenda?: string;
  tamanho: TamanhoDaMarca;
}

export function Marca({ linhas, legenda, tamanho }: MarcaProps) {
  return (
    <>
      <div
        style={{
          font: FONTE_DAS_LINHAS[tamanho],
          letterSpacing: '.01em',
          textTransform: 'uppercase',
          color: 'var(--color-ink-brand)',
        }}
      >
        {linhas.map((linha, posicao) => (
          <Fragment key={`${posicao}-${linha}`}>
            {posicao > 0 ? <br /> : null}
            {linha}
          </Fragment>
        ))}
      </div>
      {legenda ? <div style={{ ...rotuloVersalete, marginTop: RESPIRO_DA_LEGENDA[tamanho] }}>{legenda}</div> : null}
    </>
  );
}
