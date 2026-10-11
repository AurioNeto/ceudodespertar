import { Icon } from '@/ds';

export function PorQueApurar() {
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
          O feitio deixa de ser despesa dispersa
        </div>
        <p style={{ marginTop: 5, font: 'var(--text-small)', color: 'var(--text-secondary)', maxWidth: '78ch' }}>
          Folha, cipó, lenha, diesel, comida de quem ficou três dias na casa — hoje isso entra em lugares diferentes e
          ninguém junta. Aqui tudo se pendura no mesmo evento, e no fim sai um número que a casa nunca teve:{' '}
          <b>quanto custa o litro que ela produz</b>. É esse número que decide se vale mais fazer ou comprar.
        </p>
      </div>
    </div>
  );
}
