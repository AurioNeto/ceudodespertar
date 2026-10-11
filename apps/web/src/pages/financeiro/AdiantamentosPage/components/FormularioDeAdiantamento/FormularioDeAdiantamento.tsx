import { Button, Rotulo, Select, TextField, type Density } from '@/ds';
import { CartaoDeFormulario } from '@/pages/financeiro/components/CartaoDeFormulario';
import { MENSAGEM_DE_DATA_VAZIA } from '@/pages/financeiro/constantes';
import { quemAdianta } from '../../mocks/adiantamentos';
import type { DadosDoNovo } from '../../utils/montarAdiantamento';
import { useFormularioDeAdiantamento } from './hooks/useFormularioDeAdiantamento';

export interface FormularioDeAdiantamentoProps {
  densidade: Density;
  onConfirmar: (d: DadosDoNovo) => void;
  onCancelar: () => void;
}

export function FormularioDeAdiantamento({ densidade, onConfirmar, onCancelar }: FormularioDeAdiantamentoProps) {
  const campo = densidade === 'field';
  const formulario = useFormularioDeAdiantamento(onConfirmar);

  return (
    <CartaoDeFormulario titulo="Novo adiantamento" densidade={densidade}>
      <div style={{ display: 'grid', gridTemplateColumns: campo ? 'minmax(0,1fr)' : 'repeat(2, minmax(0,1fr))', gap: 14 }}>
        <Select
          label="Quem adiantou"
          value={formulario.pessoaId}
          options={quemAdianta.map((p) => ({ value: p.id, label: p.nome }))}
          onChange={formulario.escolherPessoa}
        />
        {formulario.contasDaPessoa.length ? (
          <Select
            label="Conta pessoal usada"
            value={formulario.contaId}
            options={formulario.contasDaPessoa.map((c) => ({ value: c.id, label: c.nome }))}
            onChange={formulario.escolherConta}
            hint="só as contas dessa pessoa aparecem aqui"
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, justifyContent: 'center' }}>
            <Rotulo>Conta pessoal usada</Rotulo>
            <span style={{ font: 'var(--text-small)', color: 'var(--color-attention)' }}>
              Esta pessoa não tem conta pessoal cadastrada. Adiantamento só sai de conta de terceiro.
            </span>
          </div>
        )}
        <TextField
          label="Valor"
          inputMode="decimal"
          placeholder="0,00"
          value={formulario.valor}
          onChange={(e) => formulario.escolherValor(e.target.value)}
        />
        <TextField
          label="Data da despesa"
          type="date"
          value={formulario.data}
          error={formulario.dataValida ? undefined : MENSAGEM_DE_DATA_VAZIA}
          onChange={(e) => formulario.escolherData(e.target.value)}
        />
      </div>

      <TextField
        label="Do que foi a despesa"
        placeholder="o que foi comprado, em uma linha"
        value={formulario.motivo}
        onChange={(e) => formulario.escolherMotivo(e.target.value)}
      />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
        <Button
          iconName="check"
          onClick={formulario.confirmar}
          disabled={!formulario.valido || !formulario.dataValida}
          blockedReason={!formulario.valido ? 'Informe conta pessoal, valor maior que zero e a despesa.' : undefined}
        >
          Registrar
        </Button>
        <Button variant="quiet" onClick={onCancelar}>
          Cancelar
        </Button>
        <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', maxWidth: '50ch' }}>
          Depois de registrado, precisa da autorização de um padrinho ou madrinha para entrar na fila de reembolso.
        </span>
      </div>
    </CartaoDeFormulario>
  );
}
