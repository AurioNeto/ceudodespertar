import { Icon } from '@/ds';

export function DeQuemEIsso() {
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
      <Icon name="flask-conical" size={19} color="var(--color-ink-brand)" style={{ marginTop: 2 }} />
      <div>
        <div style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>
          Contratação é ato comercial da Munay, não recepção
        </div>
        <p style={{ marginTop: 5, font: 'var(--text-small)', color: 'var(--text-secondary)', maxWidth: '78ch' }}>
          Negociar cachê com outra instituição não é acolher ninguém — por isso esta tela fica fora do Acolhimento. O
          evento continua sendo evento: tem data, local, equipe e custos apurados por evento, e o resultado se lê do
          mesmo jeito que o de um trabalho da casa.
        </p>
      </div>
    </div>
  );
}
