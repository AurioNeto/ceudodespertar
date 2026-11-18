import type { Permissao } from '@cdd/contracts';
import type { ReactElement } from 'react';
import { vi } from 'vitest';
import { ClienteHttpProvider } from '@/app/providers';
import { criarClienteHttp } from '@/dados';
import { criarEntradaFalsa, criarEu, montarComSessao } from './sessaoDeTeste';

export async function montarCadastro(
  pagina: ReactElement,
  permissoes: Permissao[],
  responder: (caminho: string, requisicao?: RequestInit) => Response,
) {
  const fetch = vi.fn<typeof globalThis.fetch>(async (entrada, requisicao) => responder(String(entrada), requisicao));
  const cliente = criarClienteHttp({
    fetch,
    credencial: { tokenAtual: async () => 'token', renovar: async () => 'indisponivel', aoSessaoEncerrada() {} },
  });
  const tela = await montarComSessao({
    entrada: criarEntradaFalsa(true),
    buscarEu: async () => criarEu({ permissoes }),
  }, <ClienteHttpProvider cliente={cliente}>{pagina}</ClienteHttpProvider>);
  return { ...tela, fetch };
}
