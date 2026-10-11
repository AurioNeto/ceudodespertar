import { Icon } from '@/ds';
import { pluralizar } from '@/pages/utils/formato';

export function BuracoDoRelatorio({ quantidade, lancamentos }: { quantidade: number; lancamentos: number }) {
  return (
    <div
      style={{
        background: 'var(--color-attention-soft)',
        border: '1px solid var(--color-attention-border)',
        borderLeft: 'var(--edge-state) solid var(--color-attention)',
        borderRadius: '0 var(--radius) var(--radius) 0',
        padding: '15px 17px',
        display: 'flex',
        gap: 12,
      }}
    >
      <Icon name="triangle-alert" size={20} color="var(--color-attention)" style={{ marginTop: 2 }} />
      <div>
        <div style={{ font: 'var(--text-title-sm)', color: 'var(--text-title)' }}>
          {pluralizar(quantidade, 'categoria ativa sem linha de relatório', 'categorias ativas sem linha de relatório')}
        </div>
        <p style={{ marginTop: 6, font: 'var(--text-body)', color: 'var(--text-secondary)', maxWidth: '72ch' }}>
          {pluralizar(lancamentos, 'lançamento')} não aparecem no DRE — e isso não é sinalizado como erro em lugar
          nenhum. Foi assim que R$ 40,6 mil ficaram órfãos na planilha: não estavam errados, estavam fora.
        </p>
        <p style={{ marginTop: 7, font: 'var(--text-small)', color: 'var(--color-attention)' }}>
          Escolher a linha resolve. É a razão de esta tela existir.
        </p>
      </div>
    </div>
  );
}
