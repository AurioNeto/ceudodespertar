import { isSection, type NavEntry } from '../navegacao';
import type { GrupoDoMenu } from '../tipos';

export function agruparForaDaBarra(nav: readonly NavEntry[], naBarra: number): readonly GrupoDoMenu[] {
  const grupos: GrupoDoMenu[] = [];
  let secaoAtual: string | null = null;
  let posicaoDaSecao = 0;
  let vistos = 0;
  for (const entrada of nav) {
    if (isSection(entrada)) {
      secaoAtual = entrada.section;
      posicaoDaSecao += 1;
      continue;
    }
    vistos += 1;
    if (vistos <= naBarra) continue;
    const ultimo = grupos.at(-1);
    if (ultimo?.posicao === posicaoDaSecao) ultimo.itens.push(entrada);
    else grupos.push({ posicao: posicaoDaSecao, secao: secaoAtual, itens: [entrada] });
  }
  return grupos;
}
