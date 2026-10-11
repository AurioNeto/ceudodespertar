import { Icon, Rotulo, StatusBadge } from '@/ds';
import type { PrestacaoGerada } from '../../mocks/prestacao';

export interface HistoricoDePrestacoesProps {
  historico: readonly PrestacaoGerada[];
}

export function HistoricoDePrestacoes({ historico }: HistoricoDePrestacoesProps) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      <Rotulo>Prestações já geradas</Rotulo>
      {historico.map((h) => (
        <div
          key={h.id}
          style={{
            background: 'var(--bg-card)',
            border: 'var(--border-hairline)',
            borderRadius: 'var(--radius)',
            padding: '12px 15px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            alignItems: 'center',
          }}
        >
          <Icon name="file-down" size={17} color="var(--text-meta)" />
          <span style={{ flex: 1, minWidth: 200, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
              <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>
                {h.periodoRotulo} · {h.unidade}
              </span>
              <StatusBadge tone={h.nivel === 'RESUMO' ? 'confirmed' : 'pending'}>
                {h.nivel === 'RESUMO' ? 'Resumo' : 'Detalhado'}
              </StatusBadge>
            </span>
            <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
              {h.formato} · {h.geradaPor} · {h.geradaEm}
            </span>
          </span>
          <code style={{ font: 'var(--text-code)' }}>{h.hash}</code>
        </div>
      ))}
    </section>
  );
}
