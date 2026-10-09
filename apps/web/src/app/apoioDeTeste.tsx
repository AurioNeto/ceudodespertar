import { act } from 'react';
import type { ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import type { CodigoDeErro, Eu, GrupoId, InstituicaoId, Permissao, UsuarioId } from '@cdd/contracts';
import { JANELA_DE_FRESCOR_EM_MS } from '../dados/clienteDeConsultas';
import { ErroDaApi } from '../dados/erros';
import type { ServicoDeEntrada } from '../dados/oidc';
import { SessaoProvider } from './sessao';

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (consulta: string) => ({
    media: consulta,
    matches: false,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }),
});

export const PERMISSAO_QUE_O_EU_TEM: Permissao = 'financeiro.lancamento.registrar';
export const PERMISSAO_QUE_O_EU_NAO_TEM: Permissao = 'financeiro.lancamento.confirmar';

export function criarEu(sobrescritas: Partial<Eu> = {}): Eu {
  return {
    usuario: { id: 'u-1' as UsuarioId, nome: 'Ana Souza', email: 'ana@cdd.local' },
    instituicao: { id: 'i-1' as InstituicaoId, nome: 'Céu do Despertar' },
    grupos: [{ id: 'g-1' as GrupoId, nome: 'Tesouraria' }],
    permissoes: [PERMISSAO_QUE_O_EU_TEM],
    ...sobrescritas,
  };
}

export const erroDoEu = (status: number, codigo: CodigoDeErro) => new ErroDaApi({ status, codigo });

export interface EntradaFalsa extends ServicoDeEntrada {
  readonly recuperarSessao: ReturnType<typeof vi.fn<() => Promise<boolean>>>;
  readonly iniciarEntrada: ReturnType<typeof vi.fn<(destino: string) => Promise<void>>>;
  readonly concluirEntrada: ReturnType<typeof vi.fn<(url: string) => Promise<unknown>>>;
  readonly sair: ReturnType<typeof vi.fn<() => Promise<void>>>;
}

export function criarEntradaFalsa(temUsuario: boolean): EntradaFalsa {
  return {
    recuperarSessao: vi.fn(() => Promise.resolve(temUsuario)),
    iniciarEntrada: vi.fn(() => Promise.resolve()),
    concluirEntrada: vi.fn(() => Promise.resolve('/')),
    sair: vi.fn(() => Promise.resolve()),
  };
}

export interface AvisoDeEncerramentoFalso {
  readonly aoEncerrar: (ouvinte: () => void) => () => void;
  disparar(): void;
}

export function criarAvisoDeEncerramentoFalso(): AvisoDeEncerramentoFalso {
  const ouvintes = new Set<() => void>();
  return {
    aoEncerrar: (ouvinte) => {
      ouvintes.add(ouvinte);
      return () => {
        ouvintes.delete(ouvinte);
      };
    },
    disparar: () => {
      for (const ouvinte of ouvintes) ouvinte();
    },
  };
}

export interface CenarioDeSessao {
  readonly entrada: EntradaFalsa;
  readonly buscarEu: (sinal: AbortSignal) => Promise<Eu>;
  readonly aviso?: AvisoDeEncerramentoFalso;
}

export interface TelaMontada {
  readonly container: HTMLElement;
  readonly clienteDeConsultas: QueryClient;
  texto(): string;
  clicar(rotulo: string): Promise<void>;
  desmontar(): Promise<void>;
}

const VOLTAS_PARA_ASSENTAR = 4;

const proximoCiclo = () =>
  act(async () => {
    await new Promise<void>((resolver) => setTimeout(resolver, 0));
  });

export async function assentar(): Promise<void> {
  await Array.from({ length: VOLTAS_PARA_ASSENTAR }).reduce<Promise<void>>(
    (anterior) => anterior.then(proximoCiclo),
    Promise.resolve(),
  );
}

export async function montarComSessao(cenario: CenarioDeSessao, arvore: ReactElement): Promise<TelaMontada> {
  const clienteDeConsultas = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: JANELA_DE_FRESCOR_EM_MS } },
  });
  const aviso = cenario.aviso ?? criarAvisoDeEncerramentoFalso();
  const container = document.createElement('div');
  document.body.append(container);
  const raiz = createRoot(container);

  await act(async () => {
    raiz.render(
      <QueryClientProvider client={clienteDeConsultas}>
        <SessaoProvider entrada={cenario.entrada} aoEncerrar={aviso.aoEncerrar} buscarEu={cenario.buscarEu}>
          {arvore}
        </SessaoProvider>
      </QueryClientProvider>,
    );
  });
  await assentar();

  return {
    container,
    clienteDeConsultas,
    texto: () => container.textContent ?? '',
    async clicar(rotulo) {
      const botao = Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes(rotulo));
      if (!botao) throw new Error(`botão não encontrado: ${rotulo}`);
      await act(async () => {
        botao.click();
      });
      await assentar();
    },
    async desmontar() {
      await act(async () => {
        raiz.unmount();
      });
      container.remove();
    },
  };
}
