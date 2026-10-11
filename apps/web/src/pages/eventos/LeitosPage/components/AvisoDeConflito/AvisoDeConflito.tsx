import { Icon } from '@/ds';
import { pluralizar } from '@/pages/utils/formato';
import { conflitoDeAgenda } from '../../mocks/leitos';
import { rotuloDaNoite } from '../../utils/noites';

export function AvisoDeConflito() {
  return (
    <div
      style={{
        background: 'var(--color-pending-soft)',
        border: '1px solid var(--color-pending-border)',
        borderLeft: 'var(--edge-state) solid var(--color-pending)',
        borderRadius: '0 var(--radius) var(--radius) 0',
        padding: '15px 17px',
        display: 'flex',
        gap: 12,
      }}
    >
      <Icon name="triangle-alert" size={20} color="var(--color-pending)" style={{ marginTop: 2 }} />
      <div>
        <div style={{ font: 'var(--text-title-sm)', color: 'var(--text-title)' }}>
          Outro evento usa o mesmo local na {rotuloDaNoite(conflitoDeAgenda.noite)}
        </div>
        <p style={{ marginTop: 6, font: 'var(--text-body)', color: 'var(--text-secondary)', maxWidth: '76ch' }}>
          <b>{conflitoDeAgenda.evento}</b>, em {conflitoDeAgenda.local}, ocupa cerca de{' '}
          {pluralizar(conflitoDeAgenda.leitosQueEleUsa, 'leito')} na mesma noite — e{' '}
          <b>o sistema não impede a sobreposição</b>. A conta de leitos é feita por evento, não pela casa inteira, e
          quem confere as duas agendas é gente.
        </p>
        <p style={{ marginTop: 7, font: 'var(--text-small)', color: 'var(--color-pending)' }}>
          As noites com conflito vêm marcadas na grade. Alocar continua permitido — só não continua silencioso.
        </p>
      </div>
    </div>
  );
}
