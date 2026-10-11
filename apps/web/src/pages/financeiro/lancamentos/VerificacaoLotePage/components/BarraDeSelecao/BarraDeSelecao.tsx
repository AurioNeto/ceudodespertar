import { Button } from '@/ds';
import { pluralizar } from '@/pages/utils/formato';

export interface BarraDeSelecaoProps {
  quantidade: number;
  onAprovar: () => void;
  onLimpar: () => void;
}

export function BarraDeSelecao({ quantidade, onAprovar, onLimpar }: BarraDeSelecaoProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
        background: 'var(--bg-brand)',
        border: '1px solid var(--border-brand)',
        borderRadius: 'var(--radius)',
        padding: '10px 14px',
      }}
    >
      <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>
        {pluralizar(quantidade, 'selecionado', 'selecionados')}
      </span>
      <Button variant="quiet" iconName="check-check" onClick={onAprovar}>
        Aprovar selecionados
      </Button>
      <button
        type="button"
        onClick={onLimpar}
        style={{
          marginLeft: 'auto',
          font: 'var(--text-small)',
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          textDecoration: 'underline',
        }}
      >
        Limpar seleção
      </button>
    </div>
  );
}
