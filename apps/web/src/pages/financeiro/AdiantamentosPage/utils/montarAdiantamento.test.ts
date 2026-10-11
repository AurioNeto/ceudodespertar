import { describe, expect, it } from 'vitest';
import { dataLocal, reais } from '@cdd/contracts';
import type { AdiantamentoId, ContaId, LancamentoId, PessoaId } from '@cdd/contracts';
import { montarAdiantamento, type DadosDoNovo } from './montarAdiantamento';

const dados = (mudancas: Partial<DadosDoNovo> = {}): DadosDoNovo => ({
  pessoaId: 'p-paty',
  contaId: 'nubank',
  valor: 1250,
  data: '2026-08-30',
  motivo: 'tinta da sala',
  ...mudancas,
});

const pessoa = { id: 'p-paty' as PessoaId, nome: 'Paty Munay' };
const conta = { id: 'nubank' as ContaId, nome: 'Nubank Paty' };

describe('montarAdiantamento', () => {
  it('monta o adiantamento com os ids, a pessoa, a conta de origem, o valor e a data informados', () => {
    expect(
      montarAdiantamento({
        id: 'a-1' as AdiantamentoId,
        lancamentoId: 'x-1' as LancamentoId,
        dados: dados(),
        pessoa,
        conta,
      }),
    ).toEqual({
      id: 'a-1',
      pessoaId: 'p-paty',
      pessoaNome: 'Paty Munay',
      contaOrigemId: 'nubank',
      contaOrigemNome: 'Nubank Paty',
      valor: reais(12.5),
      dataDespesa: dataLocal('2026-08-30'),
      motivo: 'tinta da sala',
      categoria: 'A classificar',
      grupo: null,
      lancamentoId: 'x-1',
      comprovante: null,
      status: 'AGUARDANDO_AUTORIZACAO',
      autorizadoPorNome: null,
      autorizadoEm: null,
      recusaMotivo: null,
      ressarcidoEm: null,
      contaRessarcimentoNome: null,
    });
  });

  it('converte os centavos digitados em reais', () => {
    const criado = montarAdiantamento({
      id: 'a-2' as AdiantamentoId,
      lancamentoId: 'x-2' as LancamentoId,
      dados: dados({ valor: 200050 }),
      pessoa,
      conta,
    });

    expect(criado.valor).toBe(reais(2000.5));
  });

  it('usa o motivo como veio, sem aparar', () => {
    const criado = montarAdiantamento({
      id: 'a-3' as AdiantamentoId,
      lancamentoId: 'x-3' as LancamentoId,
      dados: dados({ motivo: ' feira ' }),
      pessoa,
      conta,
    });

    expect(criado.motivo).toBe(' feira ');
  });
});
