import { useState } from 'react';
import type { Conta, ContaId, Fundo, FundoId } from '@cdd/contracts';
import { contas as contasIniciais, fundoProprio } from '@/pages/mocks/contas';
import { fundos as fundosIniciais } from '../mocks/fundos';
import { resumoDoSaldo } from '../utils/resumoDoSaldo';

export function useContasEFundos() {
  const [contas, setContas] = useState<readonly Conta[]>(contasIniciais);
  const [fundos, setFundos] = useState<readonly Fundo[]>(fundosIniciais);
  const [gerenciando, setGerenciando] = useState(false);
  const [aba, setAba] = useState<'contas' | 'fundo'>('contas');

  const abrirGerenciador = () => setGerenciando(true);

  const fecharGerenciador = () => setGerenciando(false);

  const salvarConta = (conta: Conta) =>
    setContas((lista) =>
      lista.some((c) => c.id === conta.id) ? lista.map((c) => (c.id === conta.id ? conta : c)) : [...lista, conta],
    );

  const salvarFundo = (fundo: Fundo) =>
    setFundos((lista) =>
      lista.some((f) => f.id === fundo.id) ? lista.map((f) => (f.id === fundo.id ? fundo : f)) : [...lista, fundo],
    );

  const alternarConta = (contaId: ContaId) =>
    setContas((lista) => lista.map((c) => (c.id === contaId ? { ...c, ativa: !c.ativa } : c)));

  const alternarFundo = (fundoId: FundoId) =>
    setFundos((lista) => lista.map((f) => (f.id === fundoId ? { ...f, ativo: !f.ativo } : f)));

  return {
    contas,
    fundos,
    fundoProprio,
    ...resumoDoSaldo(contas, fundos, fundoProprio),
    aba,
    escolherAba: setAba,
    gerenciando,
    abrirGerenciador,
    fecharGerenciador,
    salvarConta,
    salvarFundo,
    alternarConta,
    alternarFundo,
  };
}
