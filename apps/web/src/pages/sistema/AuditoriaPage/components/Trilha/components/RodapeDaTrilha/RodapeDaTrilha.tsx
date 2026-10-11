import type { OperacaoAuditada } from '@cdd/contracts';
import { Cartao, Rotulo } from '@/ds';
import { EXIGE_REGISTRO_EXTRA, FEICAO } from '../../../../constantes';

export function RodapeDaTrilha() {
  const itens = Object.entries(EXIGE_REGISTRO_EXTRA) as [OperacaoAuditada, string][];
  return (
    <Cartao style={{ gap: 10 }}>
      <Rotulo>O que o domínio exige guardar além de autor e instante</Rotulo>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {itens.map(([op, exigencia]) => (
          <span key={op} style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
            <b style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{FEICAO[op].rotulo}</b> — {exigencia}
          </span>
        ))}
      </div>
      <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)', maxWidth: '78ch' }}>
        Sem o registro extra a operação não acontece: o motivo do estorno e o da reabertura são campo obrigatório do
        comando, não anotação posterior.
      </span>
    </Cartao>
  );
}
