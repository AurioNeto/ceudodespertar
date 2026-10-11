import type { ContratacaoNaTela } from '../mocks/contratacoes';

export function recebidoNaSessao(lista: readonly ContratacaoNaTela[], iniciais: readonly ContratacaoNaTela[]): number {
  const recebidasAoAbrir = new Set(iniciais.filter((c) => c.recebidoEm).map((c) => c.eventoId));
  return lista.filter((c) => c.recebidoEm && !recebidasAoAbrir.has(c.eventoId)).reduce((s, c) => s + c.valorAcordado, 0);
}
