import { formatarBRL } from '@/pages/utils/formato';

export interface BarraProps {
  rotulo: string;
  valor: number | null;
  maximo: number;
  cor: string;
  vazio: string;
}

export function Barra({ rotulo, valor, maximo, cor, vazio }: BarraProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px 10px', alignItems: 'baseline' }}>
        <span style={{ font: 'var(--text-small)', color: 'var(--text-primary)', flex: 1, minWidth: 180 }}>
          {rotulo}
        </span>
        <span data-numeric style={{ font: 'var(--text-amount)', color: valor === null ? 'var(--text-meta)' : cor }}>
          {valor === null ? vazio : `${formatarBRL(valor)}/L`}
        </span>
      </div>
      <div style={{ height: 9, borderRadius: 'var(--radius-pill)', background: 'var(--bg-sunken)', overflow: 'hidden' }}>
        <div
          style={{
            width: valor === null ? '0%' : `${Math.min(100, (valor / maximo) * 100)}%`,
            height: '100%',
            background: cor,
            transition: 'width var(--motion)',
          }}
        />
      </div>
    </div>
  );
}
