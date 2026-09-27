import type { CodigoDeErro } from '@cdd/contracts';

export interface ErroDeDominio {
  readonly codigo: CodigoDeErro;
  readonly detalhes?: Record<string, unknown>;
}

export function erroDeDominio(codigo: CodigoDeErro, detalhes?: Record<string, unknown>): ErroDeDominio {
  return detalhes === undefined ? { codigo } : { codigo, detalhes };
}
