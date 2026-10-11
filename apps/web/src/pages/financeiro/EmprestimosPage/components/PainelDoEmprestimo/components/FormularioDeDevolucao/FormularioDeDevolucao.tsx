import type { DirecaoEmprestimo } from '@cdd/contracts';
import { Button, Select, TextField, type Density } from '@/ds';
import { formatarDinheiro } from '@/pages/utils/formato';
import { contasDeEmprestimo } from '../../../../mocks/emprestimos';

export interface FormularioDeDevolucaoProps {
  densidade: Density;
  saldo: number;
  direcao: DirecaoEmprestimo;
  valor: string;
  data: string;
  conta: string;
  excedeSaldo: boolean;
  valorValido: boolean;
  onValor: (v: string) => void;
  onData: (v: string) => void;
  onConta: (v: string) => void;
  onConfirmar: () => void;
  onCancelar: () => void;
}

export function FormularioDeDevolucao({
  densidade,
  saldo,
  direcao,
  valor,
  data,
  conta,
  excedeSaldo,
  valorValido,
  onValor,
  onData,
  onConta,
  onConfirmar,
  onCancelar,
}: FormularioDeDevolucaoProps) {
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
      <span style={{ font: 'var(--text-title-sm)', color: 'var(--text-title)' }}>
        {direcao === 'CONCEDIDO' ? 'Registrar o que voltou' : 'Registrar o que a casa devolveu'}
      </span>

      <div style={{ display: 'grid', gridTemplateColumns: campo ? 'minmax(0,1fr)' : 'repeat(3, minmax(0,1fr))', gap: 14 }}>
        <TextField
          label="Valor"
          inputMode="decimal"
          placeholder="0,00"
          value={valor}
          onChange={(e) => onValor(e.target.value)}
          error={excedeSaldo ? `Passa do saldo de ${formatarDinheiro(saldo)}.` : undefined}
          hint={excedeSaldo ? undefined : `saldo de ${formatarDinheiro(saldo)}`}
          autoFocus
        />
        <TextField label="Data" type="date" value={data} onChange={(e) => onData(e.target.value)} />
        <Select
          label={direcao === 'CONCEDIDO' ? 'Conta de entrada' : 'Conta de saída'}
          value={conta}
          options={contasDeEmprestimo.map((c) => ({ value: c.id, label: c.nome }))}
          onChange={onConta}
        />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        <Button
          iconName="check"
          onClick={onConfirmar}
          disabled={!valorValido || excedeSaldo}
          blockedReason={
            excedeSaldo
              ? 'A soma das devoluções não pode passar do principal emprestado.'
              : !valorValido && valor.length > 0
                ? 'Informe um valor maior que zero.'
                : undefined
          }
        >
          Registrar devolução
        </Button>
        <Button variant="quiet" onClick={onCancelar}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
