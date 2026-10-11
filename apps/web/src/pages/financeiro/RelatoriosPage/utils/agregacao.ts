import type { LinhaDoRelatorio, TipoNoRelatorio } from '../mocks/relatorios';

export const somar = (linhas: readonly LinhaDoRelatorio[], tipo: TipoNoRelatorio) =>
  linhas.filter((l) => l.tipo === tipo).reduce((a, l) => a + l.valor, 0);

export const agrupar = (linhas: readonly LinhaDoRelatorio[], campo: 'grupo' | 'categoria' | 'cerimonia', tipo?: TipoNoRelatorio) => {
  const mapa = new Map<string, number>();
  for (const l of linhas) {
    if (tipo && l.tipo !== tipo) continue;
    const chave = l[campo];
    if (!chave) continue;
    mapa.set(chave, (mapa.get(chave) ?? 0) + l.valor);
  }
  return [...mapa.entries()].map(([nome, valor]) => ({ nome, valor })).sort((a, b) => b.valor - a.valor);
};
