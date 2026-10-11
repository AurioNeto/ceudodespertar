import { afterEach, describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import type { Eu } from '@cdd/contracts';
import { criarEntradaFalsa, criarEu, ler, montarComSessao } from '@/testes/sessaoDeTeste';
import type { TelaMontada } from '@/testes/sessaoDeTeste';
import { erroDaApi as erroDoEu } from '@/testes/fabricas';
import { ExigeSessao } from './ExigeSessao';

let tela: TelaMontada | null = null;

afterEach(async () => {
  await tela?.desmontar();
  tela = null;
});

describe('ExigeSessao', () => {
  function DestinoDaEntrada() {
    const { state } = useLocation() as { state: { de?: string } | null };
    return <p data-testid="de">{state?.de ?? 'sem-destino'}</p>;
  }

  function Rotas() {
    return (
      <MemoryRouter initialEntries={['/lancamentos?pagina=2']}>
        <Routes>
          <Route path="/entrar" element={<DestinoDaEntrada />} />
          <Route
            path="/lancamentos"
            element={
              <ExigeSessao>
                <p data-testid="protegida">conteúdo protegido</p>
              </ExigeSessao>
            }
          />
        </Routes>
      </MemoryRouter>
    );
  }

  it('sem sessão manda para a entrada guardando o caminho e a consulta originais', async () => {
    tela = await montarComSessao({ entrada: criarEntradaFalsa(false), buscarEu: () => Promise.resolve(criarEu()) }, <Rotas />);

    expect(ler(tela, 'de')).toBe('/lancamentos?pagina=2');
    expect(ler(tela, 'protegida')).toBeUndefined();
  });

  it('com recusa do /eu também manda para a entrada guardando o destino', async () => {
    tela = await montarComSessao(
      { entrada: criarEntradaFalsa(true), buscarEu: () => Promise.reject(erroDoEu(401, 'USUARIO_SUSPENSO')) },
      <Rotas />,
    );

    expect(ler(tela, 'de')).toBe('/lancamentos?pagina=2');
  });

  it('com sessão ativa mostra a tela protegida', async () => {
    tela = await montarComSessao({ entrada: criarEntradaFalsa(true), buscarEu: () => Promise.resolve(criarEu()) }, <Rotas />);

    expect(ler(tela, 'protegida')).toBe('conteúdo protegido');
    expect(ler(tela, 'de')).toBeUndefined();
  });

  it('enquanto verifica o acesso não redireciona nem mostra a tela protegida', async () => {
    tela = await montarComSessao({ entrada: criarEntradaFalsa(true), buscarEu: () => new Promise<Eu>(() => undefined) }, <Rotas />);

    expect(ler(tela, 'de')).toBeUndefined();
    expect(ler(tela, 'protegida')).toBeUndefined();
    expect(tela.texto()).toContain('Verificando seu acesso');
  });
});
