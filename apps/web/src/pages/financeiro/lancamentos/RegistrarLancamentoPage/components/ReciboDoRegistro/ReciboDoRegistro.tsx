import { Button, Receipt, type Density } from '@/ds';
import { TOM_DO_RECIBO } from '../../constantes';
import type { Recibo } from '../../hooks/useFormularioDeLancamento';

export interface ReciboDoRegistroProps {
  recibo: Recibo;
  consolida: boolean;
  densidade: Density;
  onDesfazer: () => void;
}

export function ReciboDoRegistro({ recibo, consolida, densidade, onDesfazer }: ReciboDoRegistroProps) {
  const campo = densidade === 'field';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Receipt
        title={`Registrado às ${recibo.horario}`}
        amount={recibo.total}
        tone={TOM_DO_RECIBO[recibo.tipo]}
        lines={recibo.linhas}
        footnote={
          campo
            ? 'Campos limpos, pronto para o próximo. Desfazer nos próximos 2 minutos.'
            : consolida
              ? 'Gravado consolidado, com seu nome no histórico. Desfazer só nos próximos 2 minutos; depois disso, estorno.'
              : 'Gravado como a conferir, com seu nome no histórico. A tesouraria confere antes de consolidar.'
        }
      />
      {campo ? null : (
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="quiet" iconName="rotate-ccw" onClick={onDesfazer}>
            Desfazer
          </Button>
          <Button variant="ghost" iconName="receipt-text">
            Ver lançamento
          </Button>
        </div>
      )}
    </div>
  );
}
