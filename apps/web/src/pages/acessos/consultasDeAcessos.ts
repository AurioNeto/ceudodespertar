import { useMemo } from 'react';
import { infiniteQueryOptions } from '@tanstack/react-query';
import type { GrupoId, GruposDaGestao, PaginaDeUsuarios, SituacaoUsuario, UsuarioId, UsuarioListado } from '@cdd/contracts';
import { LIMITE_PADRAO_DA_LISTAGEM_DE_USUARIOS } from '@cdd/contracts';
import { criarConsulta } from '../../dados/consultaEComando';
import type { ClienteHttp } from '../../dados/clienteHttp';
import { useClienteHttp } from '../../app/clienteHttp';

export interface FiltroDaTela {
  readonly situacao: SituacaoUsuario | null;
  readonly grupoId: GrupoId | null;
  readonly busca: string;
}

export const SEM_FILTRO: FiltroDaTela = { situacao: null, grupoId: null, busca: '' };

export const temFiltroAplicado = (filtro: FiltroDaTela): boolean =>
  filtro.situacao !== null || filtro.grupoId !== null || filtro.busca.trim() !== '';

export function caminhoDaListagemDeUsuarios(filtro: FiltroDaTela, depois: string | null): string {
  const parametros = new URLSearchParams();
  if (filtro.situacao) parametros.set('situacao', filtro.situacao);
  if (filtro.grupoId) parametros.set('grupoId', filtro.grupoId);
  const busca = filtro.busca.trim();
  if (busca) parametros.set('busca', busca);
  if (depois) parametros.set('depois', depois);
  parametros.set('limite', String(LIMITE_PADRAO_DA_LISTAGEM_DE_USUARIOS));
  return `/identidade/usuarios?${parametros.toString()}`;
}

export function criarConsultasDeAcessos(cliente: ClienteHttp) {
  const consulta = criarConsulta(cliente);
  return {
    usuarios: (filtro: FiltroDaTela) =>
      infiniteQueryOptions({
        queryKey: ['acessos', 'usuarios', filtro.situacao, filtro.grupoId, filtro.busca.trim()],
        initialPageParam: null as string | null,
        queryFn: ({ pageParam, signal }) =>
          cliente.requisitar<PaginaDeUsuarios>({
            metodo: 'GET',
            caminho: caminhoDaListagemDeUsuarios(filtro, pageParam),
            sinal: signal,
          }),
        getNextPageParam: (pagina) => pagina.proxima,
      }),
    usuario: (id: UsuarioId) =>
      consulta<UsuarioListado>(`/identidade/usuarios/${encodeURIComponent(id)}`, ['acessos', 'usuarios', 'porId', id]),
    grupos: () => consulta<GruposDaGestao>('/identidade/grupos', ['acessos', 'grupos']),
  };
}

export function useConsultasDeAcessos() {
  const cliente = useClienteHttp();
  return useMemo(() => criarConsultasDeAcessos(cliente), [cliente]);
}
