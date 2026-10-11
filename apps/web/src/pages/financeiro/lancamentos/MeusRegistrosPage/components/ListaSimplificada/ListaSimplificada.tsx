import type { LancamentoNaLista } from '@cdd/contracts';
import { RecordRow } from '@/ds';
import type { Density } from '@/ds';
import { Paginacao } from '@/pages/financeiro/lancamentos/components/Paginacao';
import { estadoDaLinha, naturezaDoTipo } from '@/pages/financeiro/lancamentos/utils/recibo';
import { rotuloDoTipo } from '@/pages/financeiro/lancamentos/utils/rotulosDoLancamento';
import { POR_PAGINA } from '../../constantes';

export interface ListaSimplificadaProps {
  registros: readonly LancamentoNaLista[];
  pagina: number;
  totalPaginas: number;
  densidade: Density;
  onAbrir: (indice: number) => void;
  onAnterior: () => void;
  onProxima: () => void;
}

export function ListaSimplificada({
  registros,
  pagina,
  totalPaginas,
  densidade,
  onAbrir,
  onAnterior,
  onProxima,
}: ListaSimplificadaProps) {
  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {registros.map((r, iRel) => (
          <RecordRow
            key={r.id}
            description={r.motivo}
            amount={r.valor / 100}
            nature={naturezaDoTipo(r.tipo)}
            meta={rotuloDoTipo(r.tipo)}
            status={estadoDaLinha(r.status)}
            density={densidade}
            onClick={() => onAbrir(pagina * POR_PAGINA + iRel)}
          />
        ))}
      </div>
      <Paginacao
        pagina={pagina}
        totalPaginas={totalPaginas}
        texto={`Página ${pagina + 1} de ${totalPaginas}`}
        onAnterior={onAnterior}
        onProxima={onProxima}
        densidade={densidade}
      />
    </>
  );
}
