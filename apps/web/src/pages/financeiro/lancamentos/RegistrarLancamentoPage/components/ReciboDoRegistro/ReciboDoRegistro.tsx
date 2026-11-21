import { Button, Receipt, type Density } from '@/ds';
import { TOM_DO_RECIBO } from '../../constantes';
import type { Recibo } from '../../hooks/useFormularioDeLancamento';

export interface ReciboDoRegistroProps {
  recibo: Recibo;
  consolida: boolean;
  densidade: Density;
}

export function ReciboDoRegistro({ recibo, consolida, densidade }: ReciboDoRegistroProps) {
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
            ? 'Campos limpos, pronto para o próximo.'
            : consolida
              ? 'Gravado consolidado, com seu nome no histórico.'
              : 'Gravado como a conferir, com seu nome no histórico. A tesouraria confere antes de consolidar.'
        }
      />
      {campo ? null : (
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="ghost" iconName="receipt-text">
            Ver lançamento
          </Button>
        </div>
      )}
    </div>
  );
}
