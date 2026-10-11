import type { Adiantamento, AdiantamentoId, ContaId, LancamentoId, PessoaId } from '@cdd/contracts';
import { dataLocal, reais } from '@cdd/contracts';

export interface DadosDoNovo {
  pessoaId: string;
  contaId: string;
  valor: number;
  data: string;
  motivo: string;
}

interface DadosDoNovoAdiantamento {
  id: AdiantamentoId;
  lancamentoId: LancamentoId;
  dados: DadosDoNovo;
  pessoa: { readonly id: PessoaId; readonly nome: string };
  conta: { readonly id: ContaId; readonly nome: string };
}

export const montarAdiantamento = ({ id, lancamentoId, dados, pessoa, conta }: DadosDoNovoAdiantamento): Adiantamento => ({
  id,
  pessoaId: pessoa.id as PessoaId,
  pessoaNome: pessoa.nome,
  contaOrigemId: conta.id as ContaId,
  contaOrigemNome: conta.nome,
  valor: reais(dados.valor / 100),
  dataDespesa: dataLocal(dados.data),
  motivo: dados.motivo,
  categoria: 'A classificar',
  grupo: null,
  lancamentoId,
  comprovante: null,
  status: 'AGUARDANDO_AUTORIZACAO',
  autorizadoPorNome: null,
  autorizadoEm: null,
  recusaMotivo: null,
  ressarcidoEm: null,
  contaRessarcimentoNome: null,
});
