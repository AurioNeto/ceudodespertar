import { lerValorDigitado } from '@/lib/numero';

const LITROS_COM_ATE_DUAS_CASAS = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 });

export const litros = (n: number) => `${LITROS_COM_ATE_DUAS_CASAS.format(n)} L`;

const MAIS_DE_DUAS_CASAS = /,\d{3,}$/;

export const MENSAGEM_DE_LITROS_COM_MAIS_DE_DUAS_CASAS = 'Use no máximo duas casas decimais nos litros (ex.: 0,25).';

export const temMaisDeDuasCasas = (texto: string) => MAIS_DE_DUAS_CASAS.test(texto.trim());

export const lerLitros = (texto: string): number => lerValorDigitado(texto) || 0;
