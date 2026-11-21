import type { LancamentoNaLista } from '@cdd/contracts';

export function filtrarLancamentos(
  lancamentos: readonly LancamentoNaLista[],
  filtros: Record<string, string>,
): LancamentoNaLista[] {
  const busca = (filtros.busca ?? '').trim().toLowerCase();
  return lancamentos.filter((r) => {
    if (filtros.periodo !== 'todos' && r.competencia !== filtros.periodo) return false;
    if (filtros.tipo !== 'todos' && r.tipo !== filtros.tipo) return false;
    if (filtros.grupo !== 'todos' && r.grupo !== filtros.grupo) return false;
    if (filtros.status !== 'todos' && r.status !== filtros.status) return false;
    if (busca && ![r.motivo, r.contraparte ?? '', r.registradoPor].join(' ').toLowerCase().includes(busca))
      return false;
    return true;
  });
}
