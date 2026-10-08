import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { TEXTO_DA_FAIXA_DE_DEMONSTRACAO } from '../ds';
import { Layout } from './Layout';
import { ROTAS, type RotaId } from './navegacao';
import { TELAS, type RegistroDeTelas } from './telas';
import { criarEntradaFalsa, criarEu, montarComSessao, type TelaMontada } from './apoioDeTeste';

const ROTAS_DO_SHELL = Object.entries(ROTAS) as [RotaId, string][];

const todasComFonte = (fonte: 'mock' | 'api'): RegistroDeTelas =>
  Object.fromEntries(ROTAS_DO_SHELL.map(([id]) => [id, { fonte }])) as RegistroDeTelas;

const telasComUmaApi = (id: RotaId): RegistroDeTelas => ({ ...todasComFonte('mock'), [id]: { fonte: 'api' } });

const telaAtiva: TelaMontada[] = [];

async function montarLayoutEm(caminho: string, telas: RegistroDeTelas): Promise<TelaMontada> {
  const tela = await montarComSessao(
    { entrada: criarEntradaFalsa(true), buscarEu: () => Promise.resolve(criarEu()) },
    <MemoryRouter initialEntries={[caminho]}>
      <Routes>
        <Route element={<Layout telas={telas} />}>
          <Route path="*" element={<p>conteudo-da-tela</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
  telaAtiva.push(tela);
  return tela;
}

const faixas = (tela: TelaMontada) => tela.container.querySelectorAll('[role="note"]');

afterEach(async () => {
  vi.unstubAllEnvs();
  for (const tela of telaAtiva.splice(0)) await tela.desmontar();
});

describe('faixa de demonstração no Layout', () => {
  it('o registro cobre exatamente as rotas do shell', () => {
    expect(Object.keys(TELAS).sort()).toEqual(Object.keys(ROTAS).sort());
  });

  it.each(ROTAS_DO_SHELL)('tela %s: faixa conforme a fonte registrada', async (id, caminho) => {
    const fonteReal = TELAS[id].fonte;

    const real = await montarLayoutEm(caminho, TELAS);
    expect(faixas(real).length).toBe(fonteReal === 'mock' ? 1 : 0);
    expect(real.texto()).toContain('conteudo-da-tela');

    const simuladaComoApi = await montarLayoutEm(caminho, telasComUmaApi(id));
    expect(faixas(simuladaComoApi).length).toBe(0);

    const simuladaComoMock = await montarLayoutEm(caminho, todasComFonte('mock'));
    expect(faixas(simuladaComoMock).length).toBe(1);
  });

  it('tela api não leva faixa nem em outra rota com fonte mock', async () => {
    const telas = telasComUmaApi('perfil');
    expect(faixas(await montarLayoutEm(ROTAS.perfil, telas)).length).toBe(0);
    expect(faixas(await montarLayoutEm(ROTAS.painel, telas)).length).toBe(1);
  });

  it.each(ROTAS_DO_SHELL)('com a sessão de demonstração, %s mostra a faixa mesmo sendo api', async (_id, caminho) => {
    vi.stubEnv('DEV', true);
    vi.stubEnv('VITE_SESSAO_DE_DEMONSTRACAO', '1');
    const tela = await montarLayoutEm(caminho, todasComFonte('api'));
    expect(faixas(tela).length).toBe(1);
  });

  it('sem DEV a flag da demonstração não liga a faixa', async () => {
    vi.stubEnv('DEV', false);
    vi.stubEnv('VITE_SESSAO_DE_DEMONSTRACAO', '1');
    const tela = await montarLayoutEm(ROTAS.perfil, todasComFonte('api'));
    expect(faixas(tela).length).toBe(0);
  });

  it('a faixa é uma nota com o texto exato', async () => {
    const tela = await montarLayoutEm(ROTAS.painel, TELAS);
    const faixa = tela.container.querySelector('[role="note"]');
    expect(faixa?.textContent).toBe(
      'Dados de demonstração. Esta tela ainda não está ligada ao sistema: o que aparece aqui é exemplo e nada é gravado.',
    );
    expect(TEXTO_DA_FAIXA_DE_DEMONSTRACAO).toBe(faixa?.textContent);
  });
});
