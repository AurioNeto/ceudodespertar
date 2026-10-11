import { describe, expect, it } from 'vitest';
import { dataLocal, reais } from '@cdd/contracts';
import type { Conta, ContaId, Fundo, FundoId } from '@cdd/contracts';
import { resumoDoSaldo } from './resumoDoSaldo';

const contaBase: Conta = {
  id: 'cora' as ContaId,
  nome: 'Cora PJ',
  descricao: 'conta principal da casa',
  tipo: 'CONTA_CORRENTE',
  titularidade: 'INSTITUCIONAL',
  pessoaTitularId: null,
  responsavel: 'Aurio Neto',
  saldo: reais(100),
  ultimoMovimento: dataLocal('2026-09-02'),
  conciliacao: 'CONCILIADA',
  alerta: null,
  ativa: true,
};

const fundoBase: Fundo = {
  id: 'obra' as FundoId,
  codigoSistema: 'FUNDO_OBRA',
  nome: 'Obra',
  nota: 'meta da obra',
  contaVinculadaId: 'cora' as ContaId,
  valorReservado: reais(100),
  meta: null,
  ativo: true,
};

const conta = (sobrescritas: Partial<Conta>): Conta => ({ ...contaBase, ...sobrescritas });
const fundo = (sobrescritas: Partial<Fundo>): Fundo => ({ ...fundoBase, ...sobrescritas });

describe('resumoDoSaldo', () => {
  it('sem contas nem fundos — tudo zerado e o fundo inteiro livre', () => {
    const resumo = resumoDoSaldo([], [], reais(500));

    expect(resumo).toMatchObject({ contasAtivas: [], emCaixa: 0, emBanco: 0, comprometido: 0, pendentes: 0 });
    expect(resumo.livre).toBe(reais(500));
    expect(resumo.reservas).toEqual([
      { chave: 'livre', nome: 'Livre', nota: 'sem destino combinado', valor: reais(500), cor: 'var(--color-line-strong)' },
    ]);
  });

  it('separa espécie de banco, conta as pendentes e ignora contas inativas', () => {
    const contas = [
      conta({ id: 'cora' as ContaId, saldo: reais(1000) }),
      conta({ id: 'especie' as ContaId, tipo: 'DINHEIRO', saldo: reais(30), conciliacao: 'PENDENTE' }),
      conta({ id: 'nubank' as ContaId, titularidade: 'PESSOAL_DE_TERCEIRO', saldo: reais(20), conciliacao: 'PENDENTE' }),
      conta({ id: 'velha' as ContaId, saldo: reais(9999), conciliacao: 'PENDENTE', ativa: false }),
    ];

    const resumo = resumoDoSaldo(contas, [], 0);

    expect(resumo.contasAtivas.map((c) => c.id)).toEqual(['cora', 'especie', 'nubank']);
    expect(resumo.emBanco).toBe(reais(1020));
    expect(resumo.emCaixa).toBe(reais(30));
    expect(resumo.pendentes).toBe(2);
  });

  it('reservas — fundos ativos na ordem, com a cor contada entre os ativos, e o Livre por último', () => {
    const fundos = [
      fundo({ id: 'inativo' as FundoId, valorReservado: reais(50), ativo: false }),
      fundo({ id: 'obra' as FundoId, nome: 'Obra', nota: 'n1', valorReservado: reais(300) }),
      fundo({ id: 'feitio' as FundoId, nome: 'Feitio', nota: 'n2', valorReservado: reais(200) }),
    ];

    const resumo = resumoDoSaldo([], fundos, reais(1000));

    expect(resumo.comprometido).toBe(reais(500));
    expect(resumo.livre).toBe(reais(500));
    expect(resumo.reservas).toEqual([
      { chave: 'obra', nome: 'Obra', nota: 'n1', valor: reais(300), cor: 'var(--color-royal)' },
      { chave: 'feitio', nome: 'Feitio', nota: 'n2', valor: reais(200), cor: 'var(--color-confirmed)' },
      { chave: 'livre', nome: 'Livre', nota: 'sem destino combinado', valor: reais(500), cor: 'var(--color-line-strong)' },
    ]);
  });

  it('reserva acima do fundo próprio — o Livre fica negativo, sem corte (Doc 8 §14)', () => {
    const resumo = resumoDoSaldo([], [fundo({ valorReservado: reais(1200) })], reais(1000));

    expect(resumo.livre).toBe(reais(-200));
    expect(resumo.reservas.at(-1)?.valor).toBe(reais(-200));
  });
});
