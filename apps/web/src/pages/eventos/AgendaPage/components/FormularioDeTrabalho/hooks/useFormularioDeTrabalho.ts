import { useState } from 'react';
import type { TarefaDePreparo } from '../../../tipos';
import type { RascunhoDeTrabalho } from '../../../utils/rascunhoDeTrabalho';
import { moverTarefa } from '../utils/moverTarefa';

export function useFormularioDeTrabalho(inicial: RascunhoDeTrabalho) {
  const [f, setF] = useState(inicial);

  const alterar = <K extends keyof RascunhoDeTrabalho>(campo: K, valor: RascunhoDeTrabalho[K]) =>
    setF((atual) => ({ ...atual, [campo]: valor }));

  const mexerNasTarefas = (fn: (lista: TarefaDePreparo[]) => TarefaDePreparo[]) =>
    setF((atual) => ({ ...atual, preparo: fn(atual.preparo.map((t) => ({ ...t }))) }));

  const mover = (i: number, delta: number) => mexerNasTarefas((lista) => moverTarefa(lista, i, delta));

  return { f, alterar, mexerNasTarefas, mover };
}
