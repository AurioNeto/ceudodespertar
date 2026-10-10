export function BarraDeProporcao({
  parte,
  total,
  cor = 'var(--color-confirmed)',
}: {
  parte: number;
  total: number;
  cor?: string;
}) {
  const fracao = total > 0 ? Math.min(1, Math.max(0, parte / total)) : 0;
  return (
    <div
      role="img"
      aria-label={`${Math.round(fracao * 100)}% do total`}
      style={{ height: 8, borderRadius: 'var(--radius-pill)', background: 'var(--bg-sunken)', overflow: 'hidden' }}
    >
      <div style={{ width: `${fracao * 100}%`, height: '100%', background: cor, transition: 'width var(--motion)' }} />
    </div>
  );
}
