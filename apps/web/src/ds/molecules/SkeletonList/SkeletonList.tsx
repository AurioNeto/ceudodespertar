import type { CSSProperties } from 'react';

function Bar({ w, h = 11, top = 0 }: { w: string; h?: number; top?: number }) {
  return (
    <div
      style={{
        width: w,
        height: h,
        marginTop: top,
        borderRadius: 'var(--radius-sm)',
        background: 'linear-gradient(90deg,var(--bg-sunken) 25%,#EAE3D3 37%,var(--bg-sunken) 63%)',
        backgroundSize: '400% 100%',
        animation: 'cdd-sh 1.3s ease infinite',
      }}
    />
  );
}

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
          <Bar w={LARGURAS[i % 4] ?? '50%'} />
          <Bar w={LARGURAS_META[i % 4] ?? '30%'} h={9} top={10} />
        </div>
      ))}
    </div>
  );
}
