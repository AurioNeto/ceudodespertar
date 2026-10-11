import { useState } from 'react';
import { formatarBRL } from '@/pages/utils/formato';
import { contas } from '@/pages/mocks/contas';
import { useDataDeCaixa } from '@/pages/eventos/hooks/useDataDeCaixa';
import { contaPadraoDoEvento } from '@/pages/eventos/utils/contaPadraoDoEvento';
import { ID_DO_CAMPO_DA_DATA_DO_RECEBIMENTO } from '../constantes';
import { contratacoes as contratacoesIniciais, munay, type ContratacaoNaTela } from '../mocks/contratacoes';
import { recebidoNaSessao } from '../utils/recebidoNaSessao';

const HOJE = '11/09/2026';

export function useContratacoes() {
  const [lista, setLista] = useState<readonly ContratacaoNaTela[]>(contratacoesIniciais);
  const [recebendo, setRecebendo] = useState<string | null>(null);
  const [conta, setConta] = useState(contaPadraoDoEvento);
  const dataDoRecebimento = useDataDeCaixa(HOJE, ID_DO_CAMPO_DA_DATA_DO_RECEBIMENTO);
  const [recado, setRecado] = useState<string | null>(null);

  const aReceber = lista.filter((c) => c.status === 'CONFIRMADA' && !c.recebidoEm);
  const totalAReceber = aReceber.reduce((s, c) => s + c.valorAcordado, 0);
  const propostas = lista.filter((c) => c.status === 'PROPOSTA');
  const faturamentoNoAno = munay.faturamentoNoAno + recebidoNaSessao(lista, contratacoesIniciais);

  const receber = (c: ContratacaoNaTela) => {
    if (!dataDoRecebimento.exigirValida()) return;
    const nomeDaConta = contas.find((x) => (x.id as string) === conta)?.nome ?? '';
    setLista((l) =>
      l.map((x) =>
        x.eventoId === c.eventoId
          ? { ...x, recebidoEm: dataDoRecebimento.data, lancamentoReceitaId: `lanc-${String(Date.now()).slice(-4)}` }
          : x,
      ),
    );
    setRecebendo(null);
    setRecado(
      `${formatarBRL(c.valorAcordado)} de ${c.contratante} entraram por ${nomeDaConta}. Virou receita com categoria Cachê de contratação, na unidade Munay, vinculada ao evento — e os cachês dos músicos ficam no mesmo evento, do outro lado.`,
    );
  };

  const confirmar = (c: ContratacaoNaTela) => {
    setLista((l) => l.map((x) => (x.eventoId === c.eventoId ? { ...x, status: 'CONFIRMADA' } : x)));
    setRecado(`Proposta de ${c.contratante} confirmada. Nada de dinheiro se move até o recebimento ser registrado.`);
  };

  const abrir = (c: ContratacaoNaTela) => {
    setRecebendo(c.eventoId as string);
    dataDoRecebimento.recomecar();
    setRecado(null);
  };

  const cancelarPainel = () => setRecebendo(null);

  const fecharRecado = () => setRecado(null);

  return {
    lista,
    recebendo,
    conta,
    data: dataDoRecebimento.data,
    erroDaData: dataDoRecebimento.erro,
    recado,
    aReceber,
    totalAReceber,
    propostas,
    faturamentoNoAno,
    setConta,
    setData: dataDoRecebimento.setData,
    receber,
    confirmar,
    abrir,
    cancelarPainel,
    fecharRecado,
  };
}
