import { useState } from 'react';
import { MENSAGEM_DE_DATA_INVALIDA } from '@/pages/eventos/constantes';
import { lerDataDigitada } from '@/pages/eventos/utils/lerDataDigitada';
import type { TarefaDePreparo } from '../../../tipos';
import { contribuicoesDoTexto } from '../../../utils/contribuicoesDoTexto';
import type { RascunhoDeTrabalho } from '../../../utils/rascunhoDeTrabalho';
import { ID_DO_CAMPO_DA_DATA, ID_DO_CAMPO_DE_CONTRIBUICOES, MENSAGEM_DE_CONTRIBUICOES_INVALIDAS } from '../constantes';
import { moverTarefa } from '../utils/moverTarefa';

export function useFormularioDeTrabalho(inicial: RascunhoDeTrabalho, aoSalvar: (rascunho: RascunhoDeTrabalho) => void) {
  const [f, setF] = useState(inicial);
  const [tentouSalvar, setTentouSalvar] = useState(false);

  const dataInvalida = lerDataDigitada(f.data) === null;
  const erroDaData = tentouSalvar && dataInvalida ? MENSAGEM_DE_DATA_INVALIDA : undefined;
  const contribuicoesInvalidas = contribuicoesDoTexto(f.contribuicoes) === null;
  const erroDasContribuicoes = tentouSalvar && contribuicoesInvalidas ? MENSAGEM_DE_CONTRIBUICOES_INVALIDAS : undefined;

  const alterar = <K extends keyof RascunhoDeTrabalho>(campo: K, valor: RascunhoDeTrabalho[K]) =>
    setF((atual) => ({ ...atual, [campo]: valor }));

  const mexerNasTarefas = (fn: (lista: TarefaDePreparo[]) => TarefaDePreparo[]) =>
    setF((atual) => ({ ...atual, preparo: fn(atual.preparo.map((t) => ({ ...t }))) }));

  const mover = (i: number, delta: number) => mexerNasTarefas((lista) => moverTarefa(lista, i, delta));

  const salvar = () => {
    if (dataInvalida || contribuicoesInvalidas) {
      setTentouSalvar(true);
      document.getElementById(dataInvalida ? ID_DO_CAMPO_DA_DATA : ID_DO_CAMPO_DE_CONTRIBUICOES)?.focus();
      return;
    }
    aoSalvar(f);
  };

  return { f, alterar, mexerNasTarefas, mover, erroDaData, erroDasContribuicoes, salvar };
}
