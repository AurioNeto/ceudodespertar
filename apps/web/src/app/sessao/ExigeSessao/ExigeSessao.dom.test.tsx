import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import type { Eu } from '@cdd/contracts';
import { act } from 'react';
import { ErroDeRede } from '@/dados';
import {
  assentar,
  criarAvisoDeEncerramentoFalso,
  criarEntradaFalsa,
  criarEu,
  ler,
  montarComSessao,
} from '@/testes/sessaoDeTeste';
import type { TelaMontada } from '@/testes/sessaoDeTeste';
import { erroDaApi as erroDoEu } from '@/testes/fabricas';
import { CHAVE_DO_EU } from '../SessaoProvider';
import { INTERVALO_DE_NOVA_TENTATIVA_DO_EU_EM_MS } from '../utils/derivarEstado';
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

  describe('no meio da sessão', () => {
    function RotasComFormulario() {
      return (
        <MemoryRouter initialEntries={['/lancamentos']}>
          <Routes>
            <Route path="/entrar" element={<DestinoDaEntrada />} />
            <Route
              path="/lancamentos"
              element={
                <ExigeSessao>
                  <input data-testid="rascunho" defaultValue="" />
                </ExigeSessao>
              }
            />
          </Routes>
        </MemoryRouter>
      );
    }

    async function comSessaoAtiva(proximas: Array<() => Promise<Eu>>, recusa = criarAvisoDeEncerramentoFalso()) {
      let chamadas = 0;
      const buscarEu = () => (proximas[chamadas++] ?? (() => Promise.resolve(criarEu())))();
      tela = await montarComSessao({ entrada: criarEntradaFalsa(true), buscarEu, recusa }, <RotasComFormulario />);
      const campo = tela.container.querySelector<HTMLInputElement>('[data-testid="rascunho"]');
      if (!campo) throw new Error('formulário não montou');
      campo.value = 'lançamento pela metade';
      return { campo, recusa };
    }

    async function refazerOEu() {
      await act(async () => {
        await tela?.clienteDeConsultas.invalidateQueries({ queryKey: CHAVE_DO_EU });
      });
      await assentar();
    }

    it.each([
      ['indisponibilidade', () => Promise.reject(erroDoEu(503, 'SERVICO_INDISPONIVEL'))],
      ['falha de rede', () => Promise.reject(new ErroDeRede(new Error('offline')))],
    ])('%s no refetch do /eu mantém a rota e o formulário', async (_caso, falhar) => {
      const { campo } = await comSessaoAtiva([() => Promise.resolve(criarEu()), falhar]);

      await refazerOEu();

      expect(ler(tela, 'de')).toBeUndefined();
      expect(tela?.container.querySelector('[data-testid="rascunho"]')).toBe(campo);
      expect(campo.value).toBe('lançamento pela metade');
    });

    it.each(['USUARIO_SUSPENSO', 'USUARIO_REVOGADO'] as const)(
      '401 %s em outra chamada leva à tela de recusa',
      async (codigo) => {
        const { recusa } = await comSessaoAtiva([
          () => Promise.resolve(criarEu()),
          () => Promise.reject(erroDoEu(401, codigo)),
        ]);

        await act(async () => recusa.disparar());
        await assentar();

        expect(ler(tela, 'de')).toBe('/lancamentos');
      },
    );

    it('401 USUARIO_SUSPENSO no refetch do próprio /eu também leva à tela de recusa', async () => {
      await comSessaoAtiva([() => Promise.resolve(criarEu()), () => Promise.reject(erroDoEu(401, 'USUARIO_SUSPENSO'))]);

      await refazerOEu();

      expect(ler(tela, 'de')).toBe('/lancamentos');
    });

    it('a recusa avisada pela própria busca do /eu não refaz a busca em laço', async () => {
      const recusa = criarAvisoDeEncerramentoFalso();
      const LIMITE = 6;
      let chamadas = 0;
      const buscarEu = () => {
        chamadas += 1;
        if (chamadas === 1) return Promise.resolve(criarEu());
        if (chamadas >= LIMITE) return Promise.resolve(criarEu());
        recusa.disparar();
        return Promise.reject(erroDoEu(401, 'USUARIO_REVOGADO'));
      };
      tela = await montarComSessao({ entrada: criarEntradaFalsa(true), buscarEu, recusa }, <RotasComFormulario />);

      await refazerOEu();
      await assentar();

      expect(chamadas).toBe(2);
      expect(ler(tela, 'de')).toBe('/lancamentos');
    });

    it('depois de uma falha passageira, busca o /eu de novo sozinha', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      try {
        let chamadas = 0;
        const buscarEu = () => {
          chamadas += 1;
          return chamadas === 2 ? Promise.reject(erroDoEu(503, 'SERVICO_INDISPONIVEL')) : Promise.resolve(criarEu());
        };
        tela = await montarComSessao({ entrada: criarEntradaFalsa(true), buscarEu }, <RotasComFormulario />);
        await refazerOEu();
        expect(chamadas).toBe(2);

        await act(async () => {
          await vi.advanceTimersByTimeAsync(INTERVALO_DE_NOVA_TENTATIVA_DO_EU_EM_MS);
        });
        await assentar();

        expect(chamadas).toBe(3);
        expect(ler(tela, 'de')).toBeUndefined();
      } finally {
        vi.useRealTimers();
      }
    });
  });
});
