import { useId } from 'react';
import type { CSSProperties, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';
import type { Density } from './Button';

type NativeProps = Omit<
  InputHTMLAttributes<HTMLInputElement> & TextareaHTMLAttributes<HTMLTextAreaElement>,
  'style'
>;

export interface TextFieldProps extends NativeProps {
  label?: string;
  hint?: string;
  error?: string;
  density?: Density;
  multiline?: boolean;
  suffix?: ReactNode;
  style?: CSSProperties;
}

export function TextField({
  label,
  hint,
  error,
  density = 'office',
  multiline = false,
  suffix,
  id,
  readOnly,
  style,
  type = 'text',
  ...rest
}: TextFieldProps) {
  const generated = useId();
  const fid = id ?? generated;
  const field = density === 'field';

  const controlStyle: CSSProperties = {
    width: '100%',
    minHeight: field ? 'var(--target-field)' : 'var(--target-office)',
    border: `1px solid ${error ? 'var(--color-attention)' : 'var(--color-line-strong)'}`,
    background: readOnly ? 'var(--bg-sunken)' : 'var(--bg-card)',
    borderRadius: 'var(--radius)',
    padding: field ? '12px 14px' : '10px 13px',
    font: field ? 'var(--text-body-lg)' : 'var(--text-body)',
    color: 'var(--text-primary)',
    outline: 'none',
    boxShadow: error ? '0 0 0 3px var(--color-attention-soft)' : 'none',
    paddingRight: suffix ? 64 : undefined,
    resize: 'vertical',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', ...style }}>
      {label ? (
        <label
          htmlFor={fid}
          style={{
            font: 'var(--text-label)',
            letterSpacing: 'var(--tracking-label)',
            textTransform: 'uppercase',
            color: 'var(--text-field-label)',
            marginBottom: 7,
          }}
        >
          {label}
        </label>
      ) : null}

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {multiline ? (
          <textarea id={fid} readOnly={readOnly} rows={3} style={controlStyle} {...rest} />
        ) : (
          <input id={fid} type={type} readOnly={readOnly} style={controlStyle} {...rest} />
        )}
        {suffix ? (
          <span
            style={{
              position: 'absolute',
              right: 12,
              font: 'var(--text-amount)',
              color: 'var(--text-meta)',
              pointerEvents: 'none',
            }}
          >
            {suffix}
          </span>
        ) : null}
      </div>

      {error ? (
        <span style={{ marginTop: 7, font: 'var(--text-small)', color: 'var(--color-attention)' }}>{error}</span>
      ) : hint ? (
        <span style={{ marginTop: 7, font: 'var(--text-small)', color: 'var(--text-secondary)' }}>{hint}</span>
      ) : null}
    </div>
  );
}
