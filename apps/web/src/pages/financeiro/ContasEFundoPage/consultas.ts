import type { SaldoDeConta, SaldoDeFundo } from '@cdd/contracts';
import { useQuery } from '@tanstack/react-query';
import { useClienteHttp } from '@/app/providers';
import { criarConsulta } from '@/dados';

export function useSaldos(habilitado: boolean, unidade: string) {
  const consultar = criarConsulta(useClienteHttp());
  const filtro = unidade ? `?${new URLSearchParams({ unidadeId: unidade })}` : '';
  return {
    contas: useQuery({ ...consultar<readonly SaldoDeConta[]>(`/financeiro/contas/saldos${filtro}`, ['saldos', 'contas', unidade]), enabled: habilitado }),
    fundos: useQuery({ ...consultar<readonly SaldoDeFundo[]>(`/financeiro/fundos/saldos${filtro}`, ['saldos', 'fundos', unidade]), enabled: habilitado }),
  };
}
