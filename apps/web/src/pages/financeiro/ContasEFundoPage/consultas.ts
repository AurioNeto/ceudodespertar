import type { SaldoDeConta, SaldoDeFundo } from '@cdd/contracts';
import { useQuery } from '@tanstack/react-query';
import { useClienteHttp } from '@/app/providers';
import { criarConsulta } from '@/dados';

export function useSaldos(habilitado: boolean) {
  const consultar = criarConsulta(useClienteHttp());
  return {
    contas: useQuery({ ...consultar<readonly SaldoDeConta[]>('/financeiro/contas/saldos', ['saldos', 'contas']), enabled: habilitado }),
    fundos: useQuery({ ...consultar<readonly SaldoDeFundo[]>('/financeiro/fundos/saldos', ['saldos', 'fundos']), enabled: habilitado }),
  };
}
