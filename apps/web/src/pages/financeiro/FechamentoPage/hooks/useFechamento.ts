import { useState } from 'react';
import { competenciaPorExtenso } from '@/pages/utils/formato';
import { contas } from '@/pages/mocks/contas';
import { lancamentos } from '@/pages/financeiro/mocks/lancamentos';
import { filaDeVerificacaoInicial } from '@/mocks/verificacao';
import { competenciaAtual } from '@/pages/mocks/relogio';
import { HISTORICO } from '../mocks/historico';
import { checklistDoFechamento, totaisDoFechamento } from '../utils/checklist';
import { competenciaAnteriorA } from '../utils/competenciaAnterior';

export function useFechamento() {
  const [fechado, setFechado] = useState(false);
  const [reabrindo, setReabrindo] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);

  const naFila = filaDeVerificacaoInicial.length;
  const contasAtivas = contas.filter((c) => c.ativa);
  const doMes = lancamentos.filter((l) => l.competencia === competenciaAtual);
  const competenciaAnterior = competenciaAnteriorA(competenciaAtual);
  const anterior = {
    competencia: competenciaAnterior,
    fechada: HISTORICO.some((h) => h.competencia === competenciaAnterior),
  };
  const { checklist, bloqueios, avisos } = checklistDoFechamento(naFila, contasAtivas, doMes, anterior);
  const { entradas, saidas, resultado, totalSaldos } = totaisDoFechamento(doMes, contasAtivas);

  const fechar = () => {
    if (bloqueios.length) return;
    setFechado(true);
    setMensagem(
      `${competenciaPorExtenso(competenciaAtual)} fechado. Novos lançamentos no período só depois de reabrir.`,
    );
  };

  const confirmarReabertura = (motivo: string) => {
    if (!motivo.trim()) return;
    setFechado(false);
    setReabrindo(false);
    setMensagem(`Agosto reaberto por Aurio Neto. O motivo ficou no histórico do período: ${motivo.trim()}`);
  };

  const abrirReabertura = () => setReabrindo(true);

  const cancelarReabertura = () => setReabrindo(false);

  const avisar = (texto: string) => setMensagem(texto);

  const fecharAviso = () => setMensagem(null);

  return {
    fechado,
    reabrindo,
    mensagem,
    contasAtivas,
    checklist,
    bloqueios,
    avisos,
    entradas,
    saidas,
    resultado,
    totalSaldos,
    historico: HISTORICO,
    fechar,
    confirmarReabertura,
    abrirReabertura,
    cancelarReabertura,
    avisar,
    fecharAviso,
  };
}
