import type { LinhaExtrato } from '@cdd/contracts';
import { Button, Select } from '@/ds';
import { formatarData, formatarDinheiro } from '@/pages/utils/formato';
import { motivosDeIgnorar } from '../../mocks/conciliacao';

export interface LinhaDoExtratoProps {
  linha: LinhaExtrato;
  ignorando: boolean;
  motivo: string;
  onMotivo: (v: string) => void;
  onIgnorar: () => void;
  onAbrirIgnorar: () => void;
  onCancelar: () => void;
}

export function LinhaDoExtrato({
  linha,
  ignorando,
  motivo,
  onMotivo,
  onIgnorar,
  onAbrirIgnorar,
  onCancelar,
}: LinhaDoExtratoProps) {
  const credito = linha.sinal === 'CREDITO';
  return (
    <div
      style={{
        background: 'var(--bg-card)',
        border: 'var(--border-hairline)',
        borderLeft: 'var(--edge-state) solid var(--color-attention)',
        borderRadius: '0 var(--radius) var(--radius) 0',
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 9,
      }}
    >
      <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
        <span data-numeric style={{ font: 'var(--text-small)', color: 'var(--text-meta)' }}>
          {formatarData(linha.data).slice(0, 5)}
        </span>
        <span style={{ flex: 1, minWidth: 0, font: 'var(--text-body)', color: 'var(--text-primary)' }}>
          {linha.descricaoBanco}
        </span>
        <span
          data-numeric
          style={{ font: 'var(--text-amount)', color: credito ? 'var(--color-confirmed)' : 'var(--text-primary)' }}
        >
          {credito ? '+ ' : '− '}
          {formatarDinheiro(linha.valor)}
        </span>
      </div>

      {ignorando ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          <Select
            label="Motivo"
            value={motivo}
            options={motivosDeIgnorar.map((m) => ({ value: m, label: m }))}
            onChange={onMotivo}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <Button iconName="check" onClick={onIgnorar}>
              Ignorar
            </Button>
            <Button variant="quiet" onClick={onCancelar}>
              Voltar
            </Button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <Button variant="ghost" iconName="circle-plus">
            Registrar lançamento
          </Button>
          <Button variant="quiet" iconName="ban" onClick={onAbrirIgnorar}>
            Ignorar
          </Button>
        </div>
      )}
    </div>
  );
}
