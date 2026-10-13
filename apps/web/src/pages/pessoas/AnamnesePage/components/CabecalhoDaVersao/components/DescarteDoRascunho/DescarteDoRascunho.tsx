import { Button } from '@/ds';
import { useDescarteDoRascunho } from './hooks/useDescarteDoRascunho';

export interface DescarteDoRascunhoProps {
  onDescartar: () => void;
}

export function DescarteDoRascunho({ onDescartar }: DescarteDoRascunhoProps) {
  const { confirmando, pedirConfirmacao, manterRascunho } = useDescarteDoRascunho();

  if (!confirmando) {
    return (
      <Button variant="ghost" iconName="trash-2" onClick={pedirConfirmacao}>
        Descartar rascunho
      </Button>
    );
  }

  return (
    <div role="group" aria-label="Confirmar o descarte do rascunho" style={{ display: 'flex', flexDirection: 'column', gap: 10, flexBasis: '100%' }}>
      <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
        Descartar apaga as edições deste rascunho, e não dá para desfazer.
      </span>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <Button iconName="trash-2" onClick={onDescartar}>
          Descartar
        </Button>
        <Button variant="quiet" onClick={manterRascunho}>
          Manter rascunho
        </Button>
      </div>
    </div>
  );
}
