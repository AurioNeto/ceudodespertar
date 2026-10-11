import { Button, Rotulo, Select, TextField, type Density } from '@/ds';
import { contas } from '@/pages/mocks/contas';
import { formatarBRL } from '@/pages/utils/formato';
import type { ContratacaoNaTela } from '../../../../mocks/contratacoes';

export interface PainelDeRecebimentoProps {
  contratacao: ContratacaoNaTela;
  densidade: Density;
  conta: string;
  data: string;
  onConta: (v: string) => void;
  onData: (v: string) => void;
  onCancelar: () => void;
  onReceber: () => void;
}

export function PainelDeRecebimento({
  contratacao: c,
  densidade,
  conta,
  data,
  onConta,
  onData,
  onCancelar,
  onReceber,
}: PainelDeRecebimentoProps) {
  const campo = densidade === 'field';

  return (
    <div
      style={{
        background: 'var(--bg-sunken)',
        border: '1px solid var(--color-line)',
        borderRadius: 'var(--radius)',
        padding: campo ? '14px 15px' : '15px 17px',
        display: 'flex',
        flexDirection: 'column',
        gap: 13,
      }}
    >
      <Rotulo>Onde entrou e quando</Rotulo>

      <div style={{ display: 'grid', gridTemplateColumns: campo ? '1fr' : '1fr 1fr', gap: 12 }}>
        <Select
          label="Conta"
          value={conta}
          onChange={onConta}
          options={contas.filter((x) => x.ativa).map((x) => ({ value: x.id as string, label: x.nome }))}
        />
        <TextField
          label="Data do recebimento"
          value={data}
          density={campo ? 'field' : 'office'}
          onChange={(e) => onData(e.target.value)}
          hint="A data de caixa."
        />
      </div>

      <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', maxWidth: '76ch' }}>
        Vai gerar receita de {formatarBRL(c.valorAcordado)} com categoria <b>Cachê de contratação</b>, unidade{' '}
        <b>Munay</b>, vinculada a este evento. A categoria e a unidade não se escolhem aqui: vêm da contratação.
      </span>

      <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
        <Button iconName="check" density={campo ? 'field' : 'office'} onClick={onReceber}>
          Confirmar o recebimento
        </Button>
        <Button variant="quiet" density={campo ? 'field' : 'office'} onClick={onCancelar}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
