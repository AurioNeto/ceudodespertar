import { Icon } from '@/ds';

/** Q3 do Doc 4 §14.2, ainda sem resposta — e a resposta muda quem pode mexer. */
export function QuestaoAberta() {
  return (
    <div
      style={{
        background: 'var(--color-suggest-soft)',
        border: '1px solid var(--color-suggest-border)',
        borderRadius: 'var(--radius)',
        padding: '13px 16px',
        display: 'flex',
        gap: 11,
        alignItems: 'flex-start',
      }}
    >
      <Icon name="message-circle-question" size={18} color="var(--color-suggest)" style={{ marginTop: 2 }} />
      <div>
        <div style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>
          Quem cadastra leito: a operação ou a administração?
        </div>
        <p style={{ marginTop: 5, font: 'var(--text-small)', color: 'var(--text-secondary)', maxWidth: '74ch' }}>
          Se cadastro de dormitório é operação de evento, o Acolhimento mexe. Se é parâmetro da casa, só a
          administração. A pergunta está aberta desde o mapa de telas e a resposta muda a permissão — por enquanto
          esta aba segue a leitura mais restrita.
        </p>
      </div>
    </div>
  );
}
