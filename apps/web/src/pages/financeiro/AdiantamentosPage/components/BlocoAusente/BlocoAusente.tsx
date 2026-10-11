import { Icon } from '@/ds';

export interface BlocoAusenteProps {
  titulo: string;
  texto: string;
}

export function BlocoAusente({ titulo, texto }: BlocoAusenteProps) {
  return (
    <div
      style={{
        background: 'var(--bg-sunken)',
        border: '1px solid var(--color-line)',
        borderRadius: 'var(--radius)',
        padding: '15px 17px',
        display: 'flex',
        gap: 12,
      }}
    >
      <Icon name="ban" size={19} color="var(--text-meta)" style={{ marginTop: 2 }} />
      <div>
        <div style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>{titulo}</div>
        <p style={{ marginTop: 5, font: 'var(--text-small)', color: 'var(--text-secondary)', maxWidth: '62ch' }}>{texto}</p>
      </div>
    </div>
  );
}
