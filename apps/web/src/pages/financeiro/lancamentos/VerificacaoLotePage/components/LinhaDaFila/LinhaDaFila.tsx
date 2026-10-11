import type { ItemNaFila } from '@cdd/contracts';
import { Button, Icon, StatusBadge, type IconName } from '@/ds';
import type { Density } from '@/ds';
import { formatarData, formatarDinheiro } from '@/pages/utils/formato';
import { CONFIANCA, ORIGENS } from '../../constantes';

export interface LinhaDaFilaProps {
  item: ItemNaFila;
  densidade: Density;
  selecionado: boolean;
  onSelecionar: () => void;
  onAbrir: () => void;
}

export function LinhaDaFila({ item, densidade, selecionado, onSelecionar, onAbrir }: LinhaDaFilaProps) {
  const campo = densidade === 'field';
  const origem = ORIGENS[item.origem];
  const confianca = CONFIANCA[item.confianca];
  const meta = [
    formatarData(item.data),
    origem.label,
    item.remetente ?? 'importado',
    item.tipo === 'TRANSFERENCIA' ? `${item.conta} → ${item.contaDestino}` : (item.categoria ?? 'sem categoria'),
  ].join(' · ');

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexWrap: campo ? 'wrap' : 'nowrap',
        background: selecionado ? 'var(--color-royal-soft)' : 'var(--bg-card)',
        border: `1px solid ${selecionado ? 'var(--color-royal-border)' : 'var(--color-line)'}`,
        borderRadius: 'var(--radius)',
        padding: '11px 14px',
      }}
    >
      <input
        type="checkbox"
        checked={selecionado}
        onChange={onSelecionar}
        aria-label={`selecionar ${item.motivo}`}
        style={{ width: 17, height: 17, cursor: 'pointer', flex: '0 0 auto' }}
      />
      <Icon name={origem.icone as IconName} size={18} color="var(--color-royal)" />
      <button
        type="button"
        onClick={onAbrir}
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          textAlign: 'left',
          cursor: 'pointer',
        }}
      >
        <span
          style={{
            font: 'var(--text-body-strong)',
            color: 'var(--text-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {item.motivo}
        </span>
        <span
          style={{
            font: 'var(--text-small)',
            color: 'var(--text-meta)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {meta}
        </span>
      </button>
      <StatusBadge tone={confianca.tone}>{confianca.texto}</StatusBadge>
      <span
        style={{
          font: 'var(--text-amount)',
          letterSpacing: 'var(--tracking-amount)',
          fontVariantNumeric: 'tabular-nums',
          color: item.tipo === 'ENTRADA' ? 'var(--color-confirmed)' : 'var(--text-primary)',
          whiteSpace: 'nowrap',
        }}
      >
        {item.tipo === 'ENTRADA' ? '+ ' : item.tipo === 'SAIDA' ? '− ' : ''}
        {formatarDinheiro(item.valor)}
      </span>
      <Button variant="ghost" onClick={onAbrir}>
        Revisar
      </Button>
    </div>
  );
}
