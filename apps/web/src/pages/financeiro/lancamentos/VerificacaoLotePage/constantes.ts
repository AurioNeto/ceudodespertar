import type { OrigemCaptura } from '@cdd/contracts';

export const ORIGENS = {
  COMPROVANTE: { label: 'Foto de comprovante', icone: 'camera' },
  EXTRATO: { label: 'Extrato bancário', icone: 'file-spreadsheet' },
  REGISTRO_RAPIDO: { label: 'Registro rápido', icone: 'user-round' },
} as const;

export const CONFIANCA = {
  ALTA: { texto: 'Alta confiança', tone: 'confirmed' },
  MEDIA: { texto: 'Média confiança', tone: 'suggest' },
  BAIXA: { texto: 'Baixa confiança', tone: 'pending' },
} as const;

export type FiltroOrigem = OrigemCaptura | 'TODAS';

export const FILTROS: readonly { valor: FiltroOrigem; label: string }[] = [
  { valor: 'TODAS', label: 'Todas' },
  { valor: 'COMPROVANTE', label: 'Comprovantes' },
  { valor: 'EXTRATO', label: 'Extrato' },
  { valor: 'REGISTRO_RAPIDO', label: 'Registro rápido' },
];
