import { describe, expect, it } from 'vitest';
import { competencia, dataLocal, reais } from '@cdd/contracts';
import type { CompraNaFatura, ContaId, Fatura, FaturaId, LancamentoId, StatusFatura } from '@cdd/contracts';
import { dividaDoCartao, totalDaFatura } from './fatura';

const compra = (valor: number): CompraNaFatura => ({
  id: `c-${valor}` as LancamentoId,
  data: dataLocal('2026-09-01'),
  motivo: 'mercado',
  categoria: 'Alimentação de cerimônia',
  grupo: 'Cozinha',
  valor: reais(valor),
  status: 'CONFIRMADO',
  registradoPorNome: 'Aurio Neto',
});

const fatura = (id: string, contaId: string, status: StatusFatura, valores: readonly number[]): Fatura => ({
  id: id as FaturaId,
  contaId: contaId as ContaId,
  competencia: competencia('2026-09'),
  dataFechamento: dataLocal('2026-09-28'),
  dataVencimento: dataLocal('2026-10-05'),
  status,
  compras: valores.map(compra),
  pagaEm: null,
  transferenciaPagamentoId: null,
  contaPagamentoId: null,
});

describe('totalDaFatura', () => {
  it('soma o valor de todas as compras', () => {
    expect(totalDaFatura(fatura('f-1', 'cartao-cora', 'ABERTA', [100, 250, 50]))).toBe(reais(400));
  });

  it('fatura sem compras dá zero', () => {
    expect(totalDaFatura(fatura('f-1', 'cartao-cora', 'ABERTA', []))).toBe(0);
  });
});

describe('dividaDoCartao', () => {
  const lista = [
    fatura('f-cora-09', 'cartao-cora', 'ABERTA', [100, 200]),
    fatura('f-cora-08', 'cartao-cora', 'FECHADA', [400]),
    fatura('f-cora-07', 'cartao-cora', 'PAGA', [800]),
    fatura('f-itau-09', 'cartao-itau', 'ABERTA', [1600]),
  ];

  it('soma as faturas abertas e fechadas do cartão, sem as pagas', () => {
    expect(dividaDoCartao(lista, 'cartao-cora' as ContaId)).toBe(reais(700));
  });

  it('não conta faturas de outro cartão', () => {
    expect(dividaDoCartao(lista, 'cartao-itau' as ContaId)).toBe(reais(1600));
  });

  it('cartão sem faturas ou só com faturas pagas não deve nada', () => {
    expect(dividaDoCartao(lista, 'cartao-novo' as ContaId)).toBe(0);
    expect(dividaDoCartao([fatura('f-cora-07', 'cartao-cora', 'PAGA', [800])], 'cartao-cora' as ContaId)).toBe(0);
  });
});
