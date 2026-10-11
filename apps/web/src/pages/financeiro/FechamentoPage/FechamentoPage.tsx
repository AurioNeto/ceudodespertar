import { Icon, ScreenHeader, useDensidade } from '@/ds';
import { pluralizar } from '@/pages/utils/formato';
import { AcaoDeFechamento } from './components/AcaoDeFechamento';
import { FaixaDoPeriodo } from './components/FaixaDoPeriodo';
import { HistoricoDeFechamentos } from './components/HistoricoDeFechamentos';
import { ItemDoChecklist } from './components/ItemDoChecklist';
import { SaldosDoFechamento } from './components/SaldosDoFechamento';
import { rotuloLabel } from './constantes';
import { useFechamento } from './hooks/useFechamento';

export function FechamentoPage() {
  const densidade = useDensidade();
  const campo = densidade === 'field';
  const tela = useFechamento();

  return (
    <>
      <ScreenHeader
        code={campo ? 'F-07' : 'F-07 · Fechamento'}
        title="Fechamento"
        subtitle={campo ? undefined : 'Confere o que falta, registra o saldo e trava o período · CDD'}
        density={densidade}
      />

      <div
        style={{
          padding: campo ? '14px 16px 24px' : '18px 24px 30px',
          display: 'flex',
          flexDirection: 'column',
          gap: campo ? 12 : 18,
          maxWidth: campo ? undefined : 1000,
        }}
      >
        {tela.mensagem ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              background: 'var(--color-royal-soft)',
              border: '1px solid var(--color-royal-border)',
              borderRadius: 'var(--radius)',
              padding: '10px 14px',
            }}
          >
            <span style={{ font: 'var(--text-body)', color: 'var(--color-royal-deep)' }}>{tela.mensagem}</span>
            <button type="button" aria-label="fechar aviso" onClick={tela.fecharAviso} style={{ color: 'var(--color-royal-deep)' }}>
              <Icon name="x" size={16} />
            </button>
          </div>
        ) : null}

        <FaixaDoPeriodo
          fechado={tela.fechado}
          bloqueios={tela.bloqueios}
          entradas={tela.entradas}
          saidas={tela.saidas}
          resultado={tela.resultado}
          densidade={densidade}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
            <span style={rotuloLabel}>O que o fechamento exige</span>
            <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
              {tela.bloqueios.length === 0
                ? tela.avisos.length
                  ? `tudo resolvido · ${pluralizar(tela.avisos.length, 'aviso que não bloqueia', 'avisos que não bloqueiam')}`
                  : 'tudo resolvido'
                : `${pluralizar(tela.bloqueios.length, 'item bloqueia', 'itens bloqueiam')} o fechamento`}
            </span>
          </div>

          {tela.checklist.map((i) => (
            <ItemDoChecklist key={i.id} item={i} densidade={densidade} />
          ))}
        </div>

        <SaldosDoFechamento contasAtivas={tela.contasAtivas} totalSaldos={tela.totalSaldos} />

        <AcaoDeFechamento
          fechado={tela.fechado}
          bloqueios={tela.bloqueios}
          reabrindo={tela.reabrindo}
          motivo={tela.motivo}
          densidade={densidade}
          onFechar={tela.fechar}
          onAvisar={tela.avisar}
          onAbrirReabertura={tela.abrirReabertura}
          onMotivo={tela.setMotivo}
          onConfirmarReabertura={tela.confirmarReabertura}
          onCancelarReabertura={tela.cancelarReabertura}
        />

        <HistoricoDeFechamentos historico={tela.historico} />
      </div>
    </>
  );
}
