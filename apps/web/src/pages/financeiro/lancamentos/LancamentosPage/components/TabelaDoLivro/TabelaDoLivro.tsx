import type { LancamentoNaLista } from '@cdd/contracts';
import { rotuloLabel } from '../../constantes';
import { LinhaDoLivro } from './components/LinhaDoLivro';

export interface TabelaDoLivroProps {
  registros: readonly LancamentoNaLista[];
  selecionado: LancamentoNaLista | null;
  onAbrir: (registro: LancamentoNaLista) => void;
}

export function TabelaDoLivro({ registros, selecionado, onAbrir }: TabelaDoLivroProps) {
  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: 'var(--border-hairline)',
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '96px minmax(0,1fr) 150px 132px 116px 132px',
          background: 'var(--bg-sunken)',
          borderBottom: '1px solid var(--color-line-strong)',
        }}
      >
        {['Data', 'Lançamento', 'Quem lançou', 'Grupo', 'Tipo', 'Valor'].map((c, i) => (
          <span key={c} style={{ ...rotuloLabel, padding: '10px 13px', textAlign: i === 5 ? 'right' : 'left' }}>
            {c}
          </span>
        ))}
      </div>

      {registros.map((r) => (
        <LinhaDoLivro key={r.id} registro={r} selecionado={selecionado?.id === r.id} onAbrir={() => onAbrir(r)} />
      ))}
    </div>
  );
}
