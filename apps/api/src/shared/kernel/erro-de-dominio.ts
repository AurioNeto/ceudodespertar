import type { CodigoDeErro } from '@cdd/contracts';

export interface ErroDeDominio {
  readonly codigo: CodigoDeErro;
  readonly detalhes?: Record<string, unknown>;
}

export function erroDeDominio(codigo: CodigoDeErro, detalhes?: Record<string, unknown>): ErroDeDominio {
  return detalhes === undefined ? { codigo } : { codigo, detalhes };
}

export class ErroDeDominioException extends Error {
  readonly erroDeDominio: ErroDeDominio;

  constructor(erro: ErroDeDominio) {
    super(erro.codigo);
    this.name = 'ErroDeDominioException';
    this.erroDeDominio = erro;
  }
}
