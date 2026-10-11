export interface CartaoProps {
  titulo: string;
  children: React.ReactNode;
}

export function Cartao({ titulo, children }: CartaoProps) {
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
      <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>{titulo}</span>
      {children}
    </div>
  );
}
