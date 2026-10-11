import { Button, Select, TextField, type Density } from '@/ds';
import { CartaoDeFormulario } from '@/pages/financeiro/components/CartaoDeFormulario';
import { MENSAGEM_DE_DATA_VAZIA } from '@/pages/financeiro/constantes';
import { formatarBRL } from '@/pages/utils/formato';
import { contasPagadoras } from '../../../../mocks/faturas';

export interface FormularioDePagamentoProps {
  total: number;
  densidade: Density;
  conta: string;
  data: string;
  dataValida: boolean;
  onEscolherConta: (v: string) => void;
  onEscolherData: (v: string) => void;
  onConfirmar: () => void;
  onCancelar: () => void;
}

export function FormularioDePagamento({
  total,
  densidade,
  conta,
  data,
  dataValida,
  onEscolherConta,
  onEscolherData,
  onConfirmar,
  onCancelar,
}: FormularioDePagamentoProps) {
  const campo = densidade === 'field';

  return (
    <CartaoDeFormulario titulo="Registrar o pagamento" densidade={densidade}>
      <div style={{ display: 'grid', gridTemplateColumns: campo ? 'minmax(0,1fr)' : 'repeat(3, minmax(0,1fr))', gap: 14 }}>
        <Select
          label="Conta de saída"
          value={conta}
          options={contasPagadoras.map((c) => ({ value: c.id, label: c.nome }))}
          onChange={onEscolherConta}
        />
        <TextField
          label="Data do pagamento"
          type="date"
          value={data}
          error={dataValida ? undefined : MENSAGEM_DE_DATA_VAZIA}
          onChange={(e) => onEscolherData(e.target.value)}
        />
        <TextField
          label="Valor"
          value={formatarBRL(total)}
          readOnly
          hint="igual ao total da fatura, sem edição"
        />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        <Button iconName="check" onClick={onConfirmar} disabled={!dataValida}>
          Confirmar pagamento
        </Button>
        <Button variant="quiet" onClick={onCancelar}>
          Cancelar
        </Button>
        <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', maxWidth: '46ch' }}>
          Isto grava uma transferência, não um lançamento de despesa.
        </span>
      </div>
    </CartaoDeFormulario>
  );
}
