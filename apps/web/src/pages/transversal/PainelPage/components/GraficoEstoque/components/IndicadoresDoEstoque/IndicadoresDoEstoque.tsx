import { formatarLitros } from '@/pages/utils/formato';

export function IndicadoresDoEstoque({
  totalAtual,
  media,
  cobertura,
}: {
  totalAtual: number;
  media: number;
  cobertura: number;
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'baseline' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span
          style={{
            font: 'var(--text-amount-lg)',
            letterSpacing: 'var(--tracking-amount)',
            fontVariantNumeric: 'tabular-nums',
            color: 'var(--color-royal-deep)',
          }}
        >
          {formatarLitros(totalAtual)}
        </span>
        <span style={{ font: 'var(--text-body)', color: 'var(--text-secondary)' }}>litros hoje</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span
          style={{
            font: 'var(--text-amount)',
            letterSpacing: 'var(--tracking-amount)',
            fontVariantNumeric: 'tabular-nums',
            color: 'var(--text-primary)',
          }}
        >
          {formatarLitros(media)} L
        </span>
        <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
          consumo médio por cerimônia
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span
          style={{
            font: 'var(--text-amount)',
            letterSpacing: 'var(--tracking-amount)',
            fontVariantNumeric: 'tabular-nums',
            color: 'var(--text-primary)',
          }}
        >
          {cobertura}
        </span>
        <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
          cerimônias de folga no ritmo atual
        </span>
      </div>
    </div>
  );
}
