import { useState } from 'react';
import type { ContaComSaldo as Conta, ContaId, FundoComSaldo as Fundo, FundoId } from '@cdd/contracts';
import { formatarDinheiro } from '@/pages/utils/formato';
import { contaVazia, fundoVazio } from '../utils/novos';
import { disponivelParaReserva, lerReserva } from '../utils/reserva';

type Aba = 'contas' | 'fundos';
type Formulario = { modo: 'conta'; conta: Conta } | { modo: 'fundo'; fundo: Fundo; valor: string } | null;

export function useGerenciarContas(
  fundos: readonly Fundo[],
  fundoProprio: number,
  onSalvarConta: (conta: Conta) => void,
  onSalvarFundo: (fundo: Fundo) => void,
) {
  const [aba, setAba] = useState<Aba>('contas');
  const [form, setForm] = useState<Formulario>(null);
  const [tentouSalvarFundo, setTentouSalvarFundo] = useState(false);

  const reservaDigitada = (fundo: Fundo, valor: string) =>
    lerReserva(valor, disponivelParaReserva(fundos, fundoProprio, fundo.id));

  const reservaDoFormulario = form?.modo === 'fundo' ? reservaDigitada(form.fundo, form.valor) : null;
  const erroDoValor = tentouSalvarFundo && reservaDoFormulario?.valida === false ? reservaDoFormulario.erro : undefined;

  const salvar = () => {
    if (!form) return;
    if (form.modo === 'conta') {
      if (!form.conta.nome.trim()) return;
      onSalvarConta(form.conta);
    } else {
      if (!form.fundo.nome.trim()) return;
      const reserva = reservaDigitada(form.fundo, form.valor);
      if (!reserva.valida) {
        setTentouSalvarFundo(true);
        return;
      }
      onSalvarFundo({ ...form.fundo, valorReservado: reserva.valor });
    }
    setForm(null);
  };

  const abrirNovaConta = () => setForm({ modo: 'conta', conta: contaVazia(`c-${Date.now()}` as ContaId) });

  const abrirNovoFundo = () => {
    setTentouSalvarFundo(false);
    setForm({ modo: 'fundo', fundo: fundoVazio(`f-${Date.now()}` as FundoId), valor: '' });
  };

  const editarConta = (conta: Conta) => setForm({ modo: 'conta', conta });

  const editarFundo = (fundo: Fundo) => {
    setTentouSalvarFundo(false);
    setForm({
      modo: 'fundo',
      fundo,
      valor: formatarDinheiro(fundo.valorReservado),
    });
  };

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
    erroDoValor,
    salvar,
  };
}
