import { Button, StatusBadge } from '@/ds';
import type { ReservaDeTrabalho } from '../../mocks/ayahuasca';
import { litros } from '../../utils/litros';

export interface AbaDeReservasProps {
  reservas: readonly ReservaDeTrabalho[];
  reservado: Record<number, boolean>;
  onAlternar: (reserva: ReservaDeTrabalho) => void;
}

export function AbaDeReservas({ reservas, reservado, onAlternar }: AbaDeReservasProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <p style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
        Reservar separa do livre; a baixa no lote só acontece no dia do trabalho.
      </p>
      {reservas.map((r) => (
        <div
          key={r.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
            padding: '12px 14px',
            border: 'var(--border-hairline)',
            borderLeft: `3px solid ${reservado[r.id] ? 'var(--color-confirmed)' : 'var(--color-line-strong)'}`,
            borderRadius: 'var(--radius)',
            background: 'var(--bg-card)',
          }}
        >
          <span style={{ flex: '1 1 200px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>{r.nome}</span>
            <span style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>
              {r.dia}/{r.mes} · {litros(r.litros)} previstos
            </span>
          </span>
          <StatusBadge tone={reservado[r.id] ? 'confirmed' : 'pending'}>
            {reservado[r.id] ? 'Reservado' : 'Sem reserva'}
          </StatusBadge>
          <Button variant="quiet" onClick={() => onAlternar(r)}>
            {reservado[r.id] ? 'Liberar' : 'Reservar'}
          </Button>
        </div>
      ))}
    </div>
  );
}
