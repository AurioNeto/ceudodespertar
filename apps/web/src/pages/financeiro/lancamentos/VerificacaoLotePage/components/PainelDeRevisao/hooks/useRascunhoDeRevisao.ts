import { useState } from 'react';
import type { ItemNaFila } from '@cdd/contracts';
import { reais } from '@cdd/contracts';
import { lerValorDigitado } from '@/lib/numero';
import { formatarDinheiro } from '@/pages/utils/formato';

export function useRascunhoDeRevisao(item: ItemNaFila) {
  const [rascunho, setRascunho] = useState<ItemNaFila>(item);
  const [valorTexto, setValorTexto] = useState(formatarDinheiro(item.valor));
  const [devolvendo, setDevolvendo] = useState(false);
  const [motivo, setMotivo] = useState('');

  const alterar = <K extends keyof ItemNaFila>(campoItem: K, valor: ItemNaFila[K]) =>
    setRascunho((r) => ({ ...r, [campoItem]: valor }));

  const alterarValor = (v: string) => {
    setValorTexto(v);
    const lido = lerValorDigitado(v);
    alterar('valor', reais(Number.isNaN(lido) ? 0 : lido));
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
