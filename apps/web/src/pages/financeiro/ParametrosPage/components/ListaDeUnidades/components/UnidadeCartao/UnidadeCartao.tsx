import { StatusBadge, Cartao, type Density } from '@/ds';
import { formatarDinheiro } from '@/pages/utils/formato';
import { REGIME_ROTULO } from '../../../../constantes';
import type { UnidadeDoPlano } from '../../../../mocks/parametros';

export function UnidadeCartao({ unidade: u, densidade }: { unidade: UnidadeDoPlano; densidade: Density }) {
  const campo = densidade === 'field';
  const semRegime = u.regime === null;
  const proporcao = u.tetoFaturamentoAnual && u.faturamentoNoAno ? u.faturamentoNoAno / u.tetoFaturamentoAnual : null;

  return (
    <Cartao campo={campo} style={{ gap: 11 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px 11px' }}>
        <span style={{ font: 'var(--text-title-sm)', color: 'var(--text-title)' }}>{u.nome}</span>
        <code style={{ font: 'var(--text-code)' }}>{u.codigoSistema}</code>
        {semRegime ? (
          <StatusBadge tone="pending">Regime a confirmar</StatusBadge>
        ) : (
          <StatusBadge tone={u.regime === 'COMERCIAL' ? 'royal' : 'confirmed'}>{REGIME_ROTULO[u.regime!]}</StatusBadge>
        )}
        {u.documentoFiscal ? (
          <span data-numeric style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>
            CNPJ {u.documentoFiscal}
          </span>
        ) : null}
      </div>

      {u.nota ? <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{u.nota}</span> : null}

      {u.tetoFaturamentoAnual && u.faturamentoNoAno ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
            <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
              Faturamento no ano contra o teto do regime
            </span>
            <span data-numeric style={{ font: 'var(--text-amount)', color: 'var(--text-primary)' }}>
              {formatarDinheiro(u.faturamentoNoAno)} de {formatarDinheiro(u.tetoFaturamentoAnual)}
            </span>
          </div>
          <div style={{ height: 8, borderRadius: 'var(--radius-pill)', background: 'var(--bg-sunken)', overflow: 'hidden' }}>
            <div
              style={{
                width: `${Math.min(100, (proporcao ?? 0) * 100)}%`,
                height: '100%',
                background: (proporcao ?? 0) > 0.8 ? 'var(--color-pending)' : 'var(--color-royal)',
              }}
            />
          </div>
          <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>
            O teto é parâmetro da unidade, nunca constante no código — esse valor muda por lei.
          </span>
        </div>
      ) : null}
    </Cartao>
  );
}
