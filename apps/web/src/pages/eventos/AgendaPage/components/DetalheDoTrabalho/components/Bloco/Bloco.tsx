export function Bloco({ titulo, nota, children }: { titulo: string; nota?: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: 'var(--border-hairline)',
        borderRadius: 'var(--radius-lg)',
        padding: '16px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>{titulo}</span>
        {nota ? <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{nota}</span> : null}
      </div>
      {children}
    </div>
  );
}
