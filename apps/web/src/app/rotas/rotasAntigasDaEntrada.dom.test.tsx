import { afterEach, describe, expect, it } from 'vitest';
import { RouterProvider, createMemoryRouter } from 'react-router-dom';
import { criarEntradaFalsa, criarEu, ler, montarComSessao } from '@/testes/sessaoDeTeste';
import type { TelaMontada } from '@/testes/sessaoDeTeste';
import { ROTAS_ANTIGAS_DA_ENTRADA } from './rotas';
import { rotasAntigasDaEntrada } from './rotasAntigasDaEntrada';

let tela: TelaMontada | null = null;

afterEach(async () => {
  await tela?.desmontar();
  tela = null;
});

describe('rotas antigas da entrada', () => {
  it('são as três de antes do login por OIDC', () => {
    expect(ROTAS_ANTIGAS_DA_ENTRADA).toEqual(['/esqueci-a-senha', '/redefinir-senha', '/convite']);
  });

  it.each(ROTAS_ANTIGAS_DA_ENTRADA)('%s redireciona para /entrar', async (caminho) => {
    const roteador = createMemoryRouter(
      [...rotasAntigasDaEntrada, { path: '/entrar', element: <p data-testid="entrar">entrar</p> }],
      { initialEntries: [caminho] },
    );
    tela = await montarComSessao(
      { entrada: criarEntradaFalsa(false), buscarEu: () => Promise.resolve(criarEu()) },
      <RouterProvider router={roteador} />,
    );

    expect(ler(tela, 'entrar')).toBe('entrar');
    expect(roteador.state.location.pathname).toBe('/entrar');
    expect(roteador.state.historyAction).toBe('REPLACE');
  });
});
