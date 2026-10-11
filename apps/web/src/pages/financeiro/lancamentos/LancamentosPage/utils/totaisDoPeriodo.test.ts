import { describe, expect, it } from 'vitest';
import { competencia, dataLocal, reais } from '@cdd/contracts';
import type { LancamentoId, LancamentoNaLista } from '@cdd/contracts';
import { totaisDoPeriodo } from './totaisDoPeriodo';

const base: LancamentoNaLista = {
  id: 'l-1' as LancamentoId,
  tipo: 'SAIDA',
  motivo: 'mercado',
  valor: reais(100),
  data: dataLocal('2026-08-28'),
  hora: '14:22',
  competencia: competencia('2026-08'),
  status: 'CONFIRMADO',
  origem: 'MANUAL',
  registradoPor: 'Lucia Prado',
  grupo: 'Cozinha',
  categorias: [],
  conta: 'Cora PJ',
  contaDestino: null,
  formaPagamento: 'Pix',
  contraparte: null,
  cerimonia: null,
  eventoId: null,
  comprovante: null,
};

const lancamento = (sobrescritas: Partial<LancamentoNaLista>): LancamentoNaLista => ({ ...base, ...sobrescritas });

describe('totaisDoPeriodo', () => {
  it('lista vazia — tudo zerado', () => {
    expect(totaisDoPeriodo([])).toEqual({ entradas: 0, saidas: 0, aConferir: 0 });
  });

  it('soma entradas e saídas vivas, deixa a transferência de fora e conta os pendentes', () => {
    const lista = [
      lancamento({ tipo: 'ENTRADA', valor: reais(940) }),
      lancamento({ tipo: 'ENTRADA', valor: reais(285), status: 'A_CONFERIR' }),
      lancamento({ tipo: 'SAIDA', valor: reais(187.4) }),
      lancamento({ tipo: 'SAIDA', valor: reais(65), status: 'A_CONFERIR' }),
      lancamento({ tipo: 'TRANSFERENCIA', valor: reais(1500), status: 'A_CONFERIR' }),
    ];

    expect(totaisDoPeriodo(lista)).toEqual({
      entradas: reais(940) + reais(285),
      saidas: reais(187.4) + reais(65),
      aConferir: 3,
    });
  });

  it('estornado — fica fora das entradas e das saídas (Doc 8 §14, estorno nos totais)', () => {
    const lista = [
      lancamento({ tipo: 'ENTRADA', valor: reais(200), status: 'ESTORNADO' }),
      lancamento({ tipo: 'SAIDA', valor: reais(96.3), status: 'ESTORNADO' }),
      lancamento({ tipo: 'SAIDA', valor: reais(10) }),
    ];

    expect(totaisDoPeriodo(lista)).toEqual({ entradas: 0, saidas: reais(10), aConferir: 0 });
  });
});
