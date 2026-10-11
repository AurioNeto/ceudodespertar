import type { StatusFatura } from '@cdd/contracts';
import { Button } from '@/ds';
import { pluralizar } from '@/pages/utils/formato';

export interface AcoesDaFaturaProps {
  status: StatusFatura;
  aConferir: number;
  onFechar: () => void;
  onPagar: () => void;
}

export function AcoesDaFatura({ status, aConferir, onFechar, onPagar }: AcoesDaFaturaProps) {
  if (status === 'PAGA') {
    return (
      <div style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
        Fatura paga. Correção só por estorno do lançamento de origem.
      </div>
    );
  }

  if (status === 'ABERTA') {
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
        <Button iconName="lock" onClick={onFechar}>
          Fechar fatura
        </Button>
        <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', maxWidth: '52ch' }}>
          Depois de fechada, compra nova neste cartão entra na fatura seguinte.
          {aConferir > 0 ? ` ${pluralizar(aConferir, 'compra')} ainda a conferir — fechar a fatura não confere ninguém.` : ''}
        </span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
      <Button iconName="arrow-left-right" onClick={onPagar}>
        Registrar pagamento
      </Button>
      <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
        Grava uma transferência da conta escolhida para o cartão.
      </span>
    </div>
  );
}
