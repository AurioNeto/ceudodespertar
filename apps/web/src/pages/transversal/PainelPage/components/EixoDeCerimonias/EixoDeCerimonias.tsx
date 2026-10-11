import type { ReactNode } from 'react';
import { COLUNAS_DAS_CERIMONIAS } from './constantes';

export interface CerimoniaNoEixo {
  chave: string;
  data: string;
  nome: string;
  destaque?: ReactNode;
}

export interface EixoDeCerimoniasProps {
  cerimonias: readonly CerimoniaNoEixo[];
  corDaData: string;
  recuo?: string;
  espaco?: number;
}

export function EixoDeCerimonias({ cerimonias, corDaData, recuo, espaco }: EixoDeCerimoniasProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: recuo ? `${recuo} ${COLUNAS_DAS_CERIMONIAS}` : COLUNAS_DAS_CERIMONIAS,
        gap: espaco,
        marginTop: 2,
      }}
    >
      {recuo ? <div /> : null}
      {cerimonias.map((cerimonia) => (
        <div
          key={cerimonia.chave}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            alignItems: 'center',
            textAlign: 'center',
            minWidth: 0,
          }}
        >
          {cerimonia.destaque}
          <span style={{ font: 'var(--text-code)', fontVariantNumeric: 'tabular-nums', color: corDaData }}>
            {cerimonia.data}
          </span>
          <span
            style={{
              font: 'var(--text-small)',
              color: 'var(--text-secondary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '100%',
            }}
          >
            {cerimonia.nome}
          </span>
        </div>
      ))}
    </div>
  );
}
