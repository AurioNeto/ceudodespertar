import { Button, Select, SeletorDeTipo, TextField, type Density } from '@/ds';
import { CartaoDeFormulario } from '@/pages/financeiro/components/CartaoDeFormulario';
import { MENSAGEM_DE_DATA_VAZIA } from '@/pages/financeiro/constantes';
import { contasDeEmprestimo, contrapartesConhecidas } from '../../mocks/emprestimos';
import type { ValoresDoNovo } from '../../utils/montarEmprestimo';

export interface FormularioDeEmprestimoProps {
  densidade: Density;
  valores: ValoresDoNovo;
  valido: boolean;
  dataValida: boolean;
  onMudar: <K extends keyof ValoresDoNovo>(campo: K, valor: ValoresDoNovo[K]) => void;
  onConfirmar: () => void;
  onCancelar: () => void;
}

export function FormularioDeEmprestimo({
  densidade,
  valores,
  valido,
  dataValida,
  onMudar,
  onConfirmar,
  onCancelar,
}: FormularioDeEmprestimoProps) {
  const campo = densidade === 'field';
  const concedido = valores.direcao === 'CONCEDIDO';

  return (
    <CartaoDeFormulario titulo="Novo empréstimo" densidade={densidade}>
      <SeletorDeTipo
        opcoes={[
          { valor: 'CONCEDIDO', label: 'A casa empresta' },
          { valor: 'RECEBIDO', label: 'A casa toma emprestado' },
        ]}
        valor={valores.direcao}
        onEscolher={(v) => onMudar('direcao', v)}
        densidade={campo ? 'field' : 'office'}
      />

      <div style={{ display: 'grid', gridTemplateColumns: campo ? 'minmax(0,1fr)' : 'repeat(2, minmax(0,1fr))', gap: 14 }}>
        <Select
          label={concedido ? 'Para quem' : 'De quem'}
          value={valores.contraparteId}
          options={contrapartesConhecidas.map((c) => ({ value: c.id, label: c.nome }))}
          onChange={(v) => onMudar('contraparteId', v)}
          hint="quem não estiver na lista precisa de cadastro em Pessoas"
        />
        <Select
          label={concedido ? 'Conta de saída' : 'Conta de entrada'}
          value={valores.conta}
          options={contasDeEmprestimo.map((c) => ({ value: c.id, label: c.nome }))}
          onChange={(v) => onMudar('conta', v)}
        />
        <TextField
          label="Valor"
          inputMode="decimal"
          placeholder="0,00"
          value={valores.valor}
          onChange={(e) => onMudar('valor', e.target.value)}
        />
        <TextField
          label="Data"
          type="date"
          value={valores.data}
          error={dataValida ? undefined : MENSAGEM_DE_DATA_VAZIA}
          onChange={(e) => onMudar('data', e.target.value)}
        />
      </div>

      <TextField
        label="Motivo"
        placeholder="por que a casa emprestou, em uma linha"
        value={valores.motivo}
        onChange={(e) => onMudar('motivo', e.target.value)}
      />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        <Button
          iconName="check"
          onClick={onConfirmar}
          disabled={!valido || !dataValida}
          blockedReason={!valido ? 'Informe um valor maior que zero e o motivo.' : undefined}
        >
          Registrar empréstimo
        </Button>
        <Button variant="quiet" onClick={onCancelar}>
          Cancelar
        </Button>
        <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', maxWidth: '50ch' }}>
          {concedido
            ? 'Grava uma transferência de saída. Não entra como despesa no mês.'
            : 'Grava uma transferência de entrada. Não entra como receita no mês.'}
        </span>
      </div>
    </CartaoDeFormulario>
  );
}
