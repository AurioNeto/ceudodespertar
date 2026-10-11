import { Button } from '@/ds';
import { entrada } from '../../constantes';

export interface FormularioDeDevolucaoProps {
  remetente: string | null;
  motivo: string;
  onEscreverMotivo: (motivo: string) => void;
  onDevolver: (motivo: string) => void;
  onCancelar: () => void;
}

export function FormularioDeDevolucao({
  remetente,
  motivo,
  onEscreverMotivo,
  onDevolver,
  onCancelar,
}: FormularioDeDevolucaoProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        background: 'var(--color-attention-soft)',
        border: '1px solid var(--color-attention-border)',
        borderRadius: 'var(--radius)',
        padding: '12px 14px',
      }}
    >
      <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>
        Devolver a {remetente ?? 'quem enviou'}
      </span>
      <textarea
        value={motivo}
        onChange={(e) => onEscreverMotivo(e.target.value)}
        rows={3}
        placeholder="o motivo chega junto para quem enviou corrigir"
        aria-label="Motivo da devolução"
        style={{ ...entrada, resize: 'vertical' }}
      />
      <div style={{ display: 'flex', gap: 10 }}>
        <Button
          iconName="send"
          disabled={!motivo.trim()}
          blockedReason={!motivo.trim() ? 'Escreva o motivo — é o que a pessoa vai ler.' : undefined}
          onClick={() => onDevolver(motivo.trim())}
        >
          Devolver
        </Button>
        <Button variant="quiet" onClick={onCancelar}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
