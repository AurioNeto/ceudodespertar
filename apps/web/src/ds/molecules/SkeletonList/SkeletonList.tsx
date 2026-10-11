import type { CSSProperties } from 'react';
import { BarraDeEsqueleto } from './components/BarraDeEsqueleto';

const LARGURAS = ['58%', '44%', '66%', '38%'] as const;
const LARGURAS_META = ['32%', '26%', '30%', '22%'] as const;

export function SkeletonList({ rows = 4, style }: { rows?: number; style?: CSSProperties }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9, ...style }}>
      <style>{'@keyframes cdd-sh{0%{background-position:100% 0}100%{background-position:0 0}}'}</style>
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          style={{
            background: 'var(--bg-card)',
            border: 'var(--border-hairline)',
            borderRadius: 'var(--radius)',
            padding: '15px 16px',
          }}
        >
          <BarraDeEsqueleto w={LARGURAS[i % 4] ?? '50%'} />
          <BarraDeEsqueleto w={LARGURAS_META[i % 4] ?? '30%'} h={9} top={10} />
        </div>
      ))}
    </div>
  );
}
