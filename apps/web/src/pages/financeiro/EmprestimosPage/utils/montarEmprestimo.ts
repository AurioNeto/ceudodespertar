import type { ContaId, DirecaoEmprestimo, Emprestimo, EmprestimoId, PessoaId } from '@cdd/contracts';
import { dataLocal, reais } from '@cdd/contracts';

export interface ValoresDoNovo {
  direcao: DirecaoEmprestimo;
  contraparteId: string;
  valor: string;
  data: string;
  conta: string;
  motivo: string;
}

interface DadosDoNovoEmprestimo {
  id: EmprestimoId;
  novo: ValoresDoNovo;
  valorEmCentavos: number;
  conta: { readonly id: ContaId; readonly nome: string };
  contraparte: { readonly id: PessoaId; readonly nome: string };
}

export const montarEmprestimo = ({ id, novo, valorEmCentavos, conta, contraparte }: DadosDoNovoEmprestimo): Emprestimo => ({
  id,
  direcao: novo.direcao,
  contraparteId: contraparte.id as PessoaId,
  contraparteNome: contraparte.nome,
  valorPrincipal: reais(valorEmCentavos / 100),
  dataConcessao: dataLocal(novo.data),
  contaId: conta.id,
  contaNome: conta.nome,
  motivo: novo.motivo.trim(),
  observacao: null,
  devolucoes: [],
});
