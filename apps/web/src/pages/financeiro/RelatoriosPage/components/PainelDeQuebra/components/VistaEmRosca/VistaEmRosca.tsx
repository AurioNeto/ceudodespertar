import type { Density } from '@/ds';
import { formatarValor } from '@/lib/formato';
import { RAIO } from '../../constantes';
import type { FatiaDaQuebra } from '../../tipos';
import type { fatiasDaQuebra } from '../../utils/fatias';

export interface VistaEmRoscaProps {
  fatias: ReturnType<typeof fatiasDaQuebra>;
  emFoco: FatiaDaQuebra | null | undefined;
  total: number;
  densidade: Density;
  onAbrir: (nome: string) => void;
  onHover: (indice: number | null) => void;
}

export function VistaEmRosca({ fatias, emFoco, total, densidade, onAbrir, onHover }: VistaEmRoscaProps) {
  const campo = densidade === 'field';

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: campo ? 'wrap' : 'nowrap' }}>
        <div style={{ position: 'relative', width: 148, height: 148, flex: '0 0 auto' }}>
          <svg viewBox="0 0 160 160" style={{ width: 148, height: 148, display: 'block' }}>
            <circle cx={80} cy={80} r={RAIO} fill="none" stroke="var(--bg-sunken)" strokeWidth={26} />
            {fatias.map((f, i) => (
              <circle
                key={f.nome}
                cx={80}
                cy={80}
                r={RAIO}
                fill="none"
                stroke={f.cor}
                strokeWidth={f.destacado ? 32 : 26}
                strokeDasharray={f.dash}
                strokeDashoffset={f.offset}
                onMouseEnter={() => onHover(i)}
                onMouseLeave={() => onHover(null)}
                onClick={() => onAbrir(f.nome)}
                style={{
                  transformOrigin: '80px 80px',
                  transform: `rotate(-90deg) scale(${f.destacado ? 1.07 : 1})`,
                  opacity: f.apagado ? 0.45 : 1,
                  cursor: 'pointer',
                  transition:
                    'transform 220ms cubic-bezier(.22,.61,.36,1), stroke-width 220ms ease, opacity 200ms ease, stroke-dasharray 520ms cubic-bezier(.22,.61,.36,1), stroke-dashoffset 520ms cubic-bezier(.22,.61,.36,1)',
                }}
              />
            ))}
          </svg>
        </div>

        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
          {fatias.map((f, i) => (
            <button
              key={f.nome}
              type="button"
              onClick={() => onAbrir(f.nome)}
              onMouseEnter={() => onHover(i)}
              onMouseLeave={() => onHover(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                opacity: f.apagado ? 0.5 : 1,
                transition: 'opacity 200ms ease',
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 'var(--radius-pill)',
                  flex: '0 0 auto',
                  background: f.cor,
                  transform: `scale(${f.destacado ? 1.35 : 1})`,
                  transition: 'transform 200ms ease',
                }}
              />
              <span
                style={{
                  flex: 1,
                  minWidth: 0,
                  font: 'var(--text-small)',
                  color: 'var(--text-primary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {f.nome}
              </span>
              <span
                style={{
                  font: 'var(--text-small)',
                  color: 'var(--text-secondary)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {Math.round(f.fracao * 100)}%
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* O rótulo saiu do centro da rosca: fica embaixo, como uma linha só. */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 8,
          borderTop: 'var(--border-hairline)',
          paddingTop: 10,
        }}
      >
        <span
          style={{
            font: 'var(--text-small)',
            color: 'var(--text-secondary)',
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {emFoco ? emFoco.nome : 'saídas'}
        </span>
        <span
          style={{
            marginLeft: 'auto',
            font: 'var(--text-amount)',
            letterSpacing: 'var(--tracking-amount)',
            fontVariantNumeric: 'tabular-nums',
            color: 'var(--text-primary)',
          }}
        >
          {formatarValor(emFoco ? emFoco.valor : total)}
        </span>
      </div>
    </>
  );
}
