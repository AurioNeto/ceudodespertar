import type { ButtonHTMLAttributes } from 'react';
import { Icon, type IconName } from '../Icon';

type AtributosDoBotao = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'type' | 'aria-label' | 'title'>;

type NomeDoBotao = { 'aria-label': string; title?: string } | { 'aria-label'?: undefined; title: string };

export type BotaoDeIconeProps = AtributosDoBotao &
  NomeDoBotao & {
    icone: IconName;
    tamanhoDoIcone?: number;
    medida?: number | string;
  };

export function BotaoDeIcone({ icone, tamanhoDoIcone = 18, medida = 'var(--tap-min)', style, ...rest }: BotaoDeIconeProps) {
  return (
    <button
      type="button"
      {...rest}
      style={{
        display: 'inline-grid',
        placeItems: 'center',
        minWidth: medida,
        minHeight: medida,
        borderRadius: 'var(--radius-sm)',
        color: 'var(--text-meta)',
        cursor: 'pointer',
        ...style,
      }}
    >
      <Icon name={icone} size={tamanhoDoIcone} />
    </button>
  );
}
