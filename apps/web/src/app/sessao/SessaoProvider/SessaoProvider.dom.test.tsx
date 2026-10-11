import { afterEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import type { Eu } from '@cdd/contracts';
import {
  PERMISSAO_QUE_O_EU_NAO_TEM,
  PERMISSAO_QUE_O_EU_TEM,
  assentar,
  criarAvisoDeEncerramentoFalso,
  criarEntradaFalsa,
  criarEu,
  ler,
  montarComSessao,
} from '@/testes/sessaoDeTeste';
import type { TelaMontada } from '@/testes/sessaoDeTeste';
import { erroDaApi as erroDoEu } from '@/testes/fabricas';
import { CHAVE_DO_EU, useSessao } from './SessaoProvider';

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

describe('SessaoProvider', () => {
  it('responde pode() a partir das permissões do /eu', async () => {
    tela = await montarComSessao({ entrada: criarEntradaFalsa(true), buscarEu: () => Promise.resolve(criarEu()) }, <Sonda />);

    expect(ler(tela, 'estado')).toBe('ativa');
    expect(ler(tela, 'pode-registrar')).toBe('true');
    expect(ler(tela, 'pode-confirmar')).toBe('false');
  });

  it('muda o que pode() responde quando o /eu traz outras permissões', async () => {
    const eu: Eu = criarEu({ permissoes: [PERMISSAO_QUE_O_EU_NAO_TEM] });
    tela = await montarComSessao({ entrada: criarEntradaFalsa(true), buscarEu: () => Promise.resolve(eu) }, <Sonda />);

    expect(ler(tela, 'pode-registrar')).toBe('false');
    expect(ler(tela, 'pode-confirmar')).toBe('true');
  });

  it('expõe o nome do grupo vindo do /eu', async () => {
    tela = await montarComSessao({ entrada: criarEntradaFalsa(true), buscarEu: () => Promise.resolve(criarEu()) }, <Sonda />);
    expect(ler(tela, 'grupo')).toBe('Tesouraria');
  });

  it('sem usuário OIDC não chama o /eu e nada é permitido', async () => {
    const buscarEu = vi.fn(() => Promise.resolve(criarEu()));
    tela = await montarComSessao({ entrada: criarEntradaFalsa(false), buscarEu }, <Sonda />);

    expect(ler(tela, 'estado')).toBe('sem-sessao');
    expect(ler(tela, 'pode-registrar')).toBe('false');
    expect(buscarEu).not.toHaveBeenCalled();
  });

  it('fica verificando enquanto o /eu não responde e nada é permitido', async () => {
    tela = await montarComSessao({ entrada: criarEntradaFalsa(true), buscarEu: () => new Promise<Eu>(() => undefined) }, <Sonda />);

    expect(ler(tela, 'estado')).toBe('verificando');
    expect(ler(tela, 'pode-registrar')).toBe('false');
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

    expect(ler(tela, 'estado')).toBe('recusada');
    expect(ler(tela, 'pode-registrar')).toBe('false');
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

    expect(ler(tela, 'estado')).toBe('indisponivel');
    expect(entrada.sair).not.toHaveBeenCalled();

    await tela.clicar('repetir');

    expect(ler(tela, 'estado')).toBe('ativa');
    expect(ler(tela, 'pode-registrar')).toBe('true');
  });

  it('quando a credencial avisa que a sessão acabou, volta a sem-sessao e esquece o /eu', async () => {
    const aviso = criarAvisoDeEncerramentoFalso();
    tela = await montarComSessao(
      { entrada: criarEntradaFalsa(true), buscarEu: () => Promise.resolve(criarEu()), aviso },
      <Sonda />,
    );
    expect(ler(tela, 'estado')).toBe('ativa');

    await act(async () => {
      aviso.disparar();
    });
    await assentar();

    expect(ler(tela, 'estado')).toBe('sem-sessao');
    expect(ler(tela, 'pode-registrar')).toBe('false');
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
    expect(ler(tela, 'estado')).toBe('sem-sessao');
  });

  it('se o logout remoto falha, limpa a sessão local mesmo assim', async () => {
    const entrada = criarEntradaFalsa(true);
    entrada.sair.mockRejectedValue(new Error('keycloak fora'));
    function Sair() {
      const { encerrar } = useSessao();
      return <button onClick={encerrar}>sair</button>;
    }
    tela = await montarComSessao({ entrada, buscarEu: () => Promise.resolve(criarEu()) }, <><Sonda /><Sair /></>);
    expect(ler(tela, 'estado')).toBe('ativa');

    await tela.clicar('sair');

    expect(entrada.sair).toHaveBeenCalledTimes(1);
    expect(ler(tela, 'estado')).toBe('sem-sessao');
    expect(tela.clienteDeConsultas.getQueryData(CHAVE_DO_EU)).toBeUndefined();
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
    expect(ler(tela, 'estado')).toBe('sem-sessao');

    await tela.clicar('concluir');

    expect(destinoRecebido).toBe('/faturas?mes=8');
    expect(ler(tela, 'estado')).toBe('ativa');
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
