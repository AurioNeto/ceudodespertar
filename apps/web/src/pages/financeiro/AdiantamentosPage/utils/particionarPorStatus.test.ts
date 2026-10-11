import { describe, expect, it } from 'vitest';
import { dataLocal, reais } from '@cdd/contracts';
import type { Adiantamento, AdiantamentoId, ContaId, LancamentoId, PessoaId, StatusAdiantamento } from '@cdd/contracts';
import { particionarPorStatus } from './particionarPorStatus';

const adiantamento = (id: string, status: StatusAdiantamento): Adiantamento => ({
  id: id as AdiantamentoId,
  pessoaId: 'p-paty' as PessoaId,
  pessoaNome: 'Paty Munay',
  contaOrigemId: 'nubank' as ContaId,
  contaOrigemNome: 'Nubank Paty',
  valor: reais(100),
  dataDespesa: dataLocal('2026-08-24'),
  motivo: 'compras da cozinha',
  categoria: 'A classificar',
  grupo: null,
  lancamentoId: 'x-1' as LancamentoId,
  comprovante: null,
  status,
  autorizadoPorNome: null,
  autorizadoEm: null,
  recusaMotivo: null,
  ressarcidoEm: null,
  contaRessarcimentoNome: null,
});

describe('particionarPorStatus', () => {
  it('separa aguardando, a ressarcir e fechados, mantendo a ordem da lista', () => {
    const lista = [
      adiantamento('a-1', 'RESSARCIDO'),
      adiantamento('a-2', 'AGUARDANDO_AUTORIZACAO'),
      adiantamento('a-3', 'AUTORIZADO'),
      adiantamento('a-4', 'RECUSADO'),
      adiantamento('a-5', 'AGUARDANDO_AUTORIZACAO'),
    ];

    const { aguardando, aRessarcir, fechados } = particionarPorStatus(lista);

    expect(aguardando.map((a) => a.id)).toEqual(['a-2', 'a-5']);
    expect(aRessarcir.map((a) => a.id)).toEqual(['a-3']);
    expect(fechados.map((a) => a.id)).toEqual(['a-1', 'a-4']);
  });

  it('lista vazia dá as três partes vazias', () => {
    expect(particionarPorStatus([])).toEqual({ aguardando: [], aRessarcir: [], fechados: [] });
  });
});
