import { useMemo } from 'react';
import type { CategoriaDoPlano, UnidadeDoPlano } from '@cdd/contracts';
import { criarConsulta } from '@/dados';
import type { ClienteHttp } from '@/dados';
import { useClienteHttp } from '@/app/providers';

export interface ListaDoPlano<Item> {
  readonly itens: readonly Item[];
}

export const CHAVE_DAS_CATEGORIAS = ['parametros', 'categorias'] as const;
export const CHAVE_DAS_UNIDADES = ['parametros', 'unidades'] as const;

export function criarConsultasDeParametros(cliente: ClienteHttp) {
  const consulta = criarConsulta(cliente);
  return {
    categorias: () => consulta<ListaDoPlano<CategoriaDoPlano>>('/financeiro/categorias', CHAVE_DAS_CATEGORIAS),
    unidades: () => consulta<ListaDoPlano<UnidadeDoPlano>>('/financeiro/unidades', CHAVE_DAS_UNIDADES),
  };
}

export function useConsultasDeParametros() {
  const cliente = useClienteHttp();
  return useMemo(() => criarConsultasDeParametros(cliente), [cliente]);
}
