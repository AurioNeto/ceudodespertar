import type { LancamentoNaLista } from '@cdd/contracts';

export function totaisDosRegistros(registros: readonly LancamentoNaLista[]) {
  const saidas = registros
    .filter((r) => r.tipo === 'SAIDA' && r.status !== 'ESTORNADO')
    .reduce((a, r) => a + r.valor, 0);
  const entradas = registros.filter((r) => r.tipo === 'ENTRADA').reduce((a, r) => a + r.valor, 0);
  return { saidas, entradas };
}
