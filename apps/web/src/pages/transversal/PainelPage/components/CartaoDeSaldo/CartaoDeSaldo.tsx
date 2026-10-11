import { AmountDisplay, Icon } from '@/ds';
import { saldoConsolidado, saldoEmBanco, saldoEmCaixa } from '../../mocks/resumoFinanceiro';
import { fundoProprio } from '@/pages/mocks/contas';
import { rotuloLabel } from '../../constantes';
import { LinhaDeSaldo } from './components/LinhaDeSaldo';

export function CartaoDeSaldo() {
  return (
    <div
      style={{
        flex: '1 1 300px',
        maxWidth: 336,
        minWidth: 0,
        background: 'var(--bg-brand)',
        border: '1px solid var(--border-brand)',
        borderRadius: 'var(--radius-lg)',
        padding: '18px 20px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <Icon name="landmark" size={18} color="var(--color-royal-deep)" />
        <div style={rotuloLabel}>Saldo consolidado da unidade</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex' }}>
          <AmountDisplay value={saldoConsolidado / 100} size="hero" style={{ color: 'var(--color-royal-deep)' }} />
        </div>
        <div style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
          em reais · posição de hoje, 09:12
        </div>
      </div>
      <div style={{ height: 1, background: 'var(--border-brand)' }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <LinhaDeSaldo rotulo="caixa" valor={saldoEmCaixa} />
        <LinhaDeSaldo rotulo="banco" valor={saldoEmBanco} />
        <LinhaDeSaldo rotulo="dos quais, fundo próprio" valor={fundoProprio} />
      </div>
    </div>
  );
}
