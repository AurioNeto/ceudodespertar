import { useState } from 'react';
import type { Density } from '../../ds';
import { Icon, TextField } from '../../ds';
import { regrasDaSenha } from '../../lib/senha';

export interface CampoDeSenhaProps {
  label: string;
  valor: string;
  onChange: (valor: string) => void;
  densidade: Density;
  /** `current-password` na entrada, `new-password` no convite e na troca. */
  autoComplete?: string;
  erro?: string;
  hint?: string;
  autoFocus?: boolean;
  /** Lista as exigências e vai marcando o que já foi atendido. */
  regras?: boolean;
}

export function CampoDeSenha({
  label,
  valor,
  onChange,
  densidade,
  autoComplete = 'current-password',
  erro,
  hint,
  autoFocus = false,
  regras = false,
}: CampoDeSenhaProps) {
  const [aberta, setAberta] = useState(false);
  const campo = densidade === 'field';

  return (
    <div>
      <TextField
        label={label}
        type={aberta ? 'text' : 'password'}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        density={densidade}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        aria-invalid={erro ? true : undefined}
        error={erro}
        hint={hint}
        action={{
          icon: aberta ? 'eye-off' : 'eye',
          label: aberta ? 'Ocultar a senha' : 'Mostrar a senha',
          onClick: () => setAberta((a) => !a),
        }}
      />

      {regras ? (
        <ul style={{ listStyle: 'none', margin: '10px 0 0', padding: 0, display: 'flex', flexWrap: 'wrap', gap: campo ? 10 : 14 }}>
          {regrasDaSenha(valor).map((r) => (
            <li
              key={r.rotulo}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                font: 'var(--text-small)',
                color: r.atende ? 'var(--color-confirmed)' : 'var(--text-meta)',
              }}
            >
              <Icon name={r.atende ? 'circle-check' : 'minus'} size={14} />
              {r.rotulo}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
