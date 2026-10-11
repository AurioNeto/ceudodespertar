import { Icon } from '@/ds';

export function Espelho() {
  return (
    <div
      style={{
        background: 'var(--bg-sunken)',
        border: 'var(--border-hairline)',
        borderRadius: 'var(--radius)',
        padding: '14px 16px',
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
      }}
    >
      <Icon name="arrow-left-right" size={19} color="var(--color-ink-brand)" style={{ marginTop: 2 }} />
      <div>
        <div style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>
          Pedir e pagar são dois atos, de duas pessoas
        </div>
        <p style={{ marginTop: 5, font: 'var(--text-small)', color: 'var(--text-secondary)', maxWidth: '76ch' }}>
          O Acolhimento cancelou a inscrição e registrou que a pessoa pediu o valor de volta. Esta tela é a outra
          metade, e o Acolhimento não a enxerga — é a fronteira “sem acesso a saída financeira do evento” escrita como
          desenho, não como aviso.
        </p>
      </div>
    </div>
  );
}
