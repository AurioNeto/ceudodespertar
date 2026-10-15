import { erroDeDominio } from '../../../shared/kernel/erro-de-dominio.js';
import type { ErroDeDominio } from '../../../shared/kernel/erro-de-dominio.js';
import { detalhesDeCorpoInvalido } from '../../../shared/kernel/problemas-de-validacao.js';

export function formaInvalida(caminho: string, regra: string): ErroDeDominio {
  return erroDeDominio('CORPO_INVALIDO', detalhesDeCorpoInvalido([{ caminho, regra }]));
}
