import { Aviso, CorpoDaTela, Rotulo, ScreenHeader, useDensidade } from '@/ds';
import { pluralizar } from '@/pages/utils/formato';
import { AcaoDeFechamento } from './components/AcaoDeFechamento';
import { FaixaDoPeriodo } from './components/FaixaDoPeriodo';
import { HistoricoDeFechamentos } from './components/HistoricoDeFechamentos';
import { ItemDoChecklist } from './components/ItemDoChecklist';
import { SaldosDoFechamento } from './components/SaldosDoFechamento';
import { useFechamento } from './hooks/useFechamento';

export function FechamentoPage() {
  const densidade = useDensidade();
  const campo = densidade === 'field';
  const tela = useFechamento();

  return (
    <>
      <ScreenHeader
        title="Fechamento"
        subtitle={campo ? undefined : 'Confere o que falta, registra o saldo e trava o período · CDD'}
        density={densidade}
      />

      <CorpoDaTela densidade={densidade} larguraMaxima={1000}>
        {tela.mensagem ? (
          <Aviso tom="informacao" aoFechar={tela.fecharAviso} rotuloDeFechar="fechar aviso">
            {tela.mensagem}
          </Aviso>
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
            <Rotulo>O que o fechamento exige</Rotulo>
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
          densidade={densidade}
          onFechar={tela.fechar}
          onAvisar={tela.avisar}
          onAbrirReabertura={tela.abrirReabertura}
          onConfirmarReabertura={tela.confirmarReabertura}
          onCancelarReabertura={tela.cancelarReabertura}
        />

        <HistoricoDeFechamentos historico={tela.historico} />
      </CorpoDaTela>
    </>
  );
}
