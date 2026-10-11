import { useNavigate } from 'react-router-dom';
import { Button, Icon, StatusBadge, type BadgeTone, type Density, type IconName } from '@/ds';
import { ROTAS, type RotaId } from '@/app/navegacao';

export interface ItemDoChecklist {
  id: string;
  titulo: string;
  detalhe: string;
  /** Item que trava o fechamento; o resto é aviso que fica registrado. */
  bloqueia: boolean;
  ok: boolean;
  acao: { rotulo: string; rota: RotaId } | null;
}

export interface ItemDoChecklistProps {
  item: ItemDoChecklist;
  densidade: Density;
}

export function ItemDoChecklist({ item: i, densidade }: ItemDoChecklistProps) {
  const campo = densidade === 'field';
  const navigate = useNavigate();
  const estado = i.ok ? 'ok' : i.bloqueia ? 'bloqueia' : 'aviso';
  const cor =
    estado === 'ok'
      ? 'var(--color-confirmed)'
      : estado === 'bloqueia'
        ? 'var(--color-pending)'
        : 'var(--color-attention)';
  const icone: IconName =
    estado === 'ok' ? 'circle-check' : estado === 'bloqueia' ? 'circle-alert' : 'triangle-alert';
  const tone: BadgeTone = estado === 'ok' ? 'confirmed' : estado === 'bloqueia' ? 'pending' : 'suggest';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: campo ? 'column' : 'row',
        alignItems: campo ? 'flex-start' : 'center',
        gap: campo ? 5 : 12,
        padding: campo ? '11px 12px' : '12px 14px',
        border: 'var(--border-hairline)',
        borderLeft: `3px solid ${cor}`,
        borderRadius: 'var(--radius)',
        background: 'var(--bg-card)',
      }}
    >
      <Icon name={icone} size={18} color={cor} />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>{i.titulo}</span>
        <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{i.detalhe}</span>
      </div>
      <StatusBadge tone={tone}>
        {estado === 'ok' ? 'Resolvido' : estado === 'bloqueia' ? 'Bloqueia' : 'Só aviso'}
      </StatusBadge>
      {i.acao && !i.ok ? (
        <Button variant="ghost" onClick={() => navigate(ROTAS[i.acao!.rota])}>
          {i.acao.rotulo}
        </Button>
      ) : null}
    </div>
  );
}
