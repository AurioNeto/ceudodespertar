import type { LancamentoNaLista } from '@cdd/contracts';
import { Receipt } from '@/ds';
import type { Density } from '@/ds';
import { formatarData } from '@/pages/utils/formato';
import { linhasDoRecibo, rodapeDoRecibo, tomDoRecibo } from '@/pages/financeiro/lancamentos/utils/recibo';
import { GAP_CARTAO, LARGURA_CARTAO } from '../../constantes';
import { BotaoLargo } from './components/BotaoLargo';
import { PontosDoCarrossel } from './components/PontosDoCarrossel';
import { SetaRedonda } from './components/SetaRedonda';

export interface CarrosselDeRecibosProps {
  registros: readonly LancamentoNaLista[];
  indice: number;
  densidade: Density;
  onIrPara: (indice: number) => void;
}

export function CarrosselDeRecibos({ registros, indice, densidade, onIrPara }: CarrosselDeRecibosProps) {
  const campo = densidade === 'field';
  const largura = LARGURA_CARTAO[densidade];
  const gap = GAP_CARTAO[densidade];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: campo ? 12 : 14, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {campo ? null : <SetaRedonda rotulo="anterior" onClick={() => onIrPara(indice - 1)} />}
        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', padding: '4px 0' }}>
          <div
            style={{
              display: 'flex',
              gap,
              alignItems: 'flex-start',
              transform: `translateX(${-indice * (largura + gap)}px)`,
              transition: 'transform var(--motion) ',
            }}
          >
            {registros.map((r) => (
              <Receipt
                key={r.id}
                title={`Registrado em ${formatarData(r.data)} às ${r.hora}`}
                amount={r.valor / 100}
                tone={tomDoRecibo(r.tipo)}
                lines={linhasDoRecibo(r)}
                footnote={campo ? undefined : rodapeDoRecibo(r)}
                style={{ flex: `0 0 ${largura}px` }}
              />
            ))}
          </div>
        </div>
        {campo ? null : <SetaRedonda rotulo="próximo" onClick={() => onIrPara(indice + 1)} />}
      </div>

      {campo ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <BotaoLargo rotulo="‹ Anterior" onClick={() => onIrPara(indice - 1)} />
          <BotaoLargo rotulo="Próximo ›" onClick={() => onIrPara(indice + 1)} />
        </div>
      ) : (
        <PontosDoCarrossel registros={registros} indice={indice} onIrPara={onIrPara} />
      )}

      <div style={{ textAlign: 'center', font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
        {indice + 1} de {registros.length}
      </div>
    </div>
  );
}
