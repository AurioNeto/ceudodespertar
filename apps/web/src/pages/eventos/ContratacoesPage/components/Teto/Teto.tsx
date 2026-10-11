import { Cartao, Rotulo, type Density } from '@/ds';
import { formatarBRL } from '@/pages/utils/formato';
import { munay } from '../../mocks/contratacoes';
import { tetoDoMei } from '../../utils/tetoDoMei';

export interface TetoProps {
  aReceber: number;
  densidade: Density;
}

export function Teto({ aReceber, densidade }: TetoProps) {
  const campo = densidade === 'field';
  const { atual, projetado } = tetoDoMei(munay, aReceber);

  return (
    <Cartao campo={campo} style={{ gap: 10 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 12px', alignItems: 'baseline' }}>
        <Rotulo>Faturamento contra o teto do MEI</Rotulo>
        <span data-numeric style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>
          CNPJ {munay.documento}
        </span>
        <span style={{ flex: 1 }} />
        <span data-numeric style={{ font: 'var(--text-amount)', color: 'var(--text-primary)' }}>
          {formatarBRL(munay.faturamentoNoAno + aReceber)} de {formatarBRL(munay.tetoAnual)}
        </span>
      </div>

      <div
        role="img"
        aria-label={`${Math.round(projetado * 100)}% do teto com o que está a receber`}
        style={{ height: 10, borderRadius: 'var(--radius-pill)', background: 'var(--bg-sunken)', overflow: 'hidden', display: 'flex' }}
      >
        <div style={{ width: `${Math.min(100, atual * 100)}%`, background: 'var(--color-royal)' }} />
        <div
          style={{
            width: `${Math.min(100 - atual * 100, (projetado - atual) * 100)}%`,
            background: 'var(--color-suggest)',
            opacity: 0.7,
          }}
        />
      </div>

      <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', maxWidth: '78ch' }}>
        Em cheio o que já entrou; em violeta o que está combinado e ainda não. Estourar o teto não é multa, é mudança
        de regime — e a hora de descobrir isso é antes de fechar a próxima contratação, não na declaração.
      </span>
    </Cartao>
  );
}
