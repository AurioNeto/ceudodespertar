import { useMemo, useState } from 'react';
import type { Conta, ContaId, Fatura, FaturaId } from '@cdd/contracts';
import { dataLocal } from '@cdd/contracts';
import { hoje } from '@/pages/mocks/relogio';
import { cartoes, contasPagadoras, faturas as faturasIniciais } from '../mocks/faturas';
import { dividaDoCartao } from '../utils/fatura';

export function useFaturas() {
  const [faturas, setFaturas] = useState<readonly Fatura[]>(faturasIniciais);
  const [cartaoId, setCartaoId] = useState<ContaId>(cartoes[0]!.id);
  const [faturaId, setFaturaId] = useState(faturasIniciais.find((f) => f.status === 'FECHADA')!.id);
  const [pagando, setPagando] = useState(false);
  const [contaPagamento, setContaPagamento] = useState<string>(contasPagadoras[0]!.id);
  const [dataPagamento, setDataPagamento] = useState(hoje);
  const [recado, setRecado] = useState<string | null>(null);

  const doCartao = useMemo(() => faturas.filter((f) => f.contaId === cartaoId), [faturas, cartaoId]);
  const fatura = doCartao.find((f) => f.id === faturaId) ?? doCartao[0];
  const cartao = cartoes.find((c) => c.id === cartaoId)!;

  const dividaDe = (contaId: ContaId) => dividaDoCartao(faturas, contaId);

  const escolherCartao = (c: Conta) => {
    setCartaoId(c.id);
    const primeira = faturas.find((f) => f.contaId === c.id && f.status !== 'PAGA') ?? faturas.find((f) => f.contaId === c.id);
    if (primeira) setFaturaId(primeira.id);
    setPagando(false);
    setRecado(null);
  };

  const abrirFatura = (id: FaturaId) => {
    setFaturaId(id);
    setPagando(false);
    setRecado(null);
  };

  const fechar = () => {
    if (!fatura) return;
    setFaturas((lista) => lista.map((f) => (f.id === fatura.id ? { ...f, status: 'FECHADA' } : f)));
    setRecado('Fatura fechada. Compras novas neste cartão entram na fatura da competência seguinte.');
  };

  const pagar = () => {
    if (!fatura) return;
    setFaturas((lista) =>
      lista.map((f) =>
        f.id === fatura.id
          ? { ...f, status: 'PAGA', pagaEm: dataLocal(dataPagamento), contaPagamentoId: contaPagamento as ContaId }
          : f,
      ),
    );
    setPagando(false);
    setRecado('Pagamento registrado como transferência. Nenhuma despesa nova foi criada — as compras já estavam lançadas.');
  };

  const iniciarPagamento = () => setPagando(true);

  const cancelarPagamento = () => setPagando(false);

  const fecharRecado = () => setRecado(null);

  return {
    cartoes,
    cartaoId,
    cartao,
    doCartao,
    fatura,
    pagando,
    contaPagamento,
    dataPagamento,
    recado,
    dividaDe,
    escolherCartao,
    abrirFatura,
    fechar,
    pagar,
    iniciarPagamento,
    cancelarPagamento,
    escolherConta: setContaPagamento,
    escolherData: setDataPagamento,
    fecharRecado,
  };
}
