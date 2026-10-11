import { useState } from 'react';
import { VistaEmBarras } from './components/VistaEmBarras';
import { VistaEmRosca } from './components/VistaEmRosca';
import type { FatiaDaQuebra } from './tipos';
import { fatiasDaQuebra } from './utils/fatias';

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

  const fatias = fatiasDaQuebra(itens, total, hover);

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
        <VistaEmBarras fatias={fatias} itens={itens} maior={maior} onAbrir={onAbrir} onHover={setHover} />
      ) : (
        <VistaEmRosca
          fatias={fatias}
          emFoco={emFoco}
          total={total}
          densidade={campo ? 'field' : 'office'}
          onAbrir={onAbrir}
          onHover={setHover}
        />
      )}
    </div>
  );
}
