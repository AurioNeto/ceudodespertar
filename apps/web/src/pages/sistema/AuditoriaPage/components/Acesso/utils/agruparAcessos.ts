import type { RegistroDeAcesso } from '@cdd/contracts';
import type { Agrupamento } from '../../../tipos';

export interface GrupoDeAcesso {
  chave: string;
  titulo: string;
  legenda: string;
  registros: readonly RegistroDeAcesso[];
}

export function agruparAcessos(lista: readonly RegistroDeAcesso[], por: Agrupamento): readonly GrupoDeAcesso[] {
  const mapa = new Map<string, RegistroDeAcesso[]>();
  for (const a of lista) {
    const chave = por === 'leitor' ? a.leitorNome : a.pessoaNome;
    const atual = mapa.get(chave);
    if (atual) atual.push(a);
    else mapa.set(chave, [a]);
  }
  return [...mapa.entries()]
    .map(([chave, registros]) => ({
      chave,
      titulo: chave,
      legenda: por === 'leitor' ? (registros[0]?.leitorGrupo ?? '') : `${new Set(registros.map((r) => r.leitorNome)).size} leitor(es)`,
      registros,
    }))
    .toSorted((a, b) => b.registros.length - a.registros.length);
}
