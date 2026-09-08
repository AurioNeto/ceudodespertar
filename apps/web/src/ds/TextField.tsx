import { useId } from 'react';
import type { CSSProperties, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';
import type { Density } from './Button';
import { Icon, type IconName } from './Icon';

type NativeProps = Omit<
  InputHTMLAttributes<HTMLInputElement> & TextareaHTMLAttributes<HTMLTextAreaElement>,
  'style'
>;

/** Botão dentro do campo — mostrar/ocultar senha, limpar busca. */
export interface FieldAction {
  icon: IconName;
  /** Vai para o `aria-label` e para o `title`; o botão não tem texto. */
  label: string;
  onClick: () => void;
}

export interface TextFieldProps extends NativeProps {
  label?: string;
  hint?: string;
  error?: string;
  density?: Density;
  multiline?: boolean;
  suffix?: ReactNode;
  action?: FieldAction;
  style?: CSSProperties;
}

export function TextField({
  label,
  hint,
  error,
  density = 'office',
  multiline = false,
  suffix,
  action,
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
    paddingRight: suffix ? 64 : action ? (field ? 52 : 46) : undefined,
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

        {action ? (
          <button
            type="button"
            onClick={action.onClick}
            aria-label={action.label}
            title={action.label}
            style={{
              position: 'absolute',
              right: 5,
              display: 'grid',
              placeItems: 'center',
              width: field ? 42 : 36,
              height: field ? 42 : 36,
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-meta)',
              cursor: 'pointer',
            }}
          >
            <Icon name={action.icon} size={field ? 20 : 18} />
          </button>
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
