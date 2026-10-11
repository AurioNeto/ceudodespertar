import { useState } from 'react';
import { formatarBRL } from '@/pages/utils/formato';
import { contas } from '@/pages/mocks/contas';
import { contratacoes as contratacoesIniciais, type ContratacaoNaTela } from '../mocks/contratacoes';

const HOJE = '11/09/2026';

export function useContratacoes() {
  const [lista, setLista] = useState<readonly ContratacaoNaTela[]>(contratacoesIniciais);
  const [recebendo, setRecebendo] = useState<string | null>(null);
  const [conta, setConta] = useState(contas[0]!.id as string);
  const [data, setData] = useState(HOJE);
  const [recado, setRecado] = useState<string | null>(null);

  const aReceber = lista.filter((c) => c.status === 'CONFIRMADA' && !c.recebidoEm);
  const totalAReceber = aReceber.reduce((s, c) => s + c.valorAcordado, 0);
  const propostas = lista.filter((c) => c.status === 'PROPOSTA');

  const receber = (c: ContratacaoNaTela) => {
    const nomeDaConta = contas.find((x) => (x.id as string) === conta)?.nome ?? '';
    setLista((l) =>
      l.map((x) =>
        x.eventoId === c.eventoId
          ? { ...x, recebidoEm: data, lancamentoReceitaId: `lanc-${String(Date.now()).slice(-4)}` }
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
    setData(HOJE);
    setRecado(null);
  };

  const cancelarPainel = () => setRecebendo(null);

  const fecharRecado = () => setRecado(null);

  return {
    lista,
    recebendo,
    conta,
    data,
    recado,
    aReceber,
    totalAReceber,
    propostas,
    setConta,
    setData,
    receber,
    confirmar,
    abrir,
    cancelarPainel,
    fecharRecado,
  };
}
