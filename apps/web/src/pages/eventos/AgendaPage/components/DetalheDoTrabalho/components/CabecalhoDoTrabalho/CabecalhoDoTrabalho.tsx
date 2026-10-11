import { Button, StatusBadge } from '@/ds';
import { CartazSlot } from '@/pages/components/CartazSlot';
import { CORES_POR_TIPO } from '../../../../constantes';
import type { Trabalho } from '../../../../tipos';
import { Meta } from './components/Meta';

export interface CabecalhoDoTrabalhoProps {
  trabalho: Trabalho;
  onEditar: () => void;
  onDuplicar: () => void;
  onCancelar: () => void;
}

export function CabecalhoDoTrabalho({ trabalho: ev, onEditar, onDuplicar, onCancelar }: CabecalhoDoTrabalhoProps) {
  const cancelada = ev.situacao === 'cancelada';

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'flex-start' }}>
      <CartazSlot largura={132} altura={178} />

      <div style={{ flex: '1 1 380px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span
            style={{
              font: '600 12px var(--font-body)',
              color: '#fff',
              background: CORES_POR_TIPO[ev.tipo],
              borderRadius: 'var(--radius-pill)',
              padding: '4px 11px',
            }}
          >
            {ev.tipo}
          </span>
          <StatusBadge
            tone={
              ev.situacao === 'realizada'
                ? 'confirmed'
                : ev.situacao === 'cancelada'
                  ? 'neutral'
                  : ev.situacao === 'confirmada'
                    ? 'royal'
                    : 'pending'
            }
          >
            {ev.situacao[0]?.toUpperCase()}
            {ev.situacao.slice(1)}
          </StatusBadge>
        </div>

        <h2
          style={{
            font: 'var(--text-display)',
            letterSpacing: 'var(--tracking-display)',
            color: 'var(--text-title)',
            textDecoration: cancelada ? 'line-through' : 'none',
          }}
        >
          {String(ev.dia).padStart(2, '0')}/{String(ev.mes).padStart(2, '0')} · {ev.nome}
        </h2>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
          <Meta icone="calendar-days">{ev.horario}</Meta>
          <Meta icone="landmark">{ev.local}</Meta>
          <Meta icone="user-round">{ev.dirigente}</Meta>
          {ev.litros > 0 ? <Meta icone="flask-conical">{ev.litros} L previstos</Meta> : null}
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <Button variant="ghost" iconName="pencil" onClick={onEditar}>
            Editar
          </Button>
          <Button variant="quiet" iconName="copy" onClick={onDuplicar}>
            Duplicar
          </Button>
          <Button
            variant="quiet"
            iconName="circle-x"
            disabled={cancelada}
            blockedReason={cancelada ? 'Esta cerimônia já está cancelada.' : undefined}
            onClick={onCancelar}
          >
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}
