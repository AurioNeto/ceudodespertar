import { useState } from 'react';
import type { Conta, ContaId, Fundo, FundoId } from '@cdd/contracts';
import { reais } from '@cdd/contracts';
import { formatarDinheiro } from '@/pages/utils/formato';
import { contaVazia, fundoVazio } from '../utils/novos';
import { paraNumero } from '../utils/paraNumero';

type Aba = 'contas' | 'fundos';
type Formulario = { modo: 'conta'; conta: Conta } | { modo: 'fundo'; fundo: Fundo; valor: string } | null;

export function useGerenciarContas(onSalvarConta: (conta: Conta) => void, onSalvarFundo: (fundo: Fundo) => void) {
  const [aba, setAba] = useState<Aba>('contas');
  const [form, setForm] = useState<Formulario>(null);

  const salvar = () => {
    if (!form) return;
    if (form.modo === 'conta') {
      if (!form.conta.nome.trim()) return;
      onSalvarConta(form.conta);
    } else {
      if (!form.fundo.nome.trim()) return;
      onSalvarFundo({ ...form.fundo, valorReservado: reais(paraNumero(form.valor)) });
    }
    setForm(null);
  };

  const abrirNovaConta = () => setForm({ modo: 'conta', conta: contaVazia(`c-${Date.now()}` as ContaId) });

  const abrirNovoFundo = () =>
    setForm({ modo: 'fundo', fundo: fundoVazio(`f-${Date.now()}` as FundoId), valor: '' });

  const editarConta = (conta: Conta) => setForm({ modo: 'conta', conta });

  const editarFundo = (fundo: Fundo) =>
    setForm({
      modo: 'fundo',
      fundo,
      valor: formatarDinheiro(fundo.valorReservado),
    });

  const mudarFundo = (fundo: Fundo, valor: string) => setForm({ modo: 'fundo', fundo, valor });

  const fecharFormulario = () => setForm(null);

  return {
    aba,
    escolherAba: setAba,
    form,
    abrirNovaConta,
    abrirNovoFundo,
    editarConta,
    editarFundo,
    mudarFundo,
    fecharFormulario,
    salvar,
  };
}
