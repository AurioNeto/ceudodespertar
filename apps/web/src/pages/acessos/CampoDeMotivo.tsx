import { useId } from 'react';
import { TextField, type Density } from '../../ds';
import { AVISO_LGPD_DO_MOTIVO, LIMITE_DO_MOTIVO } from './textosDeAcessos';

export interface CampoDeMotivoProps {
  readonly valor: string;
  readonly aoMudar: (valor: string) => void;
  readonly erro?: string;
  readonly densidade: Density;
}

export function CampoDeMotivo({ valor, aoMudar, erro, densidade }: CampoDeMotivoProps) {
  const idDoAviso = useId();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
      <p
        id={idDoAviso}
        style={{
          margin: 0,
          padding: 'var(--space-3)',
          font: 'var(--text-small)',
          color: 'var(--text-primary)',
          background: 'var(--color-attention-soft)',
          border: '1px solid var(--color-attention-border)',
          borderRadius: 'var(--radius)',
        }}
      >
        {AVISO_LGPD_DO_MOTIVO}
      </p>
      <TextField
        label="Motivo"
        multiline
        density={densidade}
        value={valor}
        maxLength={LIMITE_DO_MOTIVO}
        error={erro}
        aria-describedby={idDoAviso}
        onChange={(evento) => aoMudar(evento.target.value)}
      />
      <span aria-live="polite" style={{ alignSelf: 'flex-end', font: 'var(--text-small)', color: 'var(--text-secondary)' }}>
        {valor.length}/{LIMITE_DO_MOTIVO}
      </span>
    </div>
  );
}
