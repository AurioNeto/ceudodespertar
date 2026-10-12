import { useId, useState } from 'react';
import type { Density } from '../../fundacao/densidade';
import type { SheetOption } from '../../fundacao/opcao';
import { RotuloDeCampo } from '../../atoms/RotuloDeCampo';

export interface SelectProps {
  label: string;
  value: string;
  options: readonly SheetOption[];
  onChange: (value: string) => void;
  hint?: string;
  erro?: boolean;
  density?: Density;
}

export function Select({ label, value, options, onChange, hint, erro = false, density = 'office' }: SelectProps) {
  const id = useId();
  const [emFoco, setEmFoco] = useState(false);
  const corDaBorda = erro ? 'var(--color-attention)' : emFoco ? 'var(--focus-ring)' : 'var(--border-field)';
  const halo = erro ? '0 0 0 3px var(--color-attention-soft)' : emFoco ? '0 0 0 3px color-mix(in srgb, var(--focus-ring) 45%, transparent)' : 'none';
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <RotuloDeCampo htmlFor={id}>{label}</RotuloDeCampo>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setEmFoco(true)}
        onBlur={() => setEmFoco(false)}
        style={{
          width: '100%',
          minHeight: density === 'field' ? 'var(--target-field)' : 'var(--target-office)',
          border: `1px solid ${corDaBorda}`,
          background: 'var(--bg-card)',
          borderRadius: 'var(--leaf-sm)',
          padding: '10px 13px',
          font: 'var(--text-body)',
          color: 'var(--text-primary)',
          outline: 'none',
          boxShadow: halo,
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint ? (
        <span style={{ marginTop: 7, font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{hint}</span>
      ) : null}
    </div>
  );
}
