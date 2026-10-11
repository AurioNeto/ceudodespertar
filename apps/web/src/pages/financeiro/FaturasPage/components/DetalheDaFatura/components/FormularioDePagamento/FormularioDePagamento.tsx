import { Button, Select, TextField, type Density } from '@/ds';
import { formatarDinheiro } from '@/pages/utils/formato';
import { contasPagadoras } from '../../../../mocks/faturas';

export interface FormularioDePagamentoProps {
  total: number;
  densidade: Density;
  conta: string;
  data: string;
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
  onEscolherConta,
  onEscolherData,
  onConfirmar,
  onCancelar,
}: FormularioDePagamentoProps) {
  const campo = densidade === 'field';

  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--color-royal-border)',
        borderLeft: 'var(--edge-state) solid var(--color-royal)',
        borderRadius: 'var(--radius)',
        padding: campo ? '15px 16px' : '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 15,
      }}
    >
      <span style={{ font: 'var(--text-title-sm)', color: 'var(--text-title)' }}>Registrar o pagamento</span>

      <div style={{ display: 'grid', gridTemplateColumns: campo ? 'minmax(0,1fr)' : 'repeat(3, minmax(0,1fr))', gap: 14 }}>
        <Select
          label="Conta de saída"
          value={conta}
          options={contasPagadoras.map((c) => ({ value: c.id, label: c.nome }))}
          onChange={onEscolherConta}
        />
        <TextField label="Data do pagamento" type="date" value={data} onChange={(e) => onEscolherData(e.target.value)} />
        <TextField
          label="Valor"
          value={formatarDinheiro(total)}
          readOnly
          hint="igual ao total da fatura, sem edição"
        />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        <Button iconName="check" onClick={onConfirmar}>
          Confirmar pagamento
        </Button>
        <Button variant="quiet" onClick={onCancelar}>
          Cancelar
        </Button>
        <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', maxWidth: '46ch' }}>
          Isto grava uma transferência, não um lançamento de despesa.
        </span>
      </div>
    </div>
  );
}
