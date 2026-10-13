import { z } from 'zod';

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
