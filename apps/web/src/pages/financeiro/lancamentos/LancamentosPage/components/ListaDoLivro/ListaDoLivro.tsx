import type { LancamentoNaLista } from '@cdd/contracts';
import { RecordRow } from '@/ds';
import { formatarDiaMes } from '@/pages/utils/formato';
import { estadoDaLinha, naturezaDoTipo } from '@/pages/financeiro/lancamentos/utils/recibo';
import { rotuloDoTipo } from '@/pages/financeiro/lancamentos/utils/rotulosDoLancamento';

export interface ListaDoLivroProps {
  registros: readonly LancamentoNaLista[];
  onAbrir: (registro: LancamentoNaLista) => void;
}

export function ListaDoLivro({ registros, onAbrir }: ListaDoLivroProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {registros.map((r) => (
        <RecordRow
          key={r.id}
          description={r.motivo}
          amount={r.valor / 100}
          nature={naturezaDoTipo(r.tipo)}
          meta={`${formatarDiaMes(r.data)} · ${rotuloDoTipo(r.tipo)} · ${r.registradoPor}`}
          status={estadoDaLinha(r.status)}
          onClick={() => onAbrir(r)}
        />
      ))}
    </div>
  );
}
