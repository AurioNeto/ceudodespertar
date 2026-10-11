import { lerValorDigitado } from '@/lib/numero';

const LITROS_COM_ATE_DUAS_CASAS = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 });

export const litros = (n: number) => `${LITROS_COM_ATE_DUAS_CASAS.format(n)} L`;

export const lerLitros = (texto: string): number => +(lerValorDigitado(texto) || 0).toFixed(2);
