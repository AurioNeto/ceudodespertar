import { useState } from 'react';
import { Button } from '@/ds';

export interface DescarteDoRascunhoProps {
  onDescartar: () => void;
}

export function DescarteDoRascunho({ onDescartar }: DescarteDoRascunhoProps) {
  const [confirmando, setConfirmando] = useState(false);

  if (!confirmando) {
    return (
      <Button variant="ghost" iconName="trash-2" onClick={() => setConfirmando(true)}>
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
        <Button variant="quiet" onClick={() => setConfirmando(false)}>
          Manter rascunho
        </Button>
      </div>
    </div>
  );
}
