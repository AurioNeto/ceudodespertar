import { useState } from 'react';
import type { ItemNaFila, LancamentoId } from '@cdd/contracts';
import { filaDeVerificacaoInicial } from '@/mocks/verificacao';
import { MOTIVO_DO_PERIODO_FECHADO_NA_REVISAO, type FiltroOrigem } from '../constantes';
import { avisoDaAltaConfiancaAprovada, avisoDosSelecionadosAprovados } from '../utils/avisosDaAprovacao';
import { emPeriodoFechado } from '../utils/periodoFechado';

export function useFilaDeVerificacao() {
  const [itens, setItens] = useState<readonly ItemNaFila[]>(filaDeVerificacaoInicial);
  const [filtro, setFiltro] = useState<FiltroOrigem>('TODAS');
  const [marcados, setMarcados] = useState<readonly LancamentoId[]>([]);
  const [emRevisao, setEmRevisao] = useState<ItemNaFila | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);

  const visiveis = filtro === 'TODAS' ? itens : itens.filter((i) => i.origem === filtro);
  const selecionadosNaTela = visiveis.filter((i) => marcados.includes(i.id));
  const selecionados = selecionadosNaTela.map((i) => i.id);
  const todosSelecionados = visiveis.length > 0 && selecionadosNaTela.length === visiveis.length;
  const deAltaConfiancaNaTela = visiveis.filter((i) => i.confianca === 'ALTA');
  const deAltaConfianca = deAltaConfiancaNaTela.filter((i) => !emPeriodoFechado(i));

  const remover = (ids: readonly LancamentoId[]) => setItens((lista) => lista.filter((i) => !ids.includes(i.id)));

  const aprovarSelecionados = () => {
    const aprovaveis = selecionadosNaTela.filter((i) => !emPeriodoFechado(i));
    remover(aprovaveis.map((i) => i.id));
    setMarcados((s) => s.filter((x) => !selecionados.includes(x)));
    setMensagem(avisoDosSelecionadosAprovados(aprovaveis.length, selecionadosNaTela.length - aprovaveis.length));
  };

  const aprovarAltaConfianca = () => {
    remover(deAltaConfianca.map((i) => i.id));
    setMensagem(
      avisoDaAltaConfiancaAprovada(deAltaConfianca.length, deAltaConfiancaNaTela.length - deAltaConfianca.length),
    );
  };

  const alternarSelecao = (id: LancamentoId) =>
    setMarcados((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const alternarTodosVisiveis = () => {
    const idsVisiveis = visiveis.map((i) => i.id);
    setMarcados((s) => {
      const escondidos = s.filter((x) => !idsVisiveis.includes(x));
      return todosSelecionados ? escondidos : [...escondidos, ...idsVisiveis];
    });
  };

  const limparSelecao = () => setMarcados([]);

  const fecharAviso = () => setMensagem(null);

  const fecharRevisao = () => setEmRevisao(null);

  const aprovarRevisado = (corrigido: ItemNaFila) => {
    if (emPeriodoFechado(corrigido)) {
      setMensagem(MOTIVO_DO_PERIODO_FECHADO_NA_REVISAO);
      return;
    }
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
