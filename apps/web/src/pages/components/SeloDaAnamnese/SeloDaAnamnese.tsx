import type { CSSProperties } from 'react';
import { StatusBadge } from '@/ds';
import { TEXTO_DA_ANAMNESE, TOM_DA_ANAMNESE } from './constantes';
import type { EstadoDaAnamnese } from './tipos';

export interface SeloDaAnamneseProps {
  estado: EstadoDaAnamnese;
  style?: CSSProperties;
}

export function SeloDaAnamnese({ estado, style }: SeloDaAnamneseProps) {
  return (
    <StatusBadge tone={TOM_DA_ANAMNESE[estado]} style={style}>
      {TEXTO_DA_ANAMNESE[estado]}
    </StatusBadge>
  );
}
