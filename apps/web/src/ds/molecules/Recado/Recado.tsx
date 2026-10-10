import { Icon } from '../../atoms/Icon';

export function Recado({ texto, onFechar }: { texto: string; onFechar: () => void }) {
  return (
    <div
      role="status"
      style={{
        background: 'var(--color-confirmed-soft)',
        border: '1px solid var(--color-confirmed-border)',
        borderRadius: 'var(--radius)',
        padding: '12px 15px',
        display: 'flex',
        gap: 10,
        alignItems: 'flex-start',
      }}
    >
      <Icon name="circle-check" size={17} color="var(--color-confirmed)" style={{ marginTop: 1 }} />
      <span style={{ flex: 1, font: 'var(--text-small)', color: 'var(--text-primary)' }}>{texto}</span>
      <button
        type="button"
        onClick={onFechar}
        aria-label="fechar recado"
        style={{ color: 'var(--text-meta)', cursor: 'pointer', lineHeight: 1 }}
      >
        ×
      </button>
    </div>
  );
}
