import { Interruptor } from '@/ds';

export interface LinhaDeInterruptorProps {
  rotulo: string;
  nota: string;
  ligado: boolean;
  onAlternar: () => void;
}

export function LinhaDeInterruptor({ rotulo, nota, ligado, onAlternar }: LinhaDeInterruptorProps) {
  return (
    <div style={{ display: 'flex', gap: 13, alignItems: 'flex-start', paddingTop: 4 }}>
      <Interruptor ligado={ligado} onAlternar={onAlternar} rotuloAcessivel={rotulo} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
        <span style={{ font: 'var(--text-body-strong)', color: 'var(--text-primary)' }}>{rotulo}</span>
        <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{nota}</span>
      </div>
    </div>
  );
}
