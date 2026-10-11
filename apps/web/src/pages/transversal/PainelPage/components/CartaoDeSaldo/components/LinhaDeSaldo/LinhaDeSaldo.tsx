import { AmountDisplay } from '@/ds';

export function LinhaDeSaldo({ rotulo, valor }: { rotulo: string; valor: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
      <span style={{ font: 'var(--text-body)', color: 'var(--text-primary)' }}>{rotulo}</span>
      <AmountDisplay value={valor / 100} size="sm" />
    </div>
  );
}
