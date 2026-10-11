import { describe, expect, it } from 'vitest';
import { dataLocal, reais } from '@cdd/contracts';
import type { ContaId, DevolucaoEmprestimoId, Emprestimo, EmprestimoId, PessoaId } from '@cdd/contracts';
import { devolvido, quitado, saldoDevedor } from './saldo';

const emprestimo = (principal: number, devolucoes: readonly number[]): Emprestimo => ({
  id: 'e-1' as EmprestimoId,
  direcao: 'CONCEDIDO',
  contraparteId: 'p-1' as PessoaId,
  contraparteNome: 'Érico Santana',
  valorPrincipal: reais(principal),
  dataConcessao: dataLocal('2026-05-04'),
  contaId: 'cora' as ContaId,
  contaNome: 'Cora PJ',
  motivo: 'apoio',
  observacao: null,
  devolucoes: devolucoes.map((valor, indice) => ({
    id: `d-${indice}` as DevolucaoEmprestimoId,
    valor: reais(valor),
    data: dataLocal('2026-08-18'),
    contaId: 'cora' as ContaId,
    contaNome: 'Cora PJ',
    registradoPorNome: 'Aurio Neto',
  })),
});

describe('devolvido', () => {
  it('soma o valor de todas as devoluções', () => {
    expect(devolvido(emprestimo(6000, [562.4, 1000]))).toBe(reais(1562.4));
  });

  it('empréstimo sem devoluções não teve nada devolvido', () => {
    expect(devolvido(emprestimo(6000, []))).toBe(0);
  });
});

describe('saldoDevedor', () => {
  it('é o principal menos o que já voltou', () => {
    expect(saldoDevedor(emprestimo(6000, [562.4]))).toBe(reais(5437.6));
  });

  it('sem devoluções, o saldo é o principal inteiro', () => {
    expect(saldoDevedor(emprestimo(3000, []))).toBe(reais(3000));
  });
});

describe('quitado', () => {
  it('fica quitado quando as devoluções fecham com o principal', () => {
    expect(quitado(emprestimo(4800, [2400, 2400]))).toBe(true);
  });

  it('não está quitado enquanto resta saldo', () => {
    expect(quitado(emprestimo(3000, [1500]))).toBe(false);
    expect(quitado(emprestimo(3000, []))).toBe(false);
  });
});
