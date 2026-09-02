import { useState } from 'react';
import { formatarValor } from '../../lib/formato';

export interface PontoDaSerie {
  rotulo: string;
  entrada: number;
  saida: number;
}

export interface GraficoSerieProps {
  serie: readonly PontoDaSerie[];
  acumulados: readonly number[];
  escala: number;
  rotuloPeriodo: string;
  campo?: boolean;
}

/**
 * Bipolar: entradas acima da linha do zero, saídas abaixo, e o acumulado
 * sobreposto na mesma escala e no mesmo zero.
 */
export function GraficoSerie({ serie, acumulados, escala, rotuloPeriodo, campo = false }: GraficoSerieProps) {
  const [hover, setHover] = useState<number | null>(null);

  const pontosDaLinha = acumulados
    .map((v, i) => `${(((i + 0.5) / serie.length) * 100).toFixed(2)},${(50 - (v / escala) * 50).toFixed(2)}`)
    .join(' ');

  const alturaPlot = campo ? 132 : 182;

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: 'var(--border-hairline)',
        borderRadius: 'var(--radius-lg)',
        padding: campo ? '14px 14px' : '16px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>
          Entradas e saídas ao longo do tempo
        </span>
        <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{rotuloPeriodo}</span>
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <ItemDaLegenda cor="var(--color-confirmed)">entradas</ItemDaLegenda>
          <ItemDaLegenda cor="var(--color-attention)">saídas</ItemDaLegenda>
          <ItemDaLegenda cor="var(--color-royal-deep)" linha>
            resultado acumulado
          </ItemDaLegenda>
        </span>
      </div>

      <div style={{ position: 'relative', height: alturaPlot + 26, paddingTop: 6 }}>
        <div style={{ display: 'flex', height: alturaPlot }}>
          {serie.map((d, i) => {
            const destacado = hover === i;
            const apagado = hover != null && !destacado;
            const transicao = 'height 520ms cubic-bezier(.22,.61,.36,1), opacity 180ms ease';
            return (
              <div
                key={d.rotulo}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                style={{
                  position: 'relative',
                  flex: 1,
                  minWidth: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                  padding: '0 5px',
                }}
              >
                {destacado ? (
                  <div
                    style={{
                      position: 'absolute',
                      left: '50%',
                      top: -4,
                      transform: 'translate(-50%,-100%)',
                      zIndex: 3,
                      pointerEvents: 'none',
                      background: 'var(--color-ink-brand)',
                      color: 'var(--bg-card)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '8px 10px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 3,
                      whiteSpace: 'nowrap',
                      boxShadow: 'var(--shadow-raised)',
                    }}
                  >
                    <span
                      style={{
                        font: 'var(--text-label)',
                        letterSpacing: 'var(--tracking-label)',
                        textTransform: 'uppercase',
                        opacity: 0.7,
                      }}
                    >
                      {d.rotulo}
                    </span>
                    <span style={{ font: 'var(--text-small)' }}>entradas {formatarValor(d.entrada)}</span>
                    <span style={{ font: 'var(--text-small)' }}>saídas {formatarValor(d.saida)}</span>
                    <span style={{ font: 'var(--text-small)', opacity: 0.8 }}>
                      acumulado {formatarValor(acumulados[i] ?? 0)}
                    </span>
                  </div>
                ) : null}

                <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                  <div
                    style={{
                      width: campo ? 9 : 14,
                      borderRadius: '3px 3px 0 0',
                      background: 'var(--color-confirmed)',
                      height: `${Math.max(2, (d.entrada / escala) * 100)}%`,
                      opacity: apagado ? 0.45 : 1,
                      transition: transicao,
                    }}
                  />
                </div>
                <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
                  <div
                    style={{
                      width: campo ? 9 : 14,
                      borderRadius: '0 0 3px 3px',
                      background: 'var(--color-attention)',
                      height: `${Math.max(2, (d.saida / escala) * 100)}%`,
                      opacity: apagado ? 0.45 : 1,
                      transition: transicao,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 6 + alturaPlot / 2,
            height: 1,
            background: 'var(--color-line-strong)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ display: 'flex', height: 20, alignItems: 'center' }}>
          {serie.map((d) => (
            <span
              key={d.rotulo}
              style={{
                flex: 1,
                minWidth: 0,
                textAlign: 'center',
                font: 'var(--text-small)',
                color: 'var(--text-meta)',
              }}
            >
              {d.rotulo}
            </span>
          ))}
        </div>

        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{
            position: 'absolute',
            left: 0,
            top: 6,
            width: '100%',
            height: alturaPlot,
            pointerEvents: 'none',
            overflow: 'visible',
          }}
        >
          <polyline
            points={pontosDaLinha}
            fill="none"
            stroke="var(--color-royal-deep)"
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}

function ItemDaLegenda({ cor, linha = false, children }: { cor: string; linha?: boolean; children: string }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 6, font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
      <span style={{ width: linha ? 14 : 10, height: linha ? 2 : 10, borderRadius: linha ? 0 : 2, background: cor }} />
      {children}
    </span>
  );
}
