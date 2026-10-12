import type { CSSProperties, ReactNode } from 'react';
import { rotuloVersalete } from '../../fundacao/estilos';

export function Rotulo({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <span style={{ ...rotuloVersalete, ...style }}>{children}</span>;
}
