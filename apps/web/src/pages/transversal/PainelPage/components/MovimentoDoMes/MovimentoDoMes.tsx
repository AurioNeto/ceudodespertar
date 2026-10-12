import { AmountDisplay, Icon, rotuloVersalete } from '@/ds';
import { competenciaAnterior, movimentoDoMes } from '../../mocks/resumoFinanceiro';
import { competenciaAtual } from '@/pages/mocks/relogio';
import { competenciaPorExtenso, formatarBRL, formatarCompetencia } from '@/pages/utils/formato';
import { numeroGrande } from '../../constantes';
import { ColunaDeMovimento } from './components/ColunaDeMovimento';

export function MovimentoDoMes() {
  return (
    <div
      style={{
        flex: '3 1 480px',
        minWidth: 0,
        background: 'var(--bg-card)',
        border: 'var(--border-hairline)',
        borderRadius: 'var(--radius-lg)',
        padding: '18px 22px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <Icon name="chart-no-axes-column" size={18} color="var(--color-royal)" />
        <div style={rotuloVersalete}>Movimento de {formatarCompetencia(competenciaAtual)}</div>
        <span style={{ marginLeft: 'auto', font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
          comparado com {formatarCompetencia(competenciaAnterior)}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 18 }}>
        <ColunaDeMovimento
          icone="arrow-down-left"
          cor="var(--color-confirmed)"
          rotulo="entradas"
          valor={movimentoDoMes.entradas}
          anterior={movimentoDoMes.entradasAnterior}
          comparacaoBoaQuandoSobe
        />
        <ColunaDeMovimento
          icone="arrow-up-right"
          cor="var(--color-attention)"
          rotulo="saídas"
          valor={movimentoDoMes.saidas}
          anterior={movimentoDoMes.saidasAnterior}
          divisor
        />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            paddingLeft: 18,
            borderLeft: 'var(--border-hairline)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <Icon name="scale" size={16} color="var(--color-royal)" />
            <span style={{ font: 'var(--text-body)', color: 'var(--text-secondary)' }}>resultado</span>
          </div>
          <div style={{ ...numeroGrande, color: 'var(--color-royal-deep)' }}>
            + <AmountDisplay value={movimentoDoMes.resultado / 100} size="lg" style={{ color: 'inherit' }} />
          </div>
          <div style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
            + {formatarBRL(movimentoDoMes.resultadoAnterior)} no mês anterior — o mês fecha melhor se nada
            grande entrar até o fim de {competenciaPorExtenso(competenciaAtual).split(' ')[0]}
          </div>
        </div>
      </div>
    </div>
  );
}
