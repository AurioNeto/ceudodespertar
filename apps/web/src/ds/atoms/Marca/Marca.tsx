import { Fragment } from 'react';
import { rotuloVersalete } from '../../fundacao/estilos';
import { CAMINHO_DA_MERKABA, FONTE_DAS_LINHAS, MEDIDA_DA_MERKABA, RESPIRO_DA_LEGENDA } from './constantes';

export type TamanhoDaMarca = 'pequeno' | 'medio' | 'grande';

export interface MarcaProps {
  linhas: readonly string[];
  legenda?: string;
  tamanho: TamanhoDaMarca;
  sobrePapel?: boolean;
}

export function Marca({ linhas, legenda, tamanho, sobrePapel = false }: MarcaProps) {
  const merkaba = MEDIDA_DA_MERKABA[tamanho];
  const estiloDaLegenda = sobrePapel ? { ...rotuloVersalete, color: 'var(--label-on-paper)' } : rotuloVersalete;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <img
        src={CAMINHO_DA_MERKABA}
        alt=""
        aria-hidden="true"
        width={merkaba.largura}
        height={merkaba.altura}
        style={{ flex: '0 0 auto' }}
      />
      <div>
        <div
          style={{
            font: FONTE_DAS_LINHAS[tamanho],
            letterSpacing: '.01em',
            color: sobrePapel ? 'var(--title-on-paper)' : 'var(--color-ink-brand)',
          }}
        >
          {linhas.map((linha, posicao) => (
            <Fragment key={`${posicao}-${linha}`}>
              {posicao > 0 ? <br /> : null}
              {linha}
            </Fragment>
          ))}
        </div>
        {legenda ? <div style={{ ...estiloDaLegenda, marginTop: RESPIRO_DA_LEGENDA[tamanho] }}>{legenda}</div> : null}
      </div>
    </div>
  );
}
