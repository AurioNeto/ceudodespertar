import { QueryClient } from '@tanstack/react-query';
import { ErroDaApi, ErroDeRede } from './erros';

export const JANELA_DE_FRESCOR_EM_MS = 30_000;
export const TENTATIVAS_EXTRAS_EM_FALHA_TEMPORARIA = 2;
const ESPERA_BASE_EM_MS = 500;
const ESPERA_MAXIMA_EM_MS = 4_000;

export function ehFalhaTemporaria(erro: unknown): boolean {
  if (erro instanceof ErroDeRede) return true;
  return erro instanceof ErroDaApi && erro.ehIndisponibilidadeTemporaria;
}

export function deveTentarDeNovo(tentativasFeitas: number, erro: unknown): boolean {
  return tentativasFeitas < TENTATIVAS_EXTRAS_EM_FALHA_TEMPORARIA && ehFalhaTemporaria(erro);
}

export function esperaAntesDeTentarDeNovo(tentativasFeitas: number): number {
  return Math.min(ESPERA_BASE_EM_MS * 2 ** tentativasFeitas, ESPERA_MAXIMA_EM_MS);
}

export function criarClienteDeConsultas(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: JANELA_DE_FRESCOR_EM_MS,
        refetchOnWindowFocus: false,
        retry: deveTentarDeNovo,
        retryDelay: esperaAntesDeTentarDeNovo,
      },
      mutations: {
        retry: false,
      },
    },
  });
}
