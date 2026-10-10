import { CHAVE_DE_ESPERA_EM_SEGUNDOS } from '../../kernel/erro-de-dominio.js';

export const CABECALHO_RETRY_AFTER = 'Retry-After';
const STATUS_MUITAS_REQUISICOES = 429;

export function segundosDeEspera(status: number, detalhes: Record<string, unknown> | undefined): number | undefined {
  if (status !== STATUS_MUITAS_REQUISICOES) return undefined;
  const segundos = detalhes?.[CHAVE_DE_ESPERA_EM_SEGUNDOS];
  return typeof segundos === 'number' && Number.isSafeInteger(segundos) && segundos >= 1 ? segundos : undefined;
}
