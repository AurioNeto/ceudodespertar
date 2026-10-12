export function LegendaDoEstoque({ legenda }: { legenda: { nome: string; cor: string; saldo: string }[] }) {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 18,
        paddingTop: 12,
        borderTop: 'var(--border-hairline)',
      }}
    >
      {legenda.map((l) => (
        <div key={l.nome} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <span style={{ width: 14, height: 14, borderRadius: 2, flex: '0 0 auto', background: l.cor }} />
          <span style={{ font: 'var(--text-body)', color: 'var(--text-primary)' }}>{l.nome}</span>
          <span
            style={{
              font: 'var(--text-amount)',
              letterSpacing: 'var(--tracking-amount)',
              fontVariantNumeric: 'tabular-nums',
              color: 'var(--text-secondary)',
            }}
          >
            {l.saldo}
          </span>
        </div>
      ))}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginLeft: 'auto' }}>
        <svg width={16} height={16} aria-hidden="true">
          <rect
            x={0.5}
            y={0.5}
            width={15}
            height={15}
            fill="url(#hachura-1)"
            stroke="var(--serie-1)"
            strokeWidth={1}
            strokeDasharray="3 3"
          />
        </svg>
        <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
          hachura: consumido na própria cerimônia
        </span>
      </div>
    </div>
  );
}
