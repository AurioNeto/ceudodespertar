import { rotuloLabel } from '../../../../constantes';

export interface CampoDeMesProps {
  rotulo: string;
  valor: string;
  onMudar: (v: string) => void;
}

export function CampoDeMes({ rotulo, valor, onMudar }: CampoDeMesProps) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column' }}>
      <span style={{ ...rotuloLabel, marginBottom: 7 }}>{rotulo}</span>
      <input
        value={valor}
        onChange={(e) => onMudar(e.target.value)}
        placeholder="03/2026"
        style={{
          minHeight: 'var(--target-office)',
          border: '1px solid var(--color-line-strong)',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius)',
          padding: '10px 13px',
          font: 'var(--text-body)',
          color: 'var(--text-primary)',
          outline: 'none',
          width: 140,
        }}
      />
    </label>
  );
}
