import { Icon } from '@/ds';

export function ContrapesoDaGovernanca() {
  return (
    <div
      style={{
        background: 'var(--color-suggest-soft)',
        border: '1px solid var(--color-suggest-border)',
        borderLeft: 'var(--edge-state) solid var(--color-suggest)',
        borderRadius: '0 var(--radius) var(--radius) 0',
        padding: '15px 17px',
        display: 'flex',
        gap: 12,
      }}
    >
      <Icon name="eye" size={20} color="var(--color-suggest)" style={{ marginTop: 2 }} />
      <div>
        <div style={{ font: 'var(--text-title-sm)', color: 'var(--text-title)' }}>Não há leitura silenciosa</div>
        <p style={{ marginTop: 6, font: 'var(--text-body)', color: 'var(--text-secondary)', maxWidth: '74ch' }}>
          Toda vez que alguém abre uma anamnese, o sistema registra — a regra é do domínio, não da tela, e não existe
          caminho que a contorne. A Governança lê este log porque o Acolhimento tem acesso a dado de saúde da casa
          inteira, e um poder desses precisa de alguém olhando.
        </p>
        <p style={{ marginTop: 7, font: 'var(--text-small)', color: 'var(--color-suggest)' }}>
          Simétrico: consultar este log também vira linha na trilha geral.
        </p>
      </div>
    </div>
  );
}
