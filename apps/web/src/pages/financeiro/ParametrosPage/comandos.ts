import { useMemo } from 'react';
import type { CategoriaDoPlano, EditarCategoria } from '@cdd/contracts';
import { criarComando } from '@/dados';
import type { ClienteHttp } from '@/dados';
import { useClienteHttp } from '@/app/providers';

export interface CorrecaoDeLinha {
  readonly categoria: CategoriaDoPlano;
  readonly linhaRelatorio: string;
}

const corpoDaCorrecao = ({ categoria, linhaRelatorio }: CorrecaoDeLinha): EditarCategoria => ({
  nome: categoria.nome,
  regimesPermitidos: [...categoria.regimesPermitidos],
  ativa: categoria.ativa,
  unidadePadraoId: categoria.unidadePadraoId ?? null,
  linhaRelatorio,
});

export function criarComandosDeParametros(cliente: ClienteHttp) {
  const comando = criarComando(cliente);
  return {
    corrigirLinha: comando<CorrecaoDeLinha, CategoriaDoPlano>({
      metodo: 'PUT',
      caminho: ({ categoria }) => `/financeiro/categorias/${encodeURIComponent(categoria.id)}`,
      corpo: corpoDaCorrecao,
      versao: ({ categoria }) => categoria.versao,
    }),
  };
}

export function useComandosDeParametros() {
  const cliente = useClienteHttp();
  return useMemo(() => criarComandosDeParametros(cliente), [cliente]);
}
