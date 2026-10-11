import type { LancamentoNaLista } from '@cdd/contracts';
import { Button, PainelDeAcao, Receipt, StatusBadge, varianteDoPainel, type Density } from '@/ds';
import { formatarData } from '@/pages/utils/formato';
import { linhasDoRecibo, rodapeDoRecibo, tomDoRecibo } from '@/pages/financeiro/lancamentos/utils/recibo';
import { rotuloDaSituacao } from '@/pages/financeiro/lancamentos/utils/rotulosDoLancamento';
import { HistoricoDoLancamento } from './components/HistoricoDoLancamento';
import { historicoDoLancamento } from './utils/historicoDoLancamento';

export interface GavetaDeDetalheProps {
  registro: LancamentoNaLista;
  densidade: Density;
  onFechar: () => void;
}

export function GavetaDeDetalhe({ registro, densidade, onFechar }: GavetaDeDetalheProps) {
  const estornado = registro.status === 'ESTORNADO';
  const historico = historicoDoLancamento(registro);

  return (
    <PainelDeAcao aberto titulo="Detalhe do lançamento" variante={varianteDoPainel(densidade)} aoFechar={onFechar}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <StatusBadge tone={registro.status === 'A_CONFERIR' ? 'pending' : estornado ? 'neutral' : 'confirmed'}>
            {rotuloDaSituacao(registro.status)}
          </StatusBadge>
        </div>

        <Receipt
          title={`Registrado em ${formatarData(registro.data)} às ${registro.hora}`}
          amount={registro.valor / 100}
          tone={tomDoRecibo(registro.tipo)}
          lines={linhasDoRecibo(registro, { mostrarQuemLancou: true })}
          footnote={rodapeDoRecibo(registro)}
        />

        <HistoricoDoLancamento historico={historico} />

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <Button variant="ghost" iconName="paperclip" disabled={!registro.comprovante}>
            Ver comprovante
          </Button>
          <Button
            variant="quiet"
            iconName="undo-2"
            disabled={estornado}
            blockedReason={estornado ? 'Este lançamento já foi estornado.' : undefined}
          >
            Estornar
          </Button>
        </div>
      </div>
    </PainelDeAcao>
  );
}
