import { afterEach, describe, expect, it } from 'vitest';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { RetornoPage } from './RetornoPage';
import {
  criarEntradaFalsa,
  criarEu,
  ler,
  montarComSessao,
} from '@/testes/sessaoDeTeste';
import type { TelaMontada } from '@/testes/sessaoDeTeste';

let tela: TelaMontada | null = null;

afterEach(async () => {
  await tela?.desmontar();
  tela = null;
});

describe('RetornoPage', () => {
  async function concluirNoRetorno(destino: string) {
    const entrada = criarEntradaFalsa(false);
    entrada.concluirEntrada.mockResolvedValue(destino);
    const roteador = createMemoryRouter(
      [
        { path: '/entrar/retorno', element: <RetornoPage /> },
        { path: '/lancamentos', element: <p data-testid="destino">lancamentos</p> },
      ],
      { initialEntries: ['/entrar/retorno?code=abc&state=xyz'] },
    );
    tela = await montarComSessao(
      { entrada, buscarEu: () => Promise.resolve(criarEu()) },
      <RouterProvider router={roteador} />,
    );
    return roteador;
  }

  it('leva ao destino substituindo a entrada do retorno, para o code não ficar no histórico', async () => {
    const roteador = await concluirNoRetorno('/lancamentos');

    expect(ler(tela, 'destino')).toBe('lancamentos');
    expect(roteador.state.historyAction).toBe('REPLACE');
    expect(roteador.state.location.search).toBe('');
  });
});
