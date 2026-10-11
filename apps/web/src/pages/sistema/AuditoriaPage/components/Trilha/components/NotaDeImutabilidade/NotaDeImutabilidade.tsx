import { Icon } from '@/ds';

export function NotaDeImutabilidade() {
  return (
    <div
      style={{
        background: 'var(--bg-sunken)',
        border: 'var(--border-hairline)',
        borderRadius: 'var(--radius)',
        padding: '13px 16px',
        display: 'flex',
        gap: 11,
        alignItems: 'flex-start',
      }}
    >
      <Icon name="scroll-text" size={18} color="var(--color-ink-brand)" style={{ marginTop: 2 }} />
      <p style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', maxWidth: '78ch' }}>
        A trilha <b>só cresce</b>. Não há edição, não há exclusão e não há linha que não tenha autor e instante — nem
        para quem administra o sistema. Uma trilha que se pode apagar não serve para a conversa que ela existe para
        sustentar.
      </p>
    </div>
  );
}
