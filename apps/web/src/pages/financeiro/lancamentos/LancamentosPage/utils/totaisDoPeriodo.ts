import type { LancamentoNaLista } from '@cdd/contracts';

export function totaisDoPeriodo(lista: readonly LancamentoNaLista[]) {
  const vivos = lista.filter((r) => r.status !== 'ESTORNADO');
  const entradas = vivos.filter((r) => r.tipo === 'ENTRADA').reduce((a, r) => a + r.valor, 0);
  const saidas = vivos.filter((r) => r.tipo === 'SAIDA').reduce((a, r) => a + r.valor, 0);
  const aConferir = lista.filter((r) => r.status === 'A_CONFERIR').length;
  return { entradas, saidas, aConferir };
}
