import { Rotulo } from '../../atoms/Rotulo';

export interface NumeroProps {
  rotulo: string;
  valor: string;
  nota?: string;
  /** Destaque para o número que a tela quer que se leia primeiro. */
  destaque?: boolean;
  cor?: string;
}

export function Numero({ rotulo, valor, nota, destaque = false, cor }: NumeroProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
      <Rotulo>{rotulo}</Rotulo>
      <span
        data-numeric
        style={{
          font: destaque ? 'var(--text-amount-lg)' : 'var(--text-amount)',
          color: cor ?? (destaque ? 'var(--color-royal-deep)' : 'var(--text-primary)'),
        }}
      >
        {valor}
      </span>
      {nota ? <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{nota}</span> : null}
    </div>
  );
}
