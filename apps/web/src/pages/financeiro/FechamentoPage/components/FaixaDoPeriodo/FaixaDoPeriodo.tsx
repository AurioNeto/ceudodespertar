import type { Density } from '@/ds';
import { formatarCompetencia, pluralizar } from '@/pages/utils/formato';
import { competenciaAtual } from '@/pages/mocks/relogio';
import { rotuloLabel } from '../../constantes';
import type { ItemDoChecklist } from '../ItemDoChecklist';
import { ColunaDeResumo } from './components/ColunaDeResumo';

export interface FaixaDoPeriodoProps {
  fechado: boolean;
  bloqueios: readonly ItemDoChecklist[];
  entradas: number;
  saidas: number;
  resultado: number;
  densidade: Density;
}

export function FaixaDoPeriodo({ fechado, bloqueios, entradas, saidas, resultado, densidade }: FaixaDoPeriodoProps) {
  const campo = densidade === 'field';
  const corDoStatus = fechado
    ? 'var(--color-confirmed)'
    : bloqueios.length
      ? 'var(--color-pending)'
      : 'var(--color-royal-deep)';

  return (
    <div
      style={{
        background: fechado ? 'var(--bg-card)' : 'var(--bg-brand)',
        border: `1px solid ${fechado ? 'var(--color-confirmed)' : 'var(--border-brand)'}`,
        borderRadius: 'var(--radius-lg)',
        padding: campo ? '14px 16px' : '18px 20px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: campo ? 14 : 22,
        alignItems: 'flex-end',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '1 1 260px' }}>
        <span style={rotuloLabel}>Competência {formatarCompetencia(competenciaAtual)} · CDD</span>
        <span style={{ font: 'var(--text-title-sm)', color: corDoStatus }}>
          {fechado
            ? 'Fechado'
            : bloqueios.length
              ? `Aberto, com ${pluralizar(bloqueios.length, 'pendência', 'pendências')}`
              : 'Pronto para fechar'}
        </span>
        <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
          {fechado
            ? 'Fechado por Aurio Neto em 01/09/2026, 09:20. Lançamentos com data de agosto ficam bloqueados.'
            : bloqueios.length
              ? 'Resolva as pendências abaixo para liberar o fechamento.'
              : 'Nada bloqueia o fechamento. Depois de fechado, correção só reabrindo o período.'}
        </span>
      </div>

      <ColunaDeResumo rotulo="Entradas" valor={entradas} cor="var(--color-confirmed)" />
      <ColunaDeResumo rotulo="Saídas" valor={saidas} cor="var(--color-attention)" divisor />
      <ColunaDeResumo rotulo="Resultado" valor={resultado} cor="var(--color-royal-deep)" divisor />
    </div>
  );
}
