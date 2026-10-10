import type { CSSProperties, ReactNode } from 'react';
import { rotuloCaixaAlta } from '../../fundacao/estilos';

export function Rotulo({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <span style={{ ...rotuloCaixaAlta, ...style }}>{children}</span>;
}
