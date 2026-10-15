import type { ErroDeDominio } from '../../../../shared/kernel/erro-de-dominio.js';
import type { Result } from '../../../../shared/kernel/result.js';

export interface RespostaComCabecalhos {
  setHeader(nome: string, valor: string): void;
}

export function informarLocalizacaoDoCriado<T extends { readonly id: string }>(
  resposta: RespostaComCabecalhos,
  rotaDaColecao: string,
  criado: Result<T, ErroDeDominio>,
): Result<T, ErroDeDominio> {
  if (criado.tipo === 'ok') resposta.setHeader('Location', `${rotaDaColecao}/${criado.valor.id}`);
  return criado;
}
