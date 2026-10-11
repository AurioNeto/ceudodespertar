import { Icon } from '@/ds';
import { formatarBRL } from '@/pages/utils/formato';
import type { ContratacaoNaTela } from '../../../../mocks/contratacoes';

export interface DevolucaoProps {
  c: ContratacaoNaTela;
}

export function Devolucao({ c }: DevolucaoProps) {
  return (
    <div
      style={{
        background: 'var(--color-attention-soft)',
        border: '1px solid var(--color-attention-border)',
        borderLeft: 'var(--edge-state) solid var(--color-attention)',
        borderRadius: '0 var(--radius) var(--radius) 0',
        padding: '13px 15px',
        display: 'flex',
        gap: 11,
      }}
    >
      <Icon name="undo-2" size={18} color="var(--color-attention)" style={{ marginTop: 2 }} />
      <div>
        <div style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>
          Cancelada com {formatarBRL(c.devolucaoDevida!.valor)} já recebidos
        </div>
        <p style={{ marginTop: 5, font: 'var(--text-small)', color: 'var(--text-secondary)', maxWidth: '74ch' }}>
          Cancelar uma contratação que já foi paga gera devolução devida ao contratante, e quem paga é a Tesouraria —
          esta tela não devolve dinheiro. {c.devolucaoDevida!.situacao}.
        </p>
      </div>
    </div>
  );
}
