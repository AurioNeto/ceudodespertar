import { entrada } from '../../constantes';

export interface CampoDeTextoProps {
  rotulo: string;
  valor: string;
  onMudar: (v: string) => void;
}

export function CampoDeTexto({ rotulo, valor, onMudar }: CampoDeTextoProps) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column' }}>
      <span style={{ font: 'var(--text-small)', color: 'var(--text-secondary)', marginBottom: 5 }}>{rotulo}</span>
      <input value={valor} onChange={(e) => onMudar(e.target.value)} style={entrada} />
    </label>
  );
}
