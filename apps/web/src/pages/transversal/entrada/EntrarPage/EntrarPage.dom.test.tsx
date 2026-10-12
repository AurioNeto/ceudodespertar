import { afterEach, describe, expect, it } from 'vitest';
import { MemoryRouter, Route, RouterProvider, Routes, createMemoryRouter } from 'react-router-dom';
import { EntrarPage } from './EntrarPage';
import { MENSAGENS_DE_CONVITE_RECUSADO, MENSAGENS_DE_RECUSA, MENSAGEM_DE_CONVITE_RECEBIDO } from './constantes';
import {
  criarEntradaFalsa,
  criarEu,
  ler,
  montarComSessao,
} from '@/testes/sessaoDeTeste';
import type { CenarioDeSessao, TelaMontada } from '@/testes/sessaoDeTeste';
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

describe('EntrarPage com convite na URL', () => {
  const URL_DO_CONVITE = '/entrar?convite=token-do-convite&code=codigo-do-keycloak&state=estado-do-keycloak';

  async function chegarComConvite(cenario: CenarioDeSessao, url = URL_DO_CONVITE) {
    const roteador = createMemoryRouter(
      [
        { path: '/entrar', element: <EntrarPage /> },
        { path: '/', element: <p data-testid="destino">painel</p> },
      ],
      { initialEntries: [url] },
    );
    tela = await montarComSessao(cenario, <RouterProvider router={roteador} />);
    return roteador;
  }

  it('guarda o convite, tira da URL o token, o code e o state e convida a entrar', async () => {
    const convites: string[] = [];
    const entrada = criarEntradaFalsa(false);
    const roteador = await chegarComConvite({
      entrada,
      buscarEu: () => Promise.resolve(criarEu()),
      guardarConvite: (convite) => convites.push(convite),
    });

    expect(convites).toEqual(['token-do-convite']);
    expect(roteador.state.location.search).toBe('');
    expect(roteador.state.historyAction).toBe('REPLACE');
    expect(tela?.texto()).toContain(MENSAGEM_DE_CONVITE_RECEBIDO.titulo);
    expect(entrada.iniciarEntrada).not.toHaveBeenCalled();

    await tela?.clicar('Entrar');

    expect(entrada.iniciarEntrada).toHaveBeenCalledTimes(1);
  });

  it('com sessão já aberta, refaz a busca do acesso depois de guardar o convite e segue ativo', async () => {
    let guardado: string | null = null;
    await chegarComConvite({
      entrada: criarEntradaFalsa(true),
      guardarConvite: (convite) => {
        guardado = convite;
      },
      buscarEu: () =>
        guardado ? Promise.resolve(criarEu()) : Promise.reject(erroDoEu(401, 'USUARIO_CONVITE_PENDENTE')),
    });

    expect(ler(tela, 'destino')).toBe('painel');
  });

  it('parâmetro de convite vazio não guarda nada, mas limpa a URL', async () => {
    const convites: string[] = [];
    const roteador = await chegarComConvite(
      {
        entrada: criarEntradaFalsa(false),
        buscarEu: () => Promise.resolve(criarEu()),
        guardarConvite: (convite) => convites.push(convite),
      },
      '/entrar?convite=',
    );

    expect(convites).toEqual([]);
    expect(roteador.state.location.search).toBe('');
    expect(tela?.texto()).not.toContain(MENSAGEM_DE_CONVITE_RECEBIDO.titulo);
  });

  it.each([
    ['CONVITE_INVALIDO', 400],
    ['CONVITE_EXPIRADO', 410],
    ['CONVITE_JA_USADO', 409],
    ['SUJEITO_JA_VINCULADO', 409],
    ['CONVITE_DE_OUTRO_SUJEITO', 403],
  ] as const)('mostra a mensagem própria de %s, deixa continuar ou sair e não oferece tentar de novo', async (codigo, status) => {
    await chegarComConvite({
      entrada: criarEntradaFalsa(true),
      buscarEu: () => Promise.reject(erroDoEu(status, codigo)),
    });

    const propria = MENSAGENS_DE_CONVITE_RECUSADO[codigo];
    expect(tela?.texto()).toContain(propria.titulo);
    expect(tela?.texto()).toContain(propria.corpo);
    const alheias = Object.entries(MENSAGENS_DE_CONVITE_RECUSADO).filter(([outro]) => outro !== codigo);
    for (const [, alheia] of alheias) expect(tela?.texto()).not.toContain(alheia.titulo);
    expect(tela?.texto()).toContain('Continuar');
    expect(tela?.texto()).toContain('Sair e usar outra conta');
    expect(tela?.texto()).not.toContain('Tentar de novo');
  });

  it('continuar depois de um convite recusado busca o acesso de novo e segue se ele já está ativo', async () => {
    let tentativas = 0;
    await chegarComConvite({
      entrada: criarEntradaFalsa(true),
      buscarEu: () => {
        tentativas += 1;
        return tentativas === 1 ? Promise.reject(erroDoEu(409, 'CONVITE_JA_USADO')) : Promise.resolve(criarEu());
      },
    });

    await tela?.clicar('Continuar');

    expect(ler(tela, 'destino')).toBe('painel');
  });

  it('as recusas do convite têm títulos diferentes entre si e das recusas de acesso', () => {
    const titulos = [...Object.values(MENSAGENS_DE_CONVITE_RECUSADO), ...Object.values(MENSAGENS_DE_RECUSA)].map(
      (m) => m.titulo,
    );
    expect(new Set(titulos).size).toBe(titulos.length);
  });

  it.each([['USUARIO_SUSPENSO'], ['USUARIO_REVOGADO']] as const)(
    '%s na ativação mostra a recusa própria e não volta ao login',
    async (codigo) => {
      const entrada = criarEntradaFalsa(true);
      await chegarComConvite({ entrada, buscarEu: () => Promise.reject(erroDoEu(401, codigo)) });

      expect(tela?.texto()).toContain(MENSAGENS_DE_RECUSA[codigo].titulo);
      expect(tela?.texto()).not.toContain('Indo para o login');
      expect(tela?.container.querySelector('button')?.textContent).not.toBe('Entrar');
      expect(entrada.iniciarEntrada).not.toHaveBeenCalled();
    },
  );
});
