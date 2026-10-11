import type { ReactNode } from 'react';
import { MOLDURA_DOS_PONTOS } from './constantes';

export interface PontoDeAtencao {
  nome: string;
  nota: string;
}

export interface PontosDeAtencaoProps {
  pontos: readonly PontoDeAtencao[];
  moldura: keyof typeof MOLDURA_DOS_PONTOS;
  cabecalho?: ReactNode;
  rodape?: ReactNode;
}

export function PontosDeAtencao({ pontos, moldura, cabecalho, rodape }: PontosDeAtencaoProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--color-attention-soft)',
        border: '1px solid var(--color-attention-border)',
        ...MOLDURA_DOS_PONTOS[moldura],
      }}
    >
      {cabecalho}
      {pontos.map((ponto) => (
        <div key={ponto.nome} style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'baseline' }}>
          <span style={{ font: 'var(--text-body)', color: 'var(--text-primary)' }}>{ponto.nome}</span>
          <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{ponto.nota}</span>
        </div>
      ))}
      {rodape}
    </div>
  );
}
