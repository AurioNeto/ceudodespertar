import { useState } from 'react';
import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

export type ButtonVariant = 'primary' | 'ghost' | 'quiet' | 'suggest' | 'onChrome';
export type Density = 'office' | 'field';

const VARIANTS: Record<ButtonVariant, CSSProperties> = {
  primary: { background: 'var(--action-bg)', color: 'var(--action-fg)', border: '1.5px solid transparent' },
  ghost: { background: 'transparent', color: 'var(--color-royal)', border: '1.5px solid var(--color-royal-border)' },
  quiet: { background: 'var(--bg-sunken)', color: 'var(--text-primary)', border: '1px solid var(--color-line)' },
  suggest: {
    background: 'var(--color-suggest-soft)',
    color: 'var(--color-suggest)',
    border: '1.5px solid var(--color-suggest-border)',
  },
  onChrome: { background: 'rgba(255,255,255,.12)', color: '#FFFFFF', border: '1.5px solid rgba(255,255,255,.28)' },
};

const HOVER: Record<ButtonVariant, string> = {
  primary: 'var(--action-bg-hover)',
  ghost: 'var(--color-royal-soft)',
  quiet: 'var(--color-line)',
  suggest: 'var(--color-suggest-border)',
  onChrome: 'rgba(255,255,255,.2)',
};

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  children?: ReactNode;
  variant?: ButtonVariant;
  density?: Density;
  fullWidth?: boolean;
  iconName?: IconName;
  iconAfter?: boolean;
  /** Motivo exibido abaixo do botão quando ele está bloqueado. */
  blockedReason?: string;
}

export function Button({
  children,
  variant = 'primary',
  density = 'office',
  fullWidth = false,
  iconName,
  iconAfter = false,
  disabled = false,
  blockedReason,
  style,
  ...rest
}: ButtonProps) {
  const [hot, setHot] = useState(false);
  const field = density === 'field';
  const glyph = iconName ? <Icon name={iconName} size={field ? 20 : 18} /> : null;

  const btn = (
    <button
      type="button"
      disabled={disabled}
      onMouseEnter={() => setHot(true)}
      onMouseLeave={() => setHot(false)}
      title={disabled && blockedReason ? blockedReason : rest.title}
      style={{
        minHeight: field ? 'var(--target-field)' : 'var(--target-office)',
        width: fullWidth ? '100%' : undefined,
        padding: field ? '0 22px' : '0 18px',
        borderRadius: 'var(--radius)',
        font: field ? '700 16.5px var(--font-body)' : '600 15px var(--font-body)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        transition: 'background var(--motion-fast), transform var(--motion-fast)',
        transform: hot && !disabled ? 'translateY(-1px)' : 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        ...VARIANTS[variant],
        ...(hot && !disabled ? { background: HOVER[variant] } : null),
        ...(disabled
          ? { background: 'var(--bg-sunken)', color: 'var(--color-ink-subtle)', border: '1px solid var(--color-line)' }
          : null),
        ...style,
      }}
      {...rest}
    >
      {!iconAfter ? glyph : null}
      {children}
      {iconAfter ? glyph : null}
    </button>
  );

  if (!disabled || !blockedReason) return btn;

  return (
    <span
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        gap: 7,
        alignItems: fullWidth ? 'stretch' : 'flex-start',
      }}
    >
      {btn}
      <span style={{ font: 'var(--text-small)', color: 'var(--color-attention)', maxWidth: '46ch' }}>
        {blockedReason}
      </span>
    </span>
  );
}
