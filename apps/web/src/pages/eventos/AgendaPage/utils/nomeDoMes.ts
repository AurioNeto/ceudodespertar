import { MESES } from '@/pages/utils/formato';

export const nomeDoMes = (mesZeroBase: number): string => MESES[mesZeroBase] ?? '';
