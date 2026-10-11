import { useState } from 'react';
import type { ItemNaFila, LancamentoId } from '@cdd/contracts';
import { pluralizar } from '@/pages/utils/formato';
import { filaDeVerificacaoInicial } from '@/mocks/verificacao';
import type { FiltroOrigem } from '../constantes';

export function useFilaDeVerificacao() {
  const [itens, setItens] = useState<readonly ItemNaFila[]>(filaDeVerificacaoInicial);
  const [filtro, setFiltro] = useState<FiltroOrigem>('TODAS');
  const [selecionados, setSelecionados] = useState<readonly LancamentoId[]>([]);
  const [emRevisao, setEmRevisao] = useState<ItemNaFila | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);

  const visiveis = filtro === 'TODAS' ? itens : itens.filter((i) => i.origem === filtro);
  const todosSelecionados = visiveis.length > 0 && visiveis.every((i) => selecionados.includes(i.id));
  const deAltaConfianca = itens.filter((i) => i.confianca === 'ALTA');

  const remover = (ids: readonly LancamentoId[]) => {
    setItens((lista) => lista.filter((i) => !ids.includes(i.id)));
    setSelecionados((s) => s.filter((x) => !ids.includes(x)));
  };

  const aprovarSelecionados = () => {
    const n = selecionados.length;
    remover(selecionados);
    setMensagem(`${pluralizar(n, 'lançamento aprovado', 'lançamentos aprovados')} e consolidado${n > 1 ? 's' : ''}.`);
  };

  const aprovarAltaConfianca = () => {
    const ids = deAltaConfianca.map((i) => i.id);
    remover(ids);
    setMensagem(
      `${pluralizar(ids.length, 'lançamento', 'lançamentos')} de alta confiança aprovado${ids.length === 1 ? '' : 's'}.`,
    );
  };

  const alternarSelecao = (id: LancamentoId) =>
    setSelecionados((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const alternarTodosVisiveis = () => setSelecionados(todosSelecionados ? [] : visiveis.map((i) => i.id));

  const limparSelecao = () => setSelecionados([]);

  const fecharAviso = () => setMensagem(null);

  const fecharRevisao = () => setEmRevisao(null);

  const aprovarRevisado = (corrigido: ItemNaFila) => {
    remover([corrigido.id]);
    setEmRevisao(null);
    setMensagem('Lançamento aprovado e consolidado.');
  };

  const devolverEmRevisao = (motivo: string) => {
    if (!emRevisao) return;
    const quem = emRevisao.remetente ?? 'quem enviou';
    remover([emRevisao.id]);
    setEmRevisao(null);
    setMensagem(`Devolvido a ${quem}: ${motivo}`);
  };

  return {
    itens,
    filtro,
    escolherFiltro: setFiltro,
    visiveis,
    selecionados,
    todosSelecionados,
    deAltaConfianca,
    emRevisao,
    abrirRevisao: setEmRevisao,
    mensagem,
    aprovarSelecionados,
    aprovarAltaConfianca,
    alternarSelecao,
    alternarTodosVisiveis,
    limparSelecao,
    fecharAviso,
    fecharRevisao,
    aprovarRevisado,
    devolverEmRevisao,
  };
}
