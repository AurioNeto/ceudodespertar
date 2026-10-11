import { useState } from 'react';
import type { DevolucaoEmprestimoId, DirecaoEmprestimo, Emprestimo, EmprestimoId } from '@cdd/contracts';
import { dataLocal, reais } from '@cdd/contracts';
import { id as marcarId } from '@/mocks/ids';
import { hoje } from '@/pages/mocks/relogio';
import { formatarDinheiro } from '@/pages/utils/formato';
import type { Filtro } from '../constantes';
import { contasDeEmprestimo, contrapartesConhecidas, emprestimos as emprestimosIniciais } from '../mocks/emprestimos';
import { montarEmprestimo, type ValoresDoNovo } from '../utils/montarEmprestimo';
import { quitado, saldoDevedor } from '../utils/saldo';

export function useEmprestimos() {
  const [emprestimos, setEmprestimos] = useState<readonly Emprestimo[]>(emprestimosIniciais);
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [abertoId, setAbertoId] = useState(emprestimosIniciais[0]!.id);
  const [devolvendo, setDevolvendo] = useState(false);
  const [valorDevolucao, setValorDevolucao] = useState('');
  const [dataDevolucao, setDataDevolucao] = useState(hoje);
  const [contaDevolucao, setContaDevolucao] = useState<string>(contasDeEmprestimo[0]!.id);
  const [recado, setRecado] = useState<string | null>(null);

  const [criando, setCriando] = useState(false);
  const [novo, setNovo] = useState({
    direcao: 'CONCEDIDO' as DirecaoEmprestimo,
    contraparteId: contrapartesConhecidas[0]!.id as string,
    valor: '',
    data: hoje,
    conta: contasDeEmprestimo[0]!.id as string,
    motivo: '',
  });

  const valorNovoEmCentavos = Math.round(Number(novo.valor.replace(',', '.')) * 100);
  const novoValido =
    Number.isFinite(valorNovoEmCentavos) && valorNovoEmCentavos > 0 && novo.motivo.trim().length > 0;

  const criarEmprestimo = () => {
    if (!novoValido) return;
    const conta = contasDeEmprestimo.find((c) => c.id === novo.conta)!;
    const contraparte = contrapartesConhecidas.find((c) => c.id === novo.contraparteId)!;
    const criado = montarEmprestimo({
      id: marcarId<EmprestimoId>(`e-${Date.now()}`),
      novo,
      valorEmCentavos: valorNovoEmCentavos,
      conta,
      contraparte,
    });
    setEmprestimos((lista) => [criado, ...lista]);
    setAbertoId(criado.id);
    setFiltro('todos');
    setCriando(false);
    setNovo((n) => ({ ...n, valor: '', motivo: '' }));
    setRecado(
      novo.direcao === 'CONCEDIDO'
        ? `Empréstimo registrado. A saída de ${formatarDinheiro(valorNovoEmCentavos)} é transferência para ${contraparte.nome}, não despesa.`
        : `Empréstimo registrado. A entrada de ${formatarDinheiro(valorNovoEmCentavos)} é transferência de ${contraparte.nome}, não receita.`,
    );
  };

  const alternarNovo = () => {
    setCriando((c) => !c);
    setDevolvendo(false);
    setRecado(null);
  };

  const mudarNovo = <K extends keyof ValoresDoNovo>(campoNome: K, valor: ValoresDoNovo[K]) =>
    setNovo((n) => ({ ...n, [campoNome]: valor }));

  const cancelarNovo = () => setCriando(false);

  const aReceber = emprestimos.filter((e) => e.direcao === 'CONCEDIDO').reduce((s, e) => s + saldoDevedor(e), 0);
  const aDevolver = emprestimos.filter((e) => e.direcao === 'RECEBIDO').reduce((s, e) => s + saldoDevedor(e), 0);
  const quitados = emprestimos.filter(quitado);

  const visiveis = emprestimos.filter((e) => {
    if (filtro === 'todos') return true;
    if (filtro === 'quitados') return quitado(e);
    return e.direcao === filtro && !quitado(e);
  });

  const aberto = visiveis.find((e) => e.id === abertoId) ?? visiveis[0];

  const saldo = aberto ? saldoDevedor(aberto) : 0;
  const valorEmCentavos = Math.round(Number(valorDevolucao.replace(',', '.')) * 100);
  const valorValido = Number.isFinite(valorEmCentavos) && valorEmCentavos > 0;
  const excedeSaldo = valorValido && valorEmCentavos > saldo;

  const escolherFiltro = (v: Filtro) => {
    setFiltro(v);
    setDevolvendo(false);
  };

  const abrirEmprestimo = (id: EmprestimoId) => {
    setAbertoId(id);
    setDevolvendo(false);
    setRecado(null);
  };

  const registrarDevolucao = () => {
    if (!aberto || !valorValido || excedeSaldo) return;
    const conta = contasDeEmprestimo.find((c) => c.id === contaDevolucao)!;
    setEmprestimos((lista) =>
      lista.map((e) =>
        e.id === aberto.id
          ? {
              ...e,
              devolucoes: [
                ...e.devolucoes,
                {
                  id: marcarId<DevolucaoEmprestimoId>(`d-${e.id}-${e.devolucoes.length + 1}`),
                  valor: reais(valorEmCentavos / 100),
                  data: dataLocal(dataDevolucao),
                  contaId: conta.id,
                  contaNome: conta.nome,
                  registradoPorNome: 'Aurio Neto',
                },
              ],
            }
          : e,
      ),
    );
    const sobra = saldo - valorEmCentavos;
    setDevolvendo(false);
    setValorDevolucao('');
    setRecado(
      sobra === 0
        ? 'Devolução registrada e empréstimo quitado. A transferência entrou; nenhum lançamento de receita foi criado.'
        : `Devolução registrada como transferência. Restam ${formatarDinheiro(sobra)}.`,
    );
  };

  const iniciarDevolucao = () => setDevolvendo(true);

  const cancelarDevolucao = () => {
    setDevolvendo(false);
    setValorDevolucao('');
  };

  const fecharRecado = () => setRecado(null);

  return {
    aReceber,
    aDevolver,
    quitados,
    recado,
    criando,
    novo,
    novoValido,
    filtro,
    visiveis,
    aberto,
    devolvendo,
    saldo,
    valorDevolucao,
    dataDevolucao,
    contaDevolucao,
    excedeSaldo,
    valorValido,
    alternarNovo,
    mudarNovo,
    criarEmprestimo,
    cancelarNovo,
    escolherFiltro,
    abrirEmprestimo,
    iniciarDevolucao,
    escolherValorDevolucao: setValorDevolucao,
    escolherDataDevolucao: setDataDevolucao,
    escolherContaDevolucao: setContaDevolucao,
    registrarDevolucao,
    cancelarDevolucao,
    fecharRecado,
  };
}
