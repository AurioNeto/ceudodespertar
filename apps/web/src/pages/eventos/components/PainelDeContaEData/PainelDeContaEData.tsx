import type { ReactNode } from 'react';
import { Button, Rotulo, Select, TextField, type Density } from '@/ds';
import { contas } from '@/pages/mocks/contas';

export interface PainelDeContaEDataProps {
  titulo: string;
  densidade: Density;
  conta: string;
  data: string;
  idDaData: string;
  rotuloDaData: string;
  dicaDaData: string;
  erroDaData: string | undefined;
  rotuloDeConfirmar: string;
  bloqueioDeConfirmar?: string;
  onConta: (v: string) => void;
  onData: (v: string) => void;
  onCancelar: () => void;
  onConfirmar: () => void;
  children: ReactNode;
}

export function PainelDeContaEData({
  titulo,
  densidade,
  conta,
  data,
  idDaData,
  rotuloDaData,
  dicaDaData,
  erroDaData,
  rotuloDeConfirmar,
  bloqueioDeConfirmar,
  onConta,
  onData,
  onCancelar,
  onConfirmar,
  children,
}: PainelDeContaEDataProps) {
  const campo = densidade === 'field';

  return (
    <div
      style={{
        background: 'var(--bg-sunken)',
        border: '1px solid var(--color-line)',
        borderRadius: 'var(--leaf-lg)',
        padding: campo ? '14px 15px' : '15px 17px',
        display: 'flex',
        flexDirection: 'column',
        gap: 13,
      }}
    >
      <Rotulo>{titulo}</Rotulo>

      <div style={{ display: 'grid', gridTemplateColumns: campo ? '1fr' : '1fr 1fr', gap: 12 }}>
        <Select
          label="Conta"
          value={conta}
          onChange={onConta}
          options={contas.filter((c) => c.ativa).map((c) => ({ value: c.id as string, label: c.nome }))}
        />
        <TextField
          id={idDaData}
          label={rotuloDaData}
          value={data}
          density={campo ? 'field' : 'office'}
          onChange={(e) => onData(e.target.value)}
          hint={dicaDaData}
          error={erroDaData}
        />
      </div>

      {children}

      <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
        <Button
          iconName="check"
          density={campo ? 'field' : 'office'}
          disabled={bloqueioDeConfirmar !== undefined}
          blockedReason={bloqueioDeConfirmar}
          onClick={onConfirmar}
        >
          {rotuloDeConfirmar}
        </Button>
        <Button variant="quiet" density={campo ? 'field' : 'office'} onClick={onCancelar}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
