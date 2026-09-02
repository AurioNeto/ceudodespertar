import { useState } from 'react';
import { formatarValor } from '../../lib/formato';
import { PALETA } from '../../mocks/relatorios';

const RAIO = 60;
const CIRCUNFERENCIA = 2 * Math.PI * RAIO;

export interface FatiaDaQuebra {
  nome: string;
  valor: number;
}

export interface PainelDeQuebraProps {
  titulo: string;
  itens: readonly FatiaDaQuebra[];
  onAbrir: (nome: string) => void;
  campo?: boolean;
}

/** Barras ou rosca, com a mesma cor por item nos dois modos. */
export function PainelDeQuebra({ titulo, itens, onAbrir, campo = false }: PainelDeQuebraProps) {
  const [vista, setVista] = useState<'barras' | 'rosca'>('barras');
  const [hover, setHover] = useState<number | null>(null);

  const total = itens.reduce((a, i) => a + i.valor, 0);
  const maior = Math.max(1, ...itens.map((i) => i.valor));
  const emFoco = hover != null ? itens[hover] : null;

  let acumulado = 0;
  const fatias = itens.map((item, i) => {
    const fracao = total > 0 ? item.valor / total : 0;
    const fatia = {
      ...item,
      cor: PALETA[i % PALETA.length] as string,
      fracao,
      dash: `${(fracao * CIRCUNFERENCIA).toFixed(2)} ${CIRCUNFERENCIA.toFixed(2)}`,
      offset: (-acumulado * CIRCUNFERENCIA).toFixed(2),
      destacado: hover === i,
      apagado: hover != null && hover !== i,
    };
    acumulado += fracao;
    return fatia;
  });

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: 'var(--border-hairline)',
        borderRadius: 'var(--radius-lg)',
        padding: campo ? '14px' : '16px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>{titulo}</span>
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          {(['barras', 'rosca'] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={vista === v}
              onClick={() => setVista(v)}
              style={{
                font: 'var(--text-small)',
                padding: '6px 11px',
                minHeight: 32,
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                border: `1px solid ${vista === v ? 'var(--color-royal-border)' : 'var(--color-line)'}`,
                background: vista === v ? 'var(--color-royal-soft)' : 'var(--bg-card)',
                color: vista === v ? 'var(--color-royal-deep)' : 'var(--text-secondary)',
              }}
            >
              {v === 'barras' ? 'Barras' : 'Rosca'}
            </button>
          ))}
        </span>
      </div>

      {vista === 'barras' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {fatias.map((f) => (
            <button
              key={f.nome}
              type="button"
              onClick={() => onAbrir(f.nome)}
              onMouseEnter={() => setHover(itens.findIndex((i) => i.nome === f.nome))}
              onMouseLeave={() => setHover(null)}
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
      ) : (
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
                    onMouseEnter={() => setHover(i)}
                    onMouseLeave={() => setHover(null)}
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
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
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
      )}
    </div>
  );
}
