import { MESES_CURTOS } from '../mocks/relatorios';
import type { Periodo, Ponto } from '../tipos';

export const indice = (p: Ponto) => p.ano * 12 + p.mes;
export const doIndice = (i: number): Ponto => ({ ano: Math.floor((i - 1) / 12), mes: ((i - 1) % 12) + 1 });

const analisar = (texto: string): Ponto => {
  const [m, a] = texto.split('/').map((n) => parseInt(n, 10));
  return {
    mes: Number.isNaN(m) ? 1 : Math.min(12, Math.max(1, m ?? 1)),
    ano: Number.isNaN(a) ? 2026 : (a ?? 2026),
  };
};

/** O "hoje" da base é agosto de 2026 — o último mês com lançamentos. */
export const intervaloDe = (periodo: Periodo, de: string, ate: string) => {
  if (periodo === 'mes') return { inicio: { mes: 8, ano: 2026 }, fim: { mes: 8, ano: 2026 } };
  if (periodo === 'trimestre') return { inicio: { mes: 6, ano: 2026 }, fim: { mes: 8, ano: 2026 } };
  if (periodo === 'ano') return { inicio: { mes: 1, ano: 2026 }, fim: { mes: 8, ano: 2026 } };
  return { inicio: analisar(de), fim: analisar(ate) };
};

export const deslocar = (intv: { inicio: Ponto; fim: Ponto }, passos: number) => ({
  inicio: doIndice(indice(intv.inicio) + passos),
  fim: doIndice(indice(intv.fim) + passos),
});

export const rotuloDoPonto = (p: Ponto) => `${MESES_CURTOS[p.mes - 1]}/${String(p.ano).slice(2)}`;
