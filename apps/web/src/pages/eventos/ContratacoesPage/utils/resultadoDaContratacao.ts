import type { ContratacaoNaTela } from '../mocks/contratacoes';

export function resultadoDaContratacao(c: ContratacaoNaTela) {
  const totalCaches = c.caches.reduce((s, m) => s + m.valor, 0);
  const totalCustos = c.custos.reduce((s, x) => s + x.valor, 0);
  const entrou = c.recebidoEm ? c.valorAcordado : 0;
  const resultado = c.valorAcordado - totalCaches - totalCustos;
  return { totalCaches, totalCustos, entrou, resultado };
}
