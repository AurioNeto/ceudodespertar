import type { CodigoDeErro } from '@cdd/contracts';

export const CODIGOS_DE_GUARDA_MINIMA: readonly CodigoDeErro[] = [
  'LANCAMENTO_IMUTAVEL',
  'TRANSFERENCIA_IMUTAVEL',
  'FEITIO_IMUTAVEL',
  'REGISTRO_IMUTAVEL',
];

const CONJUNTO_DE_GUARDAS_MINIMAS: ReadonlySet<string> = new Set(CODIGOS_DE_GUARDA_MINIMA);

const SEPARADOR_DO_PREFIXO = ':';

export function codigoDaGuardaMinima(mensagem: string): CodigoDeErro | undefined {
  const prefixo = mensagem.split(SEPARADOR_DO_PREFIXO)[0]?.trim();
  return prefixo !== undefined && CONJUNTO_DE_GUARDAS_MINIMAS.has(prefixo) ? (prefixo as CodigoDeErro) : undefined;
}
