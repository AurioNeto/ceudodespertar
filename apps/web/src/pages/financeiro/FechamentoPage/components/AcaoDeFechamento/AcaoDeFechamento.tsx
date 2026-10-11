import { Button, type Density } from '@/ds';
import { competenciaPorExtenso, pluralizar } from '@/pages/utils/formato';
import { competenciaAtual } from '@/pages/mocks/relogio';
import type { ItemDoChecklist } from '../ItemDoChecklist';

export interface AcaoDeFechamentoProps {
  fechado: boolean;
  bloqueios: readonly ItemDoChecklist[];
  reabrindo: boolean;
  motivo: string;
  densidade: Density;
  onFechar: () => void;
  onAvisar: (mensagem: string) => void;
  onAbrirReabertura: () => void;
  onMotivo: (v: string) => void;
  onConfirmarReabertura: () => void;
  onCancelarReabertura: () => void;
}

export function AcaoDeFechamento({
  fechado,
  bloqueios,
  reabrindo,
  motivo,
  densidade,
  onFechar,
  onAvisar,
  onAbrirReabertura,
  onMotivo,
  onConfirmarReabertura,
  onCancelarReabertura,
}: AcaoDeFechamentoProps) {
  const campo = densidade === 'field';

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: 'var(--border-hairline)',
        borderRadius: 'var(--radius-lg)',
        padding: '16px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>
        {fechado ? 'Período fechado' : bloqueios.length ? 'Fechamento bloqueado' : 'Tudo pronto'}
      </span>
      <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
        {fechado
          ? 'A ata guarda os saldos, o resultado e quem assinou o fechamento.'
          : bloqueios.length
            ? bloqueios.map((b) => b.titulo).join(' · ')
            : 'Ao fechar, os saldos acima viram o registro oficial de agosto.'}
      </span>

      {fechado ? (
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
      ) : (
        <Button
          density={densidade}
          fullWidth={campo}
          iconName="lock"
          disabled={bloqueios.length > 0}
          blockedReason={
            bloqueios.length
              ? `Resolva ${pluralizar(bloqueios.length, 'pendência', 'pendências')} antes de fechar.`
              : undefined
          }
          onClick={onFechar}
          style={{ alignSelf: campo ? 'stretch' : 'flex-start' }}
        >
          Fechar {competenciaPorExtenso(competenciaAtual)}
        </Button>
      )}

      {reabrindo ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            background: 'var(--color-pending-soft)',
            border: '1px solid var(--color-pending-border)',
            borderRadius: 'var(--radius)',
            padding: '12px 14px',
          }}
        >
          <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>
            Por que este período precisa ser reaberto?
          </span>
          <textarea
            value={motivo}
            onChange={(e) => onMotivo(e.target.value)}
            rows={3}
            aria-label="Motivo da reabertura"
            placeholder="o motivo fica no histórico do período, de forma permanente"
            style={{
              border: '1px solid var(--color-line-strong)',
              background: 'var(--bg-card)',
              borderRadius: 'var(--radius-sm)',
              padding: '8px 12px',
              font: 'var(--text-body)',
              color: 'var(--text-primary)',
              outline: 'none',
              resize: 'vertical',
            }}
          />
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <Button
              iconName="lock-open"
              disabled={!motivo.trim()}
              blockedReason={!motivo.trim() ? 'Sem motivo, a reabertura não é registrável.' : undefined}
              onClick={onConfirmarReabertura}
            >
              Reabrir
            </Button>
            <Button variant="quiet" onClick={onCancelarReabertura}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
