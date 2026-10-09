import { act } from 'react';
import { vi } from 'vitest';
import type {
  CodigoGrupo,
  Eu,
  DataHora,
  GrupoDaGestao,
  GrupoId,
  GruposDaGestao,
  PaginaDeUsuarios,
  Permissao,
  UsuarioId,
  UsuarioListado,
} from '@cdd/contracts';
import { assentar, criarEntradaFalsa, criarEu, montarComSessao, type TelaMontada } from '../../app/apoioDeTeste';
import type { ClienteHttp, OpcoesDeRequisicao } from '../../dados/clienteHttp';
import { ClienteHttpProvider } from '../../app/clienteHttp';
import { ErroDaApi } from '../../dados/erros';
import { ATRASO_DA_BUSCA_EM_MS } from './AbaDeUsuarios';
import { AcessosPage } from './AcessosPage';

const FOLGA_DA_ESPERA_EM_MS = 100;

export const ESPERA_ALEM_DO_ATRASO_DA_BUSCA_EM_MS = ATRASO_DA_BUSCA_EM_MS + FOLGA_DA_ESPERA_EM_MS;

export function usuarioListado(sobrescritas: Partial<UsuarioListado> = {}): UsuarioListado {
  return {
    id: 'u-1' as UsuarioId,
    nome: 'Maria das Graças',
    email: 'maria@cdd.local',
    situacao: 'ATIVO',
    grupos: [{ id: 'g-1' as GrupoId, nome: 'Tesouraria' }],
    versao: 1,
    ultimoAcessoEm: '2026-10-09T17:30:00.000Z' as DataHora,
    ...sobrescritas,
  };
}

export function pagina(itens: readonly UsuarioListado[], proxima: string | null = null): PaginaDeUsuarios {
  return { itens, proxima };
}

export function grupoDaGestao(sobrescritas: Partial<GrupoDaGestao> = {}): GrupoDaGestao {
  return {
    id: 'g-1' as GrupoId,
    codigoSistema: 'TESOURARIA' satisfies CodigoGrupo,
    nome: 'Tesouraria',
    descricao: 'Cuida do caixa',
    permissoes: ['financeiro.lancamento.registrar'] as Permissao[],
    protegido: false,
    usuarios: 2,
    versao: 1,
    ...sobrescritas,
  };
}

export type RespostaFalsa<T> = T | Error | Promise<T>;

export interface RoteiroDoCliente {
  usuarios(parametros: URLSearchParams): RespostaFalsa<PaginaDeUsuarios>;
  grupos(): RespostaFalsa<GruposDaGestao>;
  usuario?(id: string): RespostaFalsa<UsuarioListado>;
  comando?(opcoes: OpcoesDeRequisicao): RespostaFalsa<unknown>;
}

export interface ClienteFalso extends ClienteHttp {
  readonly requisitar: ReturnType<typeof vi.fn<(opcoes: OpcoesDeRequisicao) => Promise<never>>>;
  chamadasDeUsuarios(): URLSearchParams[];
  chamadasDeComando(): OpcoesDeRequisicao[];
}

const entregar = <T,>(resposta: RespostaFalsa<T>): Promise<T> =>
  resposta instanceof Error ? Promise.reject(resposta) : Promise.resolve(resposta);

const semComando = (opcoes: OpcoesDeRequisicao): never => {
  throw new Error(`comando inesperado: ${opcoes.metodo} ${opcoes.caminho}`);
};

export function criarClienteFalso(roteiro: RoteiroDoCliente): ClienteFalso {
  const requisitar = vi.fn((opcoes: OpcoesDeRequisicao) => {
    const [caminho = '', consulta = ''] = opcoes.caminho.split('?');
    if (opcoes.metodo !== 'GET') return entregar((roteiro.comando ?? semComando)(opcoes));
    const idDoUsuario = caminho.match(/^\/identidade\/usuarios\/([^/]+)$/)?.[1];
    if (idDoUsuario && roteiro.usuario) return entregar(roteiro.usuario(decodeURIComponent(idDoUsuario)));
    if (caminho === '/identidade/usuarios') return entregar(roteiro.usuarios(new URLSearchParams(consulta)));
    if (caminho === '/identidade/grupos') return entregar(roteiro.grupos());
    return Promise.reject(new Error(`caminho inesperado: ${opcoes.caminho}`));
  });
  return {
    requisitar: requisitar as ClienteFalso['requisitar'],
    chamadasDeComando: () => requisitar.mock.calls.map(([opcoes]) => opcoes).filter((opcoes) => opcoes.metodo !== 'GET'),
    chamadasDeUsuarios: () =>
      requisitar.mock.calls
        .filter(([opcoes]) => opcoes.metodo === 'GET' && opcoes.caminho.startsWith('/identidade/usuarios?'))
        .map(([opcoes]) => new URLSearchParams(opcoes.caminho.split('?')[1] ?? '')),
  };
}

export const erroDeServidor = () => new ErroDaApi({ status: 500, codigo: 'ERRO_INTERNO' });

export const PERMISSAO_DE_USUARIOS: Permissao = 'sistema.usuario.gerenciar';
export const PERMISSAO_DE_GRUPOS: Permissao = 'sistema.grupo.gerenciar';

export async function montarAcessos(
  cliente: ClienteHttp,
  permissoes: readonly Permissao[] = [PERMISSAO_DE_USUARIOS, PERMISSAO_DE_GRUPOS],
  buscarEu: () => Promise<Eu> = () => Promise.resolve(criarEu({ permissoes: [...permissoes] })),
): Promise<TelaMontada> {
  return montarComSessao(
    {
      entrada: criarEntradaFalsa(true),
      buscarEu,
    },
    <ClienteHttpProvider cliente={cliente}>
      <AcessosPage />
    </ClienteHttpProvider>,
  );
}

export function campoPorRotulo<T extends HTMLElement>(tela: TelaMontada, rotulo: string): T {
  const etiqueta = Array.from(tela.container.querySelectorAll('label')).find((l) => l.textContent === rotulo);
  const campo = etiqueta?.htmlFor ? tela.container.querySelector<T>(`[id="${etiqueta.htmlFor}"]`) : null;
  if (!campo) throw new Error(`campo não encontrado: ${rotulo}`);
  return campo;
}

export async function digitar(tela: TelaMontada, rotulo: string, valor: string): Promise<void> {
  const campo = campoPorRotulo<HTMLInputElement>(tela, rotulo);
  const atribuir = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  await act(async () => {
    atribuir?.call(campo, valor);
    campo.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

export async function escolher(tela: TelaMontada, rotulo: string, valor: string): Promise<void> {
  const campo = campoPorRotulo<HTMLSelectElement>(tela, rotulo);
  const atribuir = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
  await act(async () => {
    atribuir?.call(campo, valor);
    campo.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

export async function esperar(ms: number): Promise<void> {
  await act(async () => {
    await new Promise<void>((resolver) => setTimeout(resolver, ms));
  });
}

export function simularCelular(): () => void {
  const original = window.matchMedia;
  window.matchMedia = ((consulta: string) => ({
    media: consulta,
    matches: true,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  })) as unknown as typeof window.matchMedia;
  return () => {
    window.matchMedia = original;
  };
}

export const painelAberto = (): HTMLElement | null => document.querySelector<HTMLElement>('[role="dialog"]');

export const textoDoPainel = (): string => painelAberto()?.textContent ?? '';

function elementoDoPainel<T extends HTMLElement>(seletor: string, achar: (candidato: T) => boolean, descricao: string): T {
  const achado = Array.from(painelAberto()?.querySelectorAll<T>(seletor) ?? []).find(achar);
  if (!achado) throw new Error(`não encontrado no painel: ${descricao}`);
  return achado;
}

export function campoDoPainel<T extends HTMLElement>(rotulo: string): T {
  const etiqueta = elementoDoPainel<HTMLLabelElement>('label', (l) => l.textContent === rotulo, rotulo);
  return elementoDoPainel<T>(`[id="${etiqueta.htmlFor}"]`, () => true, rotulo);
}

export async function digitarNoPainel(rotulo: string, valor: string): Promise<void> {
  const campo = campoDoPainel<HTMLInputElement | HTMLTextAreaElement>(rotulo);
  const prototipo = campo instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const atribuir = Object.getOwnPropertyDescriptor(prototipo, 'value')?.set;
  await act(async () => {
    atribuir?.call(campo, valor);
    campo.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

export async function alternarGrupoNoPainel(nome: string): Promise<void> {
  const caixa = elementoDoPainel<HTMLInputElement>(
    'input[type="checkbox"]',
    (c) => c.closest('label')?.textContent === nome,
    nome,
  );
  await act(async () => {
    caixa.click();
  });
}

export const gruposMarcadosNoPainel = (): string[] =>
  Array.from(painelAberto()?.querySelectorAll<HTMLInputElement>('input[type="checkbox"]') ?? [])
    .filter((c) => c.checked)
    .map((c) => c.closest('label')?.textContent ?? '');

export const botaoDoPainel = (texto: string): HTMLButtonElement =>
  elementoDoPainel<HTMLButtonElement>('button', (b) => b.textContent === texto, texto);

export async function clicarNoPainel(texto: string): Promise<void> {
  const botao = botaoDoPainel(texto);
  await act(async () => {
    botao.click();
  });
  await assentar();
}

export const botaoDeFora = (tela: TelaMontada, texto: string): HTMLButtonElement => {
  const botao = Array.from(tela.container.querySelectorAll('button')).find((b) => b.textContent === texto);
  if (!botao) throw new Error(`botão não encontrado: ${texto}`);
  return botao;
};

export async function abrirPeloGatilho(botao: HTMLButtonElement): Promise<void> {
  botao.focus();
  await act(async () => {
    botao.click();
  });
  await assentar();
}

export const teclarEscNoFoco = () =>
  act(async () => {
    (document.activeElement ?? document.body).dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
    );
  });

export const clicarNoFundoDoPainel = () =>
  act(async () => {
    const fundo = document.querySelector<HTMLElement>('[data-testid="painel-de-acao-fundo"]');
    fundo?.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    fundo?.click();
  });
