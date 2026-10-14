import { z } from 'zod';
import type { Competencia, DataLocal, Dinheiro } from './kernel.js';

const CARACTERE_NULO = '\u0000';

export function textoSemCaractereNulo() {
  return z.string().refine((valor) => !valor.includes(CARACTERE_NULO), {
    message: 'não pode conter o caractere NUL',
    params: { regra: 'sem_caractere_nulo' },
  });
}

export function uuidEmMinusculas<Id extends string>() {
  return z.uuid().transform((valor) => valor.toLowerCase() as Id);
}

const FORMATO_DE_DATA_LOCAL = /^(\d{4})-(\d{2})-(\d{2})$/;
export const MAXIMO_DE_DINHEIRO_EM_CENTAVOS = 100_000_000_000_000;
const FORMATO_DE_COMPETENCIA = /^\d{4}-(0[1-9]|1[0-2])$/;

function ehDataDoCalendario(valor: string): boolean {
  const partes = FORMATO_DE_DATA_LOCAL.exec(valor);
  if (partes === null) return false;
  const [, ano, mes, dia] = partes.map(Number) as [number, number, number, number];
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  return data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia;
}

export function dinheiroPositivo() {
  return z
    .number()
    .int()
    .positive()
    .max(MAXIMO_DE_DINHEIRO_EM_CENTAVOS)
    .transform((centavos) => centavos as Dinheiro);
}

export function dataLocalValida() {
  return z
    .string()
    .refine(ehDataDoCalendario, { message: 'data deve existir no calendário, em AAAA-MM-DD', params: { regra: 'formato' } })
    .transform((valor) => valor as DataLocal);
}

export function competenciaValida() {
  return z
    .string()
    .regex(FORMATO_DE_COMPETENCIA)
    .transform((valor) => valor as Competencia);
}
