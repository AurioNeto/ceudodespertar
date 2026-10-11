import { formatarBRL } from '@/pages/utils/formato';

export function LinhaDeSaldo({ rotulo, valor }: { rotulo: string; valor: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
      <span style={{ font: 'var(--text-body)', color: 'var(--text-primary)' }}>{rotulo}</span>
      <span
        style={{
          font: 'var(--text-amount)',
          letterSpacing: 'var(--tracking-amount)',
          fontVariantNumeric: 'tabular-nums',
          color: 'var(--text-primary)',
        }}
      >
        {formatarBRL(valor)}
      </span>
    </div>
  );
}
