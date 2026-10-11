import { Button, Icon, Rotulo, Select, TextField, type Density } from '@/ds';
import { contas } from '@/pages/mocks/contas';
import { formatarCompetencia } from '@/pages/utils/formato';
import type { DevolucaoNaFila } from '../../../../mocks/devolucoes';
import { ID_DO_CAMPO_DA_DATA_DA_SAIDA } from '../../../../constantes';
import { competenciaDaSaida } from '../../../../utils/competenciaDaSaida';

export interface PainelDePagamentoProps {
  devolucao: DevolucaoNaFila;
  densidade: Density;
  conta: string;
  data: string;
  erroDaData: string | undefined;
  motivo: string;
  onConta: (v: string) => void;
  onData: (v: string) => void;
  onMotivo: (v: string) => void;
  onCancelar: () => void;
  onPagar: () => void;
}

export function PainelDePagamento({
  devolucao: d,
  densidade,
  conta,
  data,
  erroDaData,
  motivo,
  onConta,
  onData,
  onMotivo,
  onCancelar,
  onPagar,
}: PainelDePagamentoProps) {
  const campo = densidade === 'field';
  const destino = competenciaDaSaida(d);
  const faltaMotivo = d.competenciaFechada && !motivo.trim();

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
      <Rotulo>De onde sai e quando</Rotulo>

      <div style={{ display: 'grid', gridTemplateColumns: campo ? '1fr' : '1fr 1fr', gap: 12 }}>
        <Select
          label="Conta"
          value={conta}
          onChange={onConta}
          options={contas.filter((c) => c.ativa).map((c) => ({ value: c.id as string, label: c.nome }))}
        />
        <TextField
          id={ID_DO_CAMPO_DA_DATA_DA_SAIDA}
          label="Data da saída"
          value={data}
          density={campo ? 'field' : 'office'}
          onChange={(e) => onData(e.target.value)}
          hint="A data de caixa, não a da solicitação."
          error={erroDaData}
        />
      </div>

      {d.competenciaFechada ? (
        <TextField
          label="Motivo"
          value={motivo}
          density={campo ? 'field' : 'office'}
          onChange={(e) => onMotivo(e.target.value)}
          hint={`Por que a saída entra em ${formatarCompetencia(destino)} e não em ${formatarCompetencia(d.competenciaOriginal as string)}.`}
        />
      ) : null}

      <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
        <Icon name="arrow-up-right" size={15} color="var(--color-royal)" style={{ marginTop: 2 }} />
        <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
          Vai gerar um <b>lançamento de saída</b> vinculado ao evento {d.evento}, na competência{' '}
          <b data-numeric>{formatarCompetencia(destino)}</b>
          {d.competenciaFechada
            ? ` — a competência original (${formatarCompetencia(d.competenciaOriginal as string)}) está fechada e não recebe lançamento sem reabertura; a saída só entra no mês corrente com a decisão registrada no motivo.`
            : '.'}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
        <Button
          iconName="check"
          density={campo ? 'field' : 'office'}
          disabled={faltaMotivo}
          blockedReason={faltaMotivo ? `Registre o motivo para lançar em ${formatarCompetencia(destino)}.` : undefined}
          onClick={onPagar}
        >
          Confirmar a devolução
        </Button>
        <Button variant="quiet" density={campo ? 'field' : 'office'} onClick={onCancelar}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
