import { iniciais } from '@/lib/formato';

export function Avatar({ nome }: { nome: string }) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: 34,
        height: 34,
        flex: '0 0 auto',
        borderRadius: 'var(--radius-sm)',
        background: 'var(--color-royal-soft)',
        color: 'var(--color-royal-deep)',
        display: 'grid',
        placeItems: 'center',
        font: '700 12px var(--font-data)',
      }}
    >
      {iniciais(nome)}
    </span>
  );
}
