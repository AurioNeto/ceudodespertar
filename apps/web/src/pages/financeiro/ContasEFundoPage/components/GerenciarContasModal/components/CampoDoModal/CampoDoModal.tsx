import { entrada } from '../../constantes';

export interface CampoDoModalProps {
  rotulo: string;
  valor: string;
  placeholder: string;
  onMudar: (v: string) => void;
}

export function CampoDoModal({ rotulo, valor, placeholder, onMudar }: CampoDoModalProps) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column' }}>
      <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', marginBottom: 5 }}>{rotulo}</span>
      <input value={valor} placeholder={placeholder} onChange={(e) => onMudar(e.target.value)} style={entrada} />
    </label>
  );
}
