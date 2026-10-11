import type { TarefaDePreparo } from '../../../tipos';

export const moverTarefa = (lista: TarefaDePreparo[], i: number, delta: number) => {
  const j = i + delta;
  if (j < 0 || j >= lista.length) return lista;
  const tmp = lista[i]!;
  lista[i] = lista[j]!;
  lista[j] = tmp;
  return lista;
};
