import { AmountDisplay } from '@/ds';

export function Total({ rotulo, valor }: { rotulo: string; valor: number }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        alignItems: 'baseline',
        justifyContent: 'space-between',
        borderTop: '1px solid var(--color-line-gold)',
        paddingTop: 8,
        marginTop: 3,
      }}
    >
      <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>{rotulo}</span>
      <AmountDisplay value={valor / 100} size="sm" />
    </div>
  );
}
