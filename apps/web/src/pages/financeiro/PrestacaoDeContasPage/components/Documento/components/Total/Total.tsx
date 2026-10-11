import { formatarDinheiro } from '@/pages/utils/formato';

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
      <span data-numeric style={{ font: 'var(--text-amount)', color: 'var(--text-primary)' }}>
        {formatarDinheiro(valor)}
      </span>
    </div>
  );
}
