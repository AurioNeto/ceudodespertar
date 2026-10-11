import { useState } from 'react';
import { hoje } from '@/pages/mocks/relogio';
import { contasPessoais, quemAdianta } from '../../../mocks/adiantamentos';
import type { DadosDoNovo } from '../../../utils/montarAdiantamento';

export function useFormularioDeAdiantamento(onConfirmar: (d: DadosDoNovo) => void) {
  const [pessoaId, setPessoaId] = useState<string>(quemAdianta[0]!.id);
  const [valor, setValor] = useState('');
  const [data, setData] = useState(hoje);
  const [motivo, setMotivo] = useState('');

  // A2 e A3 juntas: só aparecem as contas pessoais de quem está adiantando.
  const contasDaPessoa = contasPessoais.filter((c) => c.pessoaId === pessoaId);
  const [contaId, setContaId] = useState<string>(contasDaPessoa[0]?.id ?? '');

  const escolherPessoa = (v: string) => {
    setPessoaId(v);
    setContaId(contasPessoais.find((c) => c.pessoaId === v)?.id ?? '');
  };

  const centavos = Math.round(Number(valor.replace(',', '.')) * 100);
  const valido = Number.isFinite(centavos) && centavos > 0 && motivo.trim().length > 0 && contaId !== '';

  const confirmar = () => onConfirmar({ pessoaId, contaId, valor: centavos, data, motivo: motivo.trim() });

  return {
    pessoaId,
    valor,
    data,
    motivo,
    contaId,
    contasDaPessoa,
    valido,
    escolherPessoa,
    escolherValor: setValor,
    escolherData: setData,
    escolherMotivo: setMotivo,
    escolherConta: setContaId,
    confirmar,
  };
}
