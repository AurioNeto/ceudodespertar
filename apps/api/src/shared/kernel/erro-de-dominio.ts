import { CODIGOS_DE_ERRO } from '@cdd/contracts';
import type { CodigoDeErro } from '@cdd/contracts';

export const CHAVE_DE_ESPERA_EM_SEGUNDOS = 'retryAfterSegundos';

export interface ErroDeDominio {
  readonly codigo: CodigoDeErro;
  readonly detalhes?: Record<string, unknown>;
}

export function erroDeDominio(codigo: CodigoDeErro, detalhes?: Record<string, unknown>): ErroDeDominio {
  return detalhes === undefined ? { codigo } : { codigo, detalhes };
}

export function ehErroDeDominio(valor: unknown): valor is ErroDeDominio {
  const codigo = (valor as { codigo?: unknown } | null)?.codigo;
  return typeof valor === 'object' && CODIGOS_DE_ERRO.some((conhecido) => conhecido === codigo);
}

export class ErroDeDominioException extends Error {
  readonly erroDeDominio: ErroDeDominio;

  constructor(erro: ErroDeDominio) {
    super(erro.codigo);
    this.name = 'ErroDeDominioException';
    this.erroDeDominio = erro;
  }
}
