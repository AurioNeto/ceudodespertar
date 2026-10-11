import type { LancamentoNaLista } from '@cdd/contracts';
import type { Density } from '@/ds';
import { formatarDinheiro } from '@/pages/utils/formato';
import { rotuloLabel } from '../../constantes';
import { totaisDoPeriodo } from '../../utils/totaisDoPeriodo';
import { Total } from './components/Total';

export interface ResumoDoPeriodoProps {
  lista: readonly LancamentoNaLista[];
  densidade: Density;
}

export function ResumoDoPeriodo({ lista, densidade }: ResumoDoPeriodoProps) {
  const campo = densidade === 'field';
  const { entradas, saidas, aConferir } = totaisDoPeriodo(lista);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: campo ? 'repeat(3,minmax(0,1fr))' : 'repeat(auto-fit,minmax(160px,1fr))',
        gap: campo ? 10 : 14,
        background: 'var(--bg-sunken)',
        border: 'var(--border-hairline)',
        borderRadius: 'var(--radius)',
        padding: campo ? '10px 12px' : '14px 18px',
      }}
    >
      <Total rotulo="Entradas" valor={formatarDinheiro(entradas)} cor="var(--color-confirmed)" />
      <Total rotulo="Saídas" valor={formatarDinheiro(saidas)} cor="var(--color-attention)" />
      <Total
        rotulo={campo ? 'Saldo' : 'Saldo do período'}
        valor={formatarDinheiro(entradas - saidas)}
        cor="var(--text-primary)"
      />
      {campo ? null : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={rotuloLabel}>A conferir</span>
          <span style={{ font: 'var(--text-body-strong)', color: 'var(--color-pending)' }}>
            {aConferir} de {lista.length}
          </span>
        </div>
      )}
    </div>
  );
}
