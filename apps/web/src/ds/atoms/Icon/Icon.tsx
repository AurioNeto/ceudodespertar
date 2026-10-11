import type { CSSProperties } from 'react';
import { REGISTRY } from './registro';

export type IconName = keyof typeof REGISTRY;

export interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  style?: CSSProperties;
  className?: string;
}

export function Icon({ name, size = 18, color = 'currentColor', style, className }: IconProps) {
  const Glyph = REGISTRY[name];
  return (
    <Glyph
      aria-hidden="true"
      size={size}
      color={color}
      strokeWidth={2}
      className={className}
      style={{ flex: '0 0 auto', ...style }}
    />
  );
}
