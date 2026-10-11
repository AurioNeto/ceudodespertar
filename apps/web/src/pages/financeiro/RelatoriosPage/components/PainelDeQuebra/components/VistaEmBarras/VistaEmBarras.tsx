import { formatarValor } from '@/lib/formato';
import type { FatiaDaQuebra } from '../../tipos';
import type { fatiasDaQuebra } from '../../utils/fatias';

export interface VistaEmBarrasProps {
  fatias: ReturnType<typeof fatiasDaQuebra>;
  itens: readonly FatiaDaQuebra[];
  maior: number;
  onAbrir: (nome: string) => void;
  onHover: (indice: number | null) => void;
}

export function VistaEmBarras({ fatias, itens, maior, onAbrir, onHover }: VistaEmBarrasProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {fatias.map((f) => (
        <button
          key={f.nome}
          type="button"
          onClick={() => onAbrir(f.nome)}
          onMouseEnter={() => onHover(itens.findIndex((i) => i.nome === f.nome))}
          onMouseLeave={() => onHover(null)}
          title={`${f.nome} · ${formatarValor(f.valor)} · ${Math.round(f.fracao * 100)}%`}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 5,
            cursor: 'pointer',
            textAlign: 'left',
            opacity: f.apagado ? 0.55 : 1,
            transition: 'opacity 200ms ease',
          }}
        >
          <span style={{ display: 'flex', justifyContent: 'space-between', gap: 10, width: '100%' }}>
            <span style={{ font: 'var(--text-small)', color: 'var(--text-primary)' }}>{f.nome}</span>
            <span
              style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}
            >
              {formatarValor(f.valor)}
            </span>
          </span>
          <span
            style={{
              width: '100%',
              height: 8,
              borderRadius: 'var(--radius-pill)',
              background: 'var(--bg-sunken)',
              overflow: 'hidden',
              display: 'block',
            }}
          >
            <span
              style={{
                display: 'block',
                height: '100%',
                borderRadius: 'var(--radius-pill)',
                background: f.cor,
                width: `${(f.valor / maior) * 100}%`,
                transition: 'width 520ms cubic-bezier(.22,.61,.36,1)',
              }}
            />
          </span>
        </button>
      ))}
    </div>
  );
}
