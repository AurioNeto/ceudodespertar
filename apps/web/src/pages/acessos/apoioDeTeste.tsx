import { act } from 'react';
import { vi } from 'vitest';
import type {
  CodigoGrupo,
  DataHora,
  GrupoDaGestao,
  GrupoId,
  GruposDaGestao,
  PaginaDeUsuarios,
  Permissao,
  SituacaoUsuario,
  UsuarioId,
  UsuarioListado,
} from '@cdd/contracts';
import { criarEntradaFalsa, criarEu, montarComSessao, type TelaMontada } from '../../app/apoioDeTeste';
import type { ClienteHttp, OpcoesDeRequisicao } from '../../dados/clienteHttp';
import { ClienteHttpProvider } from '../../app/clienteHttp';
import { ErroDaApi } from '../../dados/erros';
import { AcessosPage } from './AcessosPage';

export const ESPERA_ALEM_DO_ATRASO_DA_BUSCA_EM_MS = 400;

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
}

export interface ClienteFalso extends ClienteHttp {
  readonly requisitar: ReturnType<typeof vi.fn<(opcoes: OpcoesDeRequisicao) => Promise<never>>>;
  chamadasDeUsuarios(): URLSearchParams[];
}

const entregar = <T,>(resposta: RespostaFalsa<T>): Promise<T> =>
  resposta instanceof Error ? Promise.reject(resposta) : Promise.resolve(resposta);

export function criarClienteFalso(roteiro: RoteiroDoCliente): ClienteFalso {
  const requisitar = vi.fn((opcoes: OpcoesDeRequisicao) => {
    const [caminho = '', consulta = ''] = opcoes.caminho.split('?');
    if (caminho === '/identidade/usuarios') return entregar(roteiro.usuarios(new URLSearchParams(consulta)));
    if (caminho === '/identidade/grupos') return entregar(roteiro.grupos());
    return Promise.reject(new Error(`caminho inesperado: ${opcoes.caminho}`));
  });
  return {
    requisitar: requisitar as ClienteFalso['requisitar'],
    chamadasDeUsuarios: () =>
      requisitar.mock.calls
        .filter(([opcoes]) => opcoes.caminho.startsWith('/identidade/usuarios'))
        .map(([opcoes]) => new URLSearchParams(opcoes.caminho.split('?')[1] ?? '')),
  };
}

export const erroDeServidor = () => new ErroDaApi({ status: 500, codigo: 'ERRO_INTERNO' });

export const PERMISSAO_DE_USUARIOS: Permissao = 'sistema.usuario.gerenciar';
export const PERMISSAO_DE_GRUPOS: Permissao = 'sistema.grupo.gerenciar';

export async function montarAcessos(
  cliente: ClienteHttp,
  permissoes: readonly Permissao[] = [PERMISSAO_DE_USUARIOS, PERMISSAO_DE_GRUPOS],
): Promise<TelaMontada> {
  return montarComSessao(
    {
      entrada: criarEntradaFalsa(true),
      buscarEu: () => Promise.resolve(criarEu({ permissoes: [...permissoes] })),
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

export const situacoes: readonly SituacaoUsuario[] = ['ATIVO', 'CONVITE_PENDENTE', 'SUSPENSO', 'REVOGADO'];
