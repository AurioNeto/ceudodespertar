import type { Conta } from '@cdd/contracts';
import { Icon, StatusBadge } from '@/ds';
import { formatarDiaMes, formatarDinheiro } from '@/pages/utils/formato';
import { valorGrande } from '../../constantes';
import { iconeDaConta, textoDaConciliacao, tomDaConciliacao } from '../../utils/conta';

export interface CartaoDeContaProps {
  conta: Conta;
}

/** O cartão estica na altura da linha: o conteúdo se distribui, sem sobra embaixo. */
export function CartaoDeConta({ conta }: CartaoDeContaProps) {
  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: 'var(--border-hairline)',
        borderLeft: `3px solid ${conta.conciliacao === 'PENDENTE' ? 'var(--color-pending)' : 'var(--color-confirmed)'}`,
        borderRadius: 'var(--radius)',
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: 10,
        height: '100%',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <Icon name={iconeDaConta(conta)} size={18} color="var(--color-royal)" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: 1 }}>
          <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>{conta.nome}</span>
          <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{conta.descricao}</span>
        </div>
        {conta.alerta ? (
          <span title={conta.alerta} style={{ cursor: 'help', display: 'flex', alignItems: 'center', paddingTop: 2 }}>
            <Icon name="triangle-alert" size={17} color="var(--color-attention)" />
          </span>
        ) : null}
        <StatusBadge tone={tomDaConciliacao(conta)}>{textoDaConciliacao(conta)}</StatusBadge>
      </div>

      <div style={{ ...valorGrande, color: 'var(--text-primary)' }}>{formatarDinheiro(conta.saldo)}</div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 12,
          font: 'var(--text-small)',
          color: 'var(--text-meta)',
        }}
      >
        <span>
          {conta.ultimoMovimento ? `movimento em ${formatarDiaMes(conta.ultimoMovimento)}` : 'sem movimentos ainda'}
        </span>
        <span>responsável: {conta.responsavel}</span>
      </div>
    </div>
  );
}
