import { Button, ConfirmAction, PeriodLock, type Density } from '@/ds';
import { competenciaPorExtenso, pluralizar } from '@/pages/utils/formato';
import { competenciaAtual } from '@/pages/mocks/relogio';
import type { ItemDoChecklist } from '../ItemDoChecklist';

export interface AcaoDeFechamentoProps {
  fechado: boolean;
  bloqueios: readonly ItemDoChecklist[];
  reabrindo: boolean;
  densidade: Density;
  onFechar: () => void;
  onAvisar: (mensagem: string) => void;
  onAbrirReabertura: () => void;
  onConfirmarReabertura: (motivo: string) => void;
  onCancelarReabertura: () => void;
}

export function AcaoDeFechamento({
  fechado,
  bloqueios,
  reabrindo,
  densidade,
  onFechar,
  onAvisar,
  onAbrirReabertura,
  onConfirmarReabertura,
  onCancelarReabertura,
}: AcaoDeFechamentoProps) {
  const quantasBloqueiam = `${pluralizar(bloqueios.length, 'item bloqueia', 'itens bloqueiam')} o fechamento`;

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: 'var(--border-hairline)',
        borderRadius: 'var(--leaf-lg)',
        padding: '16px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>
        {fechado ? 'Período fechado' : bloqueios.length ? 'Fechamento bloqueado' : 'Tudo pronto'}
      </span>

      {fechado ? (
        <>
          <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
            A ata guarda os saldos, o resultado e quem assinou o fechamento.
          </span>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <Button
              variant="ghost"
              iconName="file-down"
              onClick={() => onAvisar('Ata de fechamento de agosto de 2026 gerada em PDF.')}
            >
              Ata em PDF
            </Button>
            <Button variant="quiet" iconName="lock-open" onClick={onAbrirReabertura}>
              Reabrir período
            </Button>
          </div>
          <div hidden={!reabrindo}>
            <PeriodLock
              canReopen
              title="Por que este período precisa ser reaberto?"
              reason="o motivo fica no histórico do período, de forma permanente"
              reopenLabel="Reabrir"
              reopenReasonLabel="Motivo da reabertura"
              reopenReasonRequiredNote="Sem motivo, a reabertura não é registrável."
              onReopen={onConfirmarReabertura}
            />
            <div style={{ marginTop: 10 }}>
              <Button variant="quiet" onClick={onCancelarReabertura}>
                Cancelar
              </Button>
            </div>
          </div>
        </>
      ) : (
        <ConfirmAction
          label={`Fechar ${competenciaPorExtenso(competenciaAtual)}`}
          irreversibleNote="Ao fechar, os saldos acima viram o registro oficial de agosto."
          blockedBy={bloqueios.map((b) => b.titulo)}
          blockedGuidance={`Resolva ${pluralizar(bloqueios.length, 'pendência', 'pendências')} antes de fechar.`}
          blockedHeadingForOneRule={`${quantasBloqueiam}:`}
          blockedHeadingForManyRules={quantasBloqueiam}
          density={densidade}
          onConfirm={onFechar}
        />
      )}
    </div>
  );
}
