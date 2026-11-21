import { useId } from 'react';
import { entrada } from '../../constantes';

export interface CampoDoModalProps {
  rotulo: string;
  valor: string;
  placeholder: string;
  erro?: string;
  onMudar: (v: string) => void;
}

export function CampoDoModal({ rotulo, valor, placeholder, erro, onMudar }: CampoDoModalProps) {
  const idDoErro = useId();

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <label style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', marginBottom: 5 }}>{rotulo}</span>
        <input
          value={valor}
          placeholder={placeholder}
          onChange={(e) => onMudar(e.target.value)}
          aria-invalid={erro ? true : undefined}
          aria-describedby={erro ? idDoErro : undefined}
          style={erro ? { ...entrada, border: '1px solid var(--color-attention)' } : entrada}
        />
      </label>
      {erro ? (
        <span id={idDoErro} style={{ marginTop: 5, font: 'var(--text-small)', color: 'var(--color-attention)' }}>
          {erro}
        </span>
      ) : null}
    </div>
  );
}
