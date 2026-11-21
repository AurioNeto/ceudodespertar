import { describe, expect, it } from 'vitest';
import { competencia, dataLocal, reais } from '@cdd/contracts';
import type { LancamentoId, LancamentoNaLista } from '@cdd/contracts';
import { filtrarLancamentos } from './filtrarLancamentos';

const base: LancamentoNaLista = {
  id: 'l-1' as LancamentoId,
  tipo: 'SAIDA',
  motivo: 'mercado cerimônia mãe divina',
  valor: reais(187.4),
  data: dataLocal('2026-08-28'),
  hora: '14:22',
  competencia: competencia('2026-08'),
  status: 'CONFIRMADO',
  origem: 'MANUAL',
  registradoPor: 'Lucia Prado',
  grupo: 'Cozinha',
  categorias: ['Alimentação de cerimônia'],
  conta: 'Cora PJ',
  contaDestino: null,
  formaPagamento: 'Pix',
  contraparte: 'Assaí Atacadista',
  cerimonia: null,
  eventoId: null,
  comprovante: null,
};

const lancamento = (id: string, sobrescritas: Partial<LancamentoNaLista> = {}): LancamentoNaLista => ({
  ...base,
  id: id as LancamentoId,
  ...sobrescritas,
});

const livro = [
  lancamento('mercado'),
  lancamento('julho', { competencia: competencia('2026-07'), data: dataLocal('2026-07-30') }),
  lancamento('doacao', { tipo: 'ENTRADA', motivo: 'doação do padrinho', grupo: 'Dormitório', contraparte: null }),
  lancamento('repasse', { tipo: 'TRANSFERENCIA', motivo: 'repasse da lojinha', grupo: null, status: 'A_CONFERIR' }),
  lancamento('estorno', { status: 'ESTORNADO', registradoPor: 'Paty Munay', contraparte: 'Enel' }),
];

const TUDO = { periodo: 'todos', tipo: 'todos', grupo: 'todos', status: 'todos', busca: '' };

const ids = (lista: readonly LancamentoNaLista[]) => lista.map((r) => r.id);

describe('filtrarLancamentos', () => {
  it('tudo em todos e a busca vazia — devolve o livro inteiro, na ordem dele', () => {
    expect(ids(filtrarLancamentos(livro, TUDO))).toEqual(['mercado', 'julho', 'doacao', 'repasse', 'estorno']);
  });

  it.each([
    ['periodo', '2026-07', ['julho']],
    ['tipo', 'ENTRADA', ['doacao']],
    ['grupo', 'Dormitório', ['doacao']],
    ['status', 'A_CONFERIR', ['repasse']],
  ])('%s %s — fica só o que bate', (campo, valor, esperado) => {
    expect(ids(filtrarLancamentos(livro, { ...TUDO, [campo]: valor }))).toEqual(esperado);
  });

  it('filtros combinados — precisam bater todos', () => {
    expect(ids(filtrarLancamentos(livro, { ...TUDO, periodo: '2026-08', tipo: 'SAIDA', status: 'CONFIRMADO' }))).toEqual([
      'mercado',
    ]);
  });

  it.each([
    ['motivo', 'Padrinho', ['doacao']],
    ['fornecedor', 'enel', ['estorno']],
    ['quem lançou', 'paty', ['estorno']],
    ['espaços nas pontas', '  LOJINHA  ', ['repasse']],
  ])('busca por %s — ignora maiúsculas e espaços nas pontas', (_caso, busca, esperado) => {
    expect(ids(filtrarLancamentos(livro, { ...TUDO, busca }))).toEqual(esperado);
  });

  it('busca sem acento — não acha o texto acentuado (Doc 8 §14)', () => {
    expect(filtrarLancamentos(livro, { ...TUDO, busca: 'assai' })).toEqual([]);
  });

  it('busca pela conta ou pelo grupo — não acha, porque só olha motivo, fornecedor e quem lançou', () => {
    expect(filtrarLancamentos(livro, { ...TUDO, busca: 'cora' })).toEqual([]);
    expect(filtrarLancamentos(livro, { ...TUDO, busca: 'cozinha' })).toEqual([]);
  });

  it('filtro sem a chave da busca — trata como busca vazia', () => {
    const { busca: _busca, ...semBusca } = TUDO;
    expect(filtrarLancamentos(livro, semBusca)).toHaveLength(5);
  });
});
