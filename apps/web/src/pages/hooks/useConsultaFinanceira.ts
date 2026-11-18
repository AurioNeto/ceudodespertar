import { useQuery } from '@tanstack/react-query';
import { useClienteHttp } from '@/app/providers';
import { criarConsulta } from '@/dados';

export function useConsultaFinanceira<T>(
  recurso: string, parametros: Record<string, string>, habilitada: boolean,
  chave: readonly string[] = ['consultas-financeiras', recurso],
) {
  const consulta = new URLSearchParams(parametros).toString();
  return useQuery({
    ...criarConsulta(useClienteHttp())<T>(`/financeiro/${recurso}${consulta ? `?${consulta}` : ''}`, [...chave, consulta]),
    enabled: habilitada,
  });
}

export function intervaloDaCompetencia(competencia: string) {
  const [ano, mes] = competencia.split('-').map(Number);
  const data = new Date(0);
  data.setUTCFullYear(ano ?? 0, mes ?? 0, 0);
  return { de: `${competencia}-01`, ate: `${competencia}-${data.getUTCDate()}` };
}

export function competenciaDaCasa() {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' }).format(new Date());
}
