import { useState } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { Density } from '../../fundacao/densidade';
import { fundoComVidro } from '../../fundacao/estilos';
import { Icon, type IconName } from '../Icon';
import { HOVER, VARIANTS } from './constantes';

export type ButtonVariant = 'primary' | 'ghost' | 'quiet' | 'suggest' | 'onChrome';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  children?: ReactNode;
  variant?: ButtonVariant;
  density?: Density;
  fullWidth?: boolean;
  iconName?: IconName;
  iconAfter?: boolean;
  /** Motivo exibido abaixo do botão quando ele está bloqueado. */
  blockedReason?: string;
  blockedReasonId?: string;
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
  blockedReasonId,
  style,
  ...rest
}: ButtonProps) {
  const [hot, setHot] = useState(false);
  const field = density === 'field';
  const glyph = iconName ? <Icon name={iconName} size={field ? 20 : 18} /> : null;
  const fundoDoBotao = disabled ? 'var(--bg-sunken)' : hot ? HOVER[variant] : VARIANTS[variant].background;

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
        borderRadius: 'var(--leaf-md)',
        font: field ? '700 16.5px var(--font-body)' : '600 15px var(--font-body)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        transition: 'background var(--motion-fast), transform var(--motion-fast)',
        transform: hot && !disabled ? 'translateY(-1px)' : 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        ...VARIANTS[variant],
        ...(disabled ? { color: 'var(--color-ink-subtle)', border: '1px solid var(--color-line)' } : null),
        ...fundoComVidro(fundoDoBotao),
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
      <span
        id={blockedReasonId}
        style={{ font: 'var(--text-small)', color: 'var(--color-attention)', maxWidth: '46ch' }}
      >
        {blockedReason}
      </span>
    </span>
  );
}
