import { afterEach, describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { EntrarPage } from './EntrarPage';
import { MENSAGENS_DE_RECUSA } from './constantes';
import {
  criarEntradaFalsa,
  criarEu,
  ler,
  montarComSessao,
} from '@/testes/sessaoDeTeste';
import type { TelaMontada } from '@/testes/sessaoDeTeste';
import { erroDaApi as erroDoEu } from '@/testes/fabricas';

let tela: TelaMontada | null = null;

afterEach(async () => {
  await tela?.desmontar();
  tela = null;
});

describe('EntrarPage', () => {
  function Entrada({ aberta = '/entrar' }: { aberta?: string }) {
    return (
      <MemoryRouter initialEntries={[{ pathname: aberta, state: { de: '/faturas' } }]}>
        <Routes>
          <Route path="/entrar" element={<EntrarPage />} />
          <Route path="/faturas" element={<p data-testid="destino">faturas</p>} />
        </Routes>
      </MemoryRouter>
    );
  }

  it('sem sessão mostra o botão Entrar e o aciona com o destino original', async () => {
    const entrada = criarEntradaFalsa(false);
    tela = await montarComSessao({ entrada, buscarEu: () => Promise.resolve(criarEu()) }, <Entrada />);

    await tela.clicar('Entrar');

    expect(entrada.iniciarEntrada).toHaveBeenCalledWith('/faturas');
  });

  it('mostra erro acionável quando o login não abre', async () => {
    const entrada = criarEntradaFalsa(false);
    entrada.iniciarEntrada.mockRejectedValue(new Error('keycloak fora'));
    tela = await montarComSessao({ entrada, buscarEu: () => Promise.resolve(criarEu()) }, <Entrada />);

    await tela.clicar('Entrar');

    expect(tela.texto()).toContain('Não conseguimos abrir o login');
    expect(tela.container.querySelector('button')?.hasAttribute('disabled')).toBe(false);
  });

  it.each([
    ['USUARIO_CONVITE_PENDENTE'],
    ['USUARIO_SUSPENSO'],
    ['USUARIO_REVOGADO'],
    ['USUARIO_DESCONHECIDO'],
  ] as const)('mostra a mensagem própria de %s e só ela', async (codigo) => {
    tela = await montarComSessao(
      { entrada: criarEntradaFalsa(true), buscarEu: () => Promise.reject(erroDoEu(401, codigo)) },
      <Entrada />,
    );

    const proprias = MENSAGENS_DE_RECUSA[codigo];
    expect(tela.texto()).toContain(proprias.titulo);
    expect(tela.texto()).toContain(proprias.corpo);
    const alheias = Object.entries(MENSAGENS_DE_RECUSA).filter(([outro]) => outro !== codigo);
    for (const [, alheia] of alheias) expect(tela.texto()).not.toContain(alheia.titulo);
    expect(tela.texto()).toContain('Sair e usar outra conta');
    expect(tela.texto()).not.toContain('Tentar de novo');
  });

  it('as quatro recusas têm títulos diferentes entre si', () => {
    const titulos = Object.values(MENSAGENS_DE_RECUSA).map((m) => m.titulo);
    expect(new Set(titulos).size).toBe(4);
  });

  it('no 503 mostra acesso indisponível, oferece tentar de novo e não oferece sair', async () => {
    const entrada = criarEntradaFalsa(true);
    tela = await montarComSessao(
      { entrada, buscarEu: () => Promise.reject(erroDoEu(503, 'PROVEDOR_DE_IDENTIDADE_INDISPONIVEL')) },
      <Entrada />,
    );

    expect(tela.texto()).toContain('Acesso indisponível');
    expect(tela.texto()).toContain('Tente em instantes');
    expect(tela.texto()).toContain('Tentar de novo');
    expect(tela.texto()).not.toContain('Sair e usar outra conta');
    expect(entrada.sair).not.toHaveBeenCalled();
  });

  it('com sessão ativa segue para o destino guardado', async () => {
    tela = await montarComSessao({ entrada: criarEntradaFalsa(true), buscarEu: () => Promise.resolve(criarEu()) }, <Entrada />);

    expect(ler(tela, 'destino')).toBe('faturas');
  });

  it('a recusa deixa sair para entrar com outra conta', async () => {
    const entrada = criarEntradaFalsa(true);
    tela = await montarComSessao(
      { entrada, buscarEu: () => Promise.reject(erroDoEu(401, 'USUARIO_DESCONHECIDO')) },
      <Entrada />,
    );

    await tela.clicar('Sair e usar outra conta');

    expect(entrada.sair).toHaveBeenCalledTimes(1);
  });
});
