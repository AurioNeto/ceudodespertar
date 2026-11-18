import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useClienteHttp } from '@/app/providers';
import { criarConsulta } from '@/dados';
import type { RegistroDoCadastro } from './tipos';

export function useItensDoCadastro<T>(caminho: string, habilitado = true) {
  const consulta = criarConsulta(useClienteHttp());
  return useQuery({ ...consulta<{ itens: readonly T[] }>(caminho, ['cadastros', caminho]), enabled: habilitado });
}

export function usePaginasDoCadastro(caminho: string, busca: string, habilitado: boolean) {
  const consulta = criarConsulta(useClienteHttp());
  return useInfiniteQuery({
    queryKey: ['cadastros', caminho, busca],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) => {
      const parametros = new URLSearchParams();
      if (busca.trim()) parametros.set('busca', busca.trim());
      if (pageParam) parametros.set('depois', pageParam);
      return consulta<{ itens: readonly RegistroDoCadastro[]; proxima: string | null }>(
        parametros.size ? `${caminho}?${parametros}` : caminho,
      ).queryFn({ signal });
    },
    getNextPageParam: pagina => pagina.proxima,
    enabled: habilitado,
  });
}
