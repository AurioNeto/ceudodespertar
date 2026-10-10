import { useId } from 'react';
import type { SheetOption } from '../../fundacao/opcao';
import { RotuloDeCampo } from '../../atoms/RotuloDeCampo';

export interface SelectProps {
  label: string;
  value: string;
  options: readonly SheetOption[];
  onChange: (value: string) => void;
  hint?: string;
  erro?: boolean;
}

export function Select({ label, value, options, onChange, hint, erro = false }: SelectProps) {
  const id = useId();
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <RotuloDeCampo htmlFor={id}>{label}</RotuloDeCampo>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          minHeight: 'var(--target-office)',
          border: `1px solid ${erro ? 'var(--color-attention)' : 'var(--color-line-strong)'}`,
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius)',
          padding: '10px 13px',
          font: 'var(--text-body)',
          color: 'var(--text-primary)',
          outline: 'none',
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
