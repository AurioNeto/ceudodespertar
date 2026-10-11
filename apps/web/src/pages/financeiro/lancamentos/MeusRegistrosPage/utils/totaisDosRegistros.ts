import type { LancamentoNaLista } from '@cdd/contracts';

export function totaisDosRegistros(registros: readonly LancamentoNaLista[]) {
  const vivos = registros.filter((r) => r.status !== 'ESTORNADO');
  const saidas = vivos.filter((r) => r.tipo === 'SAIDA').reduce((a, r) => a + r.valor, 0);
  const entradas = vivos.filter((r) => r.tipo === 'ENTRADA').reduce((a, r) => a + r.valor, 0);
  return { saidas, entradas };
}
