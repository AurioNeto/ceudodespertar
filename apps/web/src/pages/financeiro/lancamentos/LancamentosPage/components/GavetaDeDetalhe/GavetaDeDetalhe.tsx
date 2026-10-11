import type { LancamentoNaLista } from '@cdd/contracts';
import { Button, Icon, Receipt, StatusBadge, type Density } from '@/ds';
import { formatarData } from '@/pages/utils/formato';
import { linhasDoRecibo, rodapeDoRecibo, tomDoRecibo } from '@/pages/financeiro/lancamentos/utils/recibo';
import { rotuloDaSituacao } from '@/pages/financeiro/lancamentos/utils/rotulosDoLancamento';
import { HistoricoDoLancamento } from './components/HistoricoDoLancamento';
import { historicoDoLancamento } from './utils/historicoDoLancamento';

export interface GavetaDeDetalheProps {
  registro: LancamentoNaLista;
  densidade: Density;
  onFechar: () => void;
}

export function GavetaDeDetalhe({ registro, densidade, onFechar }: GavetaDeDetalheProps) {
  const campo = densidade === 'field';
  const estornado = registro.status === 'ESTORNADO';
  const historico = historicoDoLancamento(registro);

  return (
    <div
      onClick={onFechar}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(59,38,23,.38)',
        display: 'flex',
        alignItems: campo ? 'flex-end' : 'stretch',
        justifyContent: 'flex-end',
        zIndex: 40,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: campo ? '100%' : 'min(480px, 100%)',
          maxHeight: campo ? '86%' : '100%',
          overflow: 'auto',
          background: 'var(--bg-app)',
          borderLeft: campo ? 0 : '1px solid var(--color-line-strong)',
          borderRadius: campo ? 'var(--radius-lg) var(--radius-lg) 0 0' : 0,
          boxShadow: 'var(--shadow-sheet)',
          padding: '18px 20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ font: 'var(--text-title-sm)', color: 'var(--text-title)', flex: 1 }}>Detalhe do lançamento</span>
          <StatusBadge tone={registro.status === 'A_CONFERIR' ? 'pending' : estornado ? 'neutral' : 'confirmed'}>
            {rotuloDaSituacao(registro.status)}
          </StatusBadge>
          <button type="button" onClick={onFechar} aria-label="Fechar detalhe" style={{ color: 'var(--text-meta)' }}>
            <Icon name="x" size={20} />
          </button>
        </div>

        <Receipt
          title={`Registrado em ${formatarData(registro.data)} às ${registro.hora}`}
          amount={registro.valor / 100}
          tone={tomDoRecibo(registro.tipo)}
          lines={linhasDoRecibo(registro, { mostrarQuemLancou: true })}
          footnote={rodapeDoRecibo(registro)}
        />

        <HistoricoDoLancamento historico={historico} />

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <Button variant="ghost" iconName="paperclip" disabled={!registro.comprovante}>
            Ver comprovante
          </Button>
          <Button
            variant="quiet"
            iconName="undo-2"
            disabled={estornado}
            blockedReason={estornado ? 'Este lançamento já foi estornado.' : undefined}
          >
            Estornar
          </Button>
        </div>
      </div>
    </div>
  );
}
