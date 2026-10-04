import { afterEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import type { Eu } from '@cdd/contracts';
import { EntrarPage } from '../pages/entrada/EntrarPage';
import { MENSAGENS_DE_RECUSA } from '../pages/entrada/mensagens';
import {
  PERMISSAO_QUE_O_EU_NAO_TEM,
  PERMISSAO_QUE_O_EU_TEM,
  assentar,
  criarAvisoDeEncerramentoFalso,
  criarEntradaFalsa,
  criarEu,
  erroDoEu,
  montarComSessao,
} from './apoioDeTeste';
import type { TelaMontada } from './apoioDeTeste';
import { CHAVE_DO_EU, ExigeSessao, useSessao } from './sessao';

let tela: TelaMontada | null = null;

afterEach(async () => {
  await tela?.desmontar();
  tela = null;
});

function Sonda() {
  const { estado, usuario, pode } = useSessao();
  return (
    <ul>
      <li data-testid="estado">{estado.tipo}</li>
      <li data-testid="grupo">{usuario?.grupoNome ?? 'nenhum'}</li>
      <li data-testid="pode-registrar">{String(pode(PERMISSAO_QUE_O_EU_TEM))}</li>
      <li data-testid="pode-confirmar">{String(pode(PERMISSAO_QUE_O_EU_NAO_TEM))}</li>
    </ul>
  );
}

const ler = (id: string) => tela?.container.querySelector(`[data-testid="${id}"]`)?.textContent;

describe('SessaoProvider', () => {
  it('responde pode() a partir das permissões do /eu', async () => {
    tela = await montarComSessao({ entrada: criarEntradaFalsa(true), buscarEu: () => Promise.resolve(criarEu()) }, <Sonda />);

    expect(ler('estado')).toBe('ativa');
    expect(ler('pode-registrar')).toBe('true');
    expect(ler('pode-confirmar')).toBe('false');
  });

  it('muda o que pode() responde quando o /eu traz outras permissões', async () => {
    const eu: Eu = criarEu({ permissoes: [PERMISSAO_QUE_O_EU_NAO_TEM] });
    tela = await montarComSessao({ entrada: criarEntradaFalsa(true), buscarEu: () => Promise.resolve(eu) }, <Sonda />);

    expect(ler('pode-registrar')).toBe('false');
    expect(ler('pode-confirmar')).toBe('true');
  });

  it('expõe o nome do grupo vindo do /eu', async () => {
    tela = await montarComSessao({ entrada: criarEntradaFalsa(true), buscarEu: () => Promise.resolve(criarEu()) }, <Sonda />);
    expect(ler('grupo')).toBe('Tesouraria');
  });

  it('sem usuário OIDC não chama o /eu e nada é permitido', async () => {
    const buscarEu = vi.fn(() => Promise.resolve(criarEu()));
    tela = await montarComSessao({ entrada: criarEntradaFalsa(false), buscarEu }, <Sonda />);

    expect(ler('estado')).toBe('sem-sessao');
    expect(ler('pode-registrar')).toBe('false');
    expect(buscarEu).not.toHaveBeenCalled();
  });

  it('fica verificando enquanto o /eu não responde e nada é permitido', async () => {
    tela = await montarComSessao({ entrada: criarEntradaFalsa(true), buscarEu: () => new Promise<Eu>(() => undefined) }, <Sonda />);

    expect(ler('estado')).toBe('verificando');
    expect(ler('pode-registrar')).toBe('false');
  });

  it.each([
    ['USUARIO_CONVITE_PENDENTE'],
    ['USUARIO_SUSPENSO'],
    ['USUARIO_REVOGADO'],
    ['USUARIO_DESCONHECIDO'],
  ] as const)('leva a recusa %s ao estado recusada, sem permissão alguma', async (codigo) => {
    tela = await montarComSessao(
      { entrada: criarEntradaFalsa(true), buscarEu: () => Promise.reject(erroDoEu(401, codigo)) },
      <Sonda />,
    );

    expect(ler('estado')).toBe('recusada');
    expect(ler('pode-registrar')).toBe('false');
  });

  it('o 503 do provedor não derruba a sessão do navegador e permite tentar de novo', async () => {
    const entrada = criarEntradaFalsa(true);
    const buscarEu = vi
      .fn<() => Promise<Eu>>()
      .mockRejectedValueOnce(erroDoEu(503, 'PROVEDOR_DE_IDENTIDADE_INDISPONIVEL'))
      .mockResolvedValue(criarEu());
    function Retentar() {
      const { tentarDeNovo } = useSessao();
      return <button onClick={tentarDeNovo}>repetir</button>;
    }
    tela = await montarComSessao({ entrada, buscarEu }, <><Sonda /><Retentar /></>);

    expect(ler('estado')).toBe('indisponivel');
    expect(entrada.sair).not.toHaveBeenCalled();

    await tela.clicar('repetir');

    expect(ler('estado')).toBe('ativa');
    expect(ler('pode-registrar')).toBe('true');
  });

  it('quando a credencial avisa que a sessão acabou, volta a sem-sessao e esquece o /eu', async () => {
    const aviso = criarAvisoDeEncerramentoFalso();
    tela = await montarComSessao(
      { entrada: criarEntradaFalsa(true), buscarEu: () => Promise.resolve(criarEu()), aviso },
      <Sonda />,
    );
    expect(ler('estado')).toBe('ativa');

    await act(async () => {
      aviso.disparar();
    });
    await assentar();

    expect(ler('estado')).toBe('sem-sessao');
    expect(ler('pode-registrar')).toBe('false');
    expect(tela.clienteDeConsultas.getQueryData(CHAVE_DO_EU)).toBeUndefined();
  });

  it('encerrar faz o logout OIDC e deixa a sessão vazia', async () => {
    const entrada = criarEntradaFalsa(true);
    function Sair() {
      const { encerrar } = useSessao();
      return <button onClick={encerrar}>sair</button>;
    }
    tela = await montarComSessao({ entrada, buscarEu: () => Promise.resolve(criarEu()) }, <><Sonda /><Sair /></>);

    await tela.clicar('sair');

    expect(entrada.sair).toHaveBeenCalledTimes(1);
    expect(ler('estado')).toBe('sem-sessao');
  });

  it('concluir a entrada abre a sessão e devolve o destino pedido antes do login', async () => {
    const entrada = criarEntradaFalsa(false);
    entrada.concluirEntrada.mockResolvedValue('/faturas?mes=8');
    let destinoRecebido = '';
    function Concluir() {
      const { concluirEntrada } = useSessao();
      return (
        <button
          onClick={() => {
            void concluirEntrada('http://localhost:5173/entrar/retorno?code=1').then((d) => {
              destinoRecebido = d;
            });
          }}
        >
          concluir
        </button>
      );
    }
    tela = await montarComSessao({ entrada, buscarEu: () => Promise.resolve(criarEu()) }, <><Sonda /><Concluir /></>);
    expect(ler('estado')).toBe('sem-sessao');

    await tela.clicar('concluir');

    expect(destinoRecebido).toBe('/faturas?mes=8');
    expect(ler('estado')).toBe('ativa');
  });

  it('não devolve destino de fora do site depois do login', async () => {
    const entrada = criarEntradaFalsa(false);
    entrada.concluirEntrada.mockResolvedValue('https://malicioso.example');
    let destinoRecebido = '';
    function Concluir() {
      const { concluirEntrada } = useSessao();
      return (
        <button
          onClick={() => {
            void concluirEntrada('http://x').then((d) => {
              destinoRecebido = d;
            });
          }}
        >
          concluir
        </button>
      );
    }
    tela = await montarComSessao({ entrada, buscarEu: () => Promise.resolve(criarEu()) }, <Concluir />);

    await tela.clicar('concluir');

    expect(destinoRecebido).toBe('/');
  });
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

    expect(ler('de')).toBe('/lancamentos?pagina=2');
    expect(ler('protegida')).toBeUndefined();
  });

  it('com recusa do /eu também manda para a entrada guardando o destino', async () => {
    tela = await montarComSessao(
      { entrada: criarEntradaFalsa(true), buscarEu: () => Promise.reject(erroDoEu(401, 'USUARIO_SUSPENSO')) },
      <Rotas />,
    );

    expect(ler('de')).toBe('/lancamentos?pagina=2');
  });

  it('com sessão ativa mostra a tela protegida', async () => {
    tela = await montarComSessao({ entrada: criarEntradaFalsa(true), buscarEu: () => Promise.resolve(criarEu()) }, <Rotas />);

    expect(ler('protegida')).toBe('conteúdo protegido');
    expect(ler('de')).toBeUndefined();
  });

  it('enquanto verifica o acesso não redireciona nem mostra a tela protegida', async () => {
    tela = await montarComSessao({ entrada: criarEntradaFalsa(true), buscarEu: () => new Promise<Eu>(() => undefined) }, <Rotas />);

    expect(ler('de')).toBeUndefined();
    expect(ler('protegida')).toBeUndefined();
    expect(tela.texto()).toContain('Verificando seu acesso');
  });
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

    expect(ler('destino')).toBe('faturas');
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
