import type { LancamentoNaLista } from '@cdd/contracts';
import { formatarDiaMes, formatarDinheiro } from '@/pages/utils/formato';
import { rotuloDoTipo } from '@/pages/financeiro/lancamentos/utils/rotulosDoLancamento';
import { valorTabular } from '../../../../constantes';
import { corDoTipo } from '../../../../utils/corDoTipo';

export interface LinhaDoLivroProps {
  registro: LancamentoNaLista;
  selecionado: boolean;
  onAbrir: () => void;
}

export function LinhaDoLivro({ registro: r, selecionado, onAbrir }: LinhaDoLivroProps) {
  const estornado = r.status === 'ESTORNADO';
  return (
    <button
      type="button"
      onClick={onAbrir}
      style={{
        display: 'grid',
        gridTemplateColumns: '96px minmax(0,1fr) 150px 132px 116px 132px',
        alignItems: 'center',
        width: '100%',
        padding: '11px 13px',
        background: selecionado ? 'var(--bg-sunken)' : 'transparent',
        borderBottom: 'var(--border-hairline)',
        borderLeft: `3px solid ${
          r.status === 'A_CONFERIR' ? 'var(--color-pending)' : estornado ? 'var(--color-neutral)' : 'transparent'
        }`,
        cursor: 'pointer',
        textAlign: 'left',
        font: 'var(--text-small)',
      }}
    >
      <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--text-secondary)' }}>
        {formatarDiaMes(r.data)}
      </span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>
          {r.motivo}
        </span>
        <span style={{ display: 'block', font: 'var(--text-small)', color: 'var(--text-meta)' }}>
          {r.tipo === 'TRANSFERENCIA' ? `${r.conta} → ${r.contaDestino}` : `${r.contraparte ?? '—'} · ${r.conta}`}
        </span>
      </span>
      <span style={{ color: 'var(--text-secondary)' }}>{r.registradoPor}</span>
      <span style={{ color: 'var(--text-secondary)' }}>{r.grupo ?? '—'}</span>
      <span
        style={{
          justifySelf: 'start',
          font: 'var(--text-small)',
          padding: '3px 10px',
          borderRadius: 'var(--radius-pill)',
          border: `1px solid ${corDoTipo(r.tipo)}`,
          color: corDoTipo(r.tipo),
        }}
      >
        {rotuloDoTipo(r.tipo)}
      </span>
      <span
        style={{
          ...valorTabular,
          textAlign: 'right',
          color: estornado ? 'var(--text-meta)' : r.tipo === 'ENTRADA' ? 'var(--color-confirmed)' : 'var(--text-primary)',
          textDecoration: estornado ? 'line-through' : undefined,
        }}
      >
        {r.tipo === 'ENTRADA' ? '+ ' : r.tipo === 'SAIDA' ? '− ' : ''}
        {formatarDinheiro(r.valor)}
      </span>
    </button>
  );
}
