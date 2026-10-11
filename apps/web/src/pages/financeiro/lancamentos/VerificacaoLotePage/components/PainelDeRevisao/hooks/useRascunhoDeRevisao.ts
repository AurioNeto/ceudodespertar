import { useState } from 'react';
import type { ItemNaFila } from '@cdd/contracts';
import { reais } from '@cdd/contracts';
import { formatarDinheiro } from '@/pages/utils/formato';
import { paraNumero } from '../utils/paraNumero';

export function useRascunhoDeRevisao(item: ItemNaFila) {
  const [rascunho, setRascunho] = useState<ItemNaFila>(item);
  const [valorTexto, setValorTexto] = useState(formatarDinheiro(item.valor));
  const [devolvendo, setDevolvendo] = useState(false);
  const [motivo, setMotivo] = useState('');

  const alterar = <K extends keyof ItemNaFila>(campoItem: K, valor: ItemNaFila[K]) =>
    setRascunho((r) => ({ ...r, [campoItem]: valor }));

  const alterarValor = (v: string) => {
    setValorTexto(v);
    alterar('valor', reais(paraNumero(v)));
  };

  const abrirDevolucao = () => setDevolvendo(true);

  const cancelarDevolucao = () => setDevolvendo(false);

  return {
    rascunho,
    valorTexto,
    alterar,
    alterarValor,
    devolvendo,
    abrirDevolucao,
    cancelarDevolucao,
    motivo,
    escreverMotivo: setMotivo,
  };
}
