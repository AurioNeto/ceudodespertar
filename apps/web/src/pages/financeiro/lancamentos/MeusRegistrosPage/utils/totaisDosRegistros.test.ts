import { describe, expect, it } from 'vitest';
import { competencia, dataLocal, reais } from '@cdd/contracts';
import type { LancamentoId, LancamentoNaLista } from '@cdd/contracts';
import { totaisDosRegistros } from './totaisDosRegistros';

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
  registradoPor: 'Aurio Neto',
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

describe('totaisDosRegistros', () => {
  it('lista vazia — tudo zerado', () => {
    expect(totaisDosRegistros([])).toEqual({ saidas: 0, entradas: 0 });
  });

  it('soma saídas e entradas de qualquer situação e deixa a transferência de fora', () => {
    const registros = [
      lancamento({ tipo: 'ENTRADA', valor: reais(940) }),
      lancamento({ tipo: 'ENTRADA', valor: reais(285), status: 'A_CONFERIR' }),
      lancamento({ tipo: 'SAIDA', valor: reais(187.4) }),
      lancamento({ tipo: 'SAIDA', valor: reais(65), status: 'A_CONFERIR' }),
      lancamento({ tipo: 'TRANSFERENCIA', valor: reais(1500) }),
    ];

    expect(totaisDosRegistros(registros)).toEqual({
      saidas: reais(187.4) + reais(65),
      entradas: reais(940) + reais(285),
    });
  });

  it('estornado — sai das saídas e continua nas entradas (Doc 8 §14, estorno nos totais)', () => {
    const registros = [
      lancamento({ tipo: 'ENTRADA', valor: reais(200), status: 'ESTORNADO' }),
      lancamento({ tipo: 'SAIDA', valor: reais(96.3), status: 'ESTORNADO' }),
      lancamento({ tipo: 'SAIDA', valor: reais(10) }),
    ];

    expect(totaisDosRegistros(registros)).toEqual({ saidas: reais(10), entradas: reais(200) });
  });
});
