import { describe, expect, it } from 'vitest';
import { dataLocal, reais } from '@cdd/contracts';
import type { ContaId, EmprestimoId, PessoaId } from '@cdd/contracts';
import { montarEmprestimo, type ValoresDoNovo } from './montarEmprestimo';

const novo = (mudancas: Partial<ValoresDoNovo> = {}): ValoresDoNovo => ({
  direcao: 'CONCEDIDO',
  contraparteId: 'p-lucia',
  valor: '1200,50',
  data: '2026-08-30',
  conta: 'itau',
  motivo: 'compra de material',
  ...mudancas,
});

const conta = { id: 'itau' as ContaId, nome: 'Itaú Munay' };
const contraparte = { id: 'p-lucia' as PessoaId, nome: 'Lucia Prado' };

describe('montarEmprestimo', () => {
  it('monta o empréstimo com o id, a direção, a contraparte, a conta, o principal e a data informados', () => {
    expect(
      montarEmprestimo({ id: 'e-1' as EmprestimoId, novo: novo(), valorEmCentavos: 120050, conta, contraparte }),
    ).toEqual({
      id: 'e-1',
      direcao: 'CONCEDIDO',
      contraparteId: 'p-lucia',
      contraparteNome: 'Lucia Prado',
      valorPrincipal: reais(1200.5),
      dataConcessao: dataLocal('2026-08-30'),
      contaId: 'itau',
      contaNome: 'Itaú Munay',
      motivo: 'compra de material',
      observacao: null,
      devolucoes: [],
    });
  });

  it('mantém a direção de recebido', () => {
    const criado = montarEmprestimo({
      id: 'e-2' as EmprestimoId,
      novo: novo({ direcao: 'RECEBIDO' }),
      valorEmCentavos: 30000,
      conta,
      contraparte,
    });

    expect(criado.direcao).toBe('RECEBIDO');
    expect(criado.valorPrincipal).toBe(reais(300));
  });

  it('apara o motivo e começa sem observação nem devoluções', () => {
    const criado = montarEmprestimo({
      id: 'e-3' as EmprestimoId,
      novo: novo({ motivo: '  obra do dormitório  ' }),
      valorEmCentavos: 100,
      conta,
      contraparte,
    });

    expect(criado.motivo).toBe('obra do dormitório');
    expect(criado.observacao).toBeNull();
    expect(criado.devolucoes).toEqual([]);
  });
});
