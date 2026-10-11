import type { Density } from '@/ds';
import { formatarDinheiro } from '@/pages/utils/formato';
import { rotuloLabel, valorGrande, valorMedio } from '../../constantes';
import type { Reserva } from '../../tipos';
import { ColunaDoFundo } from './components/ColunaDoFundo';

export interface FundoProprioProps {
  fundoProprio: number;
  comprometido: number;
  livre: number;
  reservas: readonly Reserva[];
  densidade: Density;
}

export function FundoProprio({ fundoProprio, comprometido, livre, reservas, densidade }: FundoProprioProps) {
  const campo = densidade === 'field';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
        {campo ? null : <span style={rotuloLabel}>Fundo próprio</span>}
        <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
          reservado dentro do saldo, não é uma conta separada
        </span>
      </div>

      <div
        style={{
          background: 'var(--bg-card)',
          border: 'var(--border-hairline)',
          borderRadius: 'var(--radius-lg)',
          padding: '18px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={rotuloLabel}>Total do fundo</span>
            <span style={{ ...valorGrande, color: 'var(--color-royal-deep)' }}>{formatarDinheiro(fundoProprio)}</span>
          </div>
          <ColunaDoFundo rotulo="Já com destino" valor={comprometido} cor="var(--text-primary)" />
          <ColunaDoFundo rotulo="Livre" valor={livre} cor="var(--color-confirmed)" />
        </div>

        <div
          style={{
            display: 'flex',
            height: 12,
            borderRadius: 'var(--radius-pill)',
            overflow: 'hidden',
            background: 'var(--bg-sunken)',
          }}
        >
          {reservas.map((r) => (
            <div
              key={r.chave}
              title={r.nome}
              style={{ width: `${Math.max(0, (r.valor / fundoProprio) * 100)}%`, background: r.cor }}
            />
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {reservas.map((r) => (
            <div key={r.chave} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 'var(--radius-pill)',
                  flex: '0 0 auto',
                  background: r.cor,
                }}
              />
              <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>{r.nome}</span>
                <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{r.nota}</span>
              </span>
              <span style={{ ...valorMedio, color: 'var(--text-primary)', textAlign: 'right' }}>
                {formatarDinheiro(r.valor)}
              </span>
              <span style={{ width: 56, textAlign: 'right', font: 'var(--text-small)', color: 'var(--text-meta)' }}>
                {Math.round((r.valor / fundoProprio) * 100)}%
              </span>
            </div>
          ))}
        </div>

        <p
          style={{
            font: 'var(--text-small)',
            color: 'var(--text-secondary)',
            borderTop: 'var(--border-hairline)',
            paddingTop: 12,
          }}
        >
          O fundo não é uma conta: é uma parte do saldo que já tem destino combinado. Gastar de uma reserva não muda o
          saldo das contas, muda o que ainda está livre.
        </p>
      </div>
    </div>
  );
}
